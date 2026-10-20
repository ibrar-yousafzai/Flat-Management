const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { getMemberBalance } = require('./members');
const { sendInvoiceEmail, sendFoodReminderEmail } = require('../services/email');
const { requireMemberSelf, requireAdmin } = require('../middleware/auth');

// Generate invoice data for a member in a specific month (Protected by strict member privacy)
router.get('/member-invoice/:memberId', requireMemberSelf('memberId'), (req, res) => {
  try {
    const { memberId } = req.params;
    const { month = new Date().toISOString().slice(0, 7) } = req.query;

    const member = db.prepare(`
      SELECT m.*, r.name as room_name, r.base_rent as room_base_rent
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE m.id = ?
    `).get(memberId);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Bills for this member in this month
    const bills = db.prepare(`
      SELECT bs.amount, b.title, b.category, b.total_amount, b.split_type
      FROM bill_splits bs
      JOIN monthly_bills b ON bs.bill_id = b.id
      WHERE bs.member_id = ? AND b.month = ?
      ORDER BY b.id ASC
    `).all(memberId, month);

    // Food for this member in this month
    const food = db.prepare(`
      SELECT fs.amount, fs.is_custom, fs.custom_note, f.date, f.week_label, f.title
      FROM food_splits fs
      JOIN weekly_food f ON fs.food_id = f.id
      WHERE fs.member_id = ? AND f.month = ?
      ORDER BY f.date ASC
    `).all(memberId, month);

    // Payments for bills by this member in this month
    const billPayments = db.prepare(`
      SELECT * FROM payments 
      WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) = ?
      ORDER BY payment_date ASC
    `).all(memberId, month);

    // Payments for food mess by this member in this month
    const foodPayments = db.prepare(`
      SELECT * FROM payments 
      WHERE member_id = ? AND status = 'approved' AND payment_for = 'food' AND substr(payment_date, 1, 7) = ?
      ORDER BY payment_date ASC
    `).all(memberId, month);

    // Complete balances (Separated)
    const overallBalance = getMemberBalance(memberId);

    // Flat settings
    const settingsRows = db.prepare(`SELECT * FROM settings`).all();
    const settings = {};
    for (const s of settingsRows) settings[s.key] = s.value;

    // Prior arrears carried forward into this month
    const cf = db.prepare(`SELECT amount FROM monthly_carry_forward WHERE month = ? AND member_id = ?`).get(month, memberId);
    let priorArrears = 0;
    if (cf) {
      priorArrears = Number(cf.amount);
    } else {
      const pastBills = db.prepare(`
        SELECT COALESCE(SUM(bs.amount), 0) as total
        FROM bill_splits bs
        JOIN monthly_bills b ON bs.bill_id = b.id
        WHERE bs.member_id = ? AND b.month < ?
      `).get(memberId, month).total;
      const pastPaid = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) < ?
      `).get(memberId, month).total;
      priorArrears = Math.round((Number(member.opening_balance || 0) + pastBills - pastPaid) * 100) / 100;
    }

    const monthBillsTotal = bills.reduce((acc, b) => acc + b.amount, 0);
    const monthBillPaidTotal = billPayments.reduce((acc, p) => acc + p.amount, 0);
    const netMonthBillsBalance = Math.round((priorArrears + monthBillsTotal - monthBillPaidTotal) * 100) / 100;

    const monthFoodTotal = food.reduce((acc, f) => acc + f.amount, 0);
    const monthFoodPaidTotal = foodPayments.reduce((acc, p) => acc + p.amount, 0);

    const currency = settings.currency_symbol || 'Rs.';

    // Calculate Due Date & Payment Status
    const dueDay = parseInt(settings.monthly_bills_due_day || '10', 10);
    const dueDate = `${month}-${String(dueDay).padStart(2, '0')}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    let paymentStatus = 'paid';
    if (netMonthBillsBalance > 0) {
      if (monthBillPaidTotal > 0) {
        paymentStatus = 'partial';
      } else if (todayStr > dueDate) {
        paymentStatus = 'overdue';
      } else {
        paymentStatus = 'due_soon';
      }
    } else if (netMonthBillsBalance < 0) {
      paymentStatus = 'advance_credit';
    }

    // Privacy control: hide flat totals if configured
    if (settings.show_flat_totals_to_members === 'false') {
      for (const b of bills) {
        delete b.total_amount;
      }
    }

    // Formatted WhatsApp message with strictly separated sections
    const lines = [
      `*📜 ${settings.flat_name || 'Flat Management'} - Official Statement*`,
      `*Month:* ${month}`,
      `*Member:* ${member.name} (${member.unique_id})`,
      `*Room:* ${member.room_name || 'Outside Member'}`,
      `=================================`,
      `*🏢 SECTION 1: MONTHLY FLAT BILLS & RENT*`,
      `_(Due at Month-End)_`
    ];

    if (priorArrears !== 0) {
      lines.push(`• *Previous Balance Carried Forward:* ${currency} ${priorArrears.toLocaleString()}`);
    }

    if (bills.length > 0) {
      bills.forEach(b => {
        lines.push(`• ${b.title}: ${currency} ${b.amount.toLocaleString()}`);
      });
    } else {
      lines.push(`• No new flat bills recorded for ${month}`);
    }

    lines.push(`*New Month Charges (${month}):* ${currency} ${monthBillsTotal.toLocaleString()}`);
    if (monthBillPaidTotal > 0) {
      lines.push(`*Bills Paid in ${month}:* - ${currency} ${monthBillPaidTotal.toLocaleString()}`);
    }
    lines.push(`*Net Monthly Bills Balance:* ${currency} ${netMonthBillsBalance.toLocaleString()}`);
    lines.push(`👉 *Please pay this as soon as possible.*`);

    lines.push(`=================================`);
    lines.push(`*🍲 SECTION 2: WEEKLY FOOD MESS*`);
    lines.push(`_(Paid Week-to-Week, not monthly)_`);

    if (food.length > 0) {
      food.forEach(f => {
        lines.push(`• ${f.date} (${f.title}): ${currency} ${f.amount.toLocaleString()}${f.is_custom ? ' [Mid-week share]' : ''}`);
      });
    } else {
      lines.push(`• No food expenses this month`);
    }

    lines.push(`*Total Food Shares (${month}):* ${currency} ${monthFoodTotal.toLocaleString()}`);
    if (monthFoodPaidTotal > 0) {
      lines.push(`*Food Paid in ${month}:* - ${currency} ${monthFoodPaidTotal.toLocaleString()}`);
    }
    lines.push(`*Current Food Mess Balance:* ${currency} ${overallBalance.food_balance.toLocaleString()} ${overallBalance.food_balance < 0 ? '(Advance Credit for Next Week)' : ''}`);

    lines.push(`=================================`);
    lines.push(`*Payment Accounts:*`);
    if (settings.bank_name) {
      lines.push(`🏦 *Bank:* ${settings.bank_name} | ${settings.account_number} (${settings.account_title})`);
    }
    if (settings.jazzcash_number) {
      lines.push(`📱 *JazzCash:* ${settings.jazzcash_number} (${settings.jazzcash_title})`);
    }
    if (settings.easypaisa_number) {
      lines.push(`📱 *Easypaisa:* ${settings.easypaisa_number} (${settings.easypaisa_title})`);
    }
    lines.push(`\n_Submit receipt in portal using Member ID ${member.unique_id}_`);

    const whatsappText = lines.join('\n');
    let phone = (member.whatsapp || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '92' + phone.substring(1);
    }
    const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText)}` : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    res.json({
      invoiceNumber: `INV-${month.replace('-', '')}-${member.unique_id}`,
      month,
      dueDate,
      paymentStatus,
      member,
      priorArrears,
      // Monthly Bills
      bills,
      monthBillsTotal,
      monthBillPaidTotal,
      netMonthBillsBalance,
      bills_balance: overallBalance.bills_balance,
      // Weekly Food (Separate)
      food,
      monthFoodTotal,
      monthFoodPaidTotal,
      food_balance: overallBalance.food_balance,
      // Totals
      overallBalance,
      settings,
      whatsappText,
      whatsappUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to build member invoice data
function buildMemberInvoiceData(memberId, month) {
  const member = db.prepare(`
    SELECT m.*, r.name as room_name, r.base_rent as room_base_rent
    FROM members m
    LEFT JOIN rooms r ON m.room_id = r.id
    WHERE m.id = ?
  `).get(memberId);

  if (!member) return null;

  const bills = db.prepare(`
    SELECT bs.amount, b.title, b.category, b.total_amount 
    FROM bill_splits bs JOIN monthly_bills b ON bs.bill_id = b.id 
    WHERE bs.member_id = ? AND b.month = ?
  `).all(memberId, month);

  const food = db.prepare(`
    SELECT fs.amount, f.date, f.title 
    FROM food_splits fs JOIN weekly_food f ON fs.food_id = f.id 
    WHERE fs.member_id = ? AND f.month = ?
  `).all(memberId, month);

  const overallBalance = getMemberBalance(memberId);
  const settingsRows = db.prepare(`SELECT * FROM settings`).all();
  const settings = {};
  for (const s of settingsRows) settings[s.key] = s.value;

  const cf = db.prepare(`SELECT amount FROM monthly_carry_forward WHERE month = ? AND member_id = ?`).get(month, memberId);
  let priorArrears = 0;
  if (cf) {
    priorArrears = Number(cf.amount);
  } else {
    const pastBills = db.prepare(`
      SELECT COALESCE(SUM(bs.amount), 0) as total
      FROM bill_splits bs JOIN monthly_bills b ON bs.bill_id = b.id
      WHERE bs.member_id = ? AND b.month < ?
    `).get(memberId, month).total;
    const pastPaid = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) < ?
    `).get(memberId, month).total;
    priorArrears = Math.round((Number(member.opening_balance || 0) + pastBills - pastPaid) * 100) / 100;
  }

  const billPayments = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments 
    WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) = ?
  `).get(memberId, month).total;

  const monthBillsTotal = bills.reduce((acc, b) => acc + b.amount, 0);
  const netMonthBillsBalance = Math.round((priorArrears + monthBillsTotal - billPayments) * 100) / 100;

  return {
    invoiceNumber: `INV-${month.replace('-', '')}-${member.unique_id}`,
    month,
    priorArrears,
    bills,
    monthBillsTotal,
    monthBillPaidTotal: billPayments,
    netMonthBillsBalance,
    food,
    monthFoodTotal: food.reduce((acc, f) => acc + f.amount, 0),
    food_balance: overallBalance.food_balance,
    settings,
    member
  };
}

// Send 1-click Invoice via SMTP Email
router.post('/send-email/:memberId', requireAdmin, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { month = new Date().toISOString().slice(0, 7) } = req.body;

    const invoiceData = buildMemberInvoiceData(memberId, month);
    if (!invoiceData) return res.status(404).json({ error: 'Member not found' });
    if (!invoiceData.member.email) return res.status(400).json({ error: `${invoiceData.member.name} does not have an email address saved in their profile.` });

    await sendInvoiceEmail(invoiceData.member, invoiceData);
    logAudit('admin', req.user?.user_id || 1, req.user?.name || 'Admin', 'Sent Invoice Email', `Emailed statement for ${month} to ${invoiceData.member.name} (${invoiceData.member.email})`);

    res.json({ success: true, message: `Statement successfully emailed to ${invoiceData.member.email}!` });
  } catch (err) {
    console.error('Send invoice email error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Batch Send Invoices / Reminders (All or Selected Members)
router.post('/batch-send-emails', requireAdmin, async (req, res) => {
  try {
    const { month = new Date().toISOString().slice(0, 7), member_ids = 'all', email_type = 'bills', week_title } = req.body;

    let targetMemberIds = [];
    if (member_ids === 'all') {
      const activeMembers = db.prepare(`SELECT id FROM members WHERE status = 'Active'`).all();
      targetMemberIds = activeMembers.map(m => m.id);
    } else if (Array.isArray(member_ids)) {
      targetMemberIds = member_ids.map(Number).filter(id => !isNaN(id) && id > 0);
    }

    if (targetMemberIds.length === 0) {
      return res.status(400).json({ error: 'No members selected for email dispatch.' });
    }

    const settingsRows = db.prepare(`SELECT * FROM settings`).all();
    const settings = {};
    for (const s of settingsRows) settings[s.key] = s.value;

    let sentCount = 0;
    let failedCount = 0;
    const errorDetails = [];

    for (const mId of targetMemberIds) {
      const member = db.prepare(`
        SELECT m.*, r.name as room_name 
        FROM members m 
        LEFT JOIN rooms r ON m.room_id = r.id 
        WHERE m.id = ?
      `).get(mId);

      if (!member || !member.email) {
        failedCount++;
        errorDetails.push(`${member ? member.name : 'ID ' + mId}: No email configured`);
        continue;
      }

      try {
        if (email_type === 'food') {
          const balance = getMemberBalance(mId);
          await sendFoodReminderEmail(member, {
            month,
            weekTitle: week_title || `Week of ${month}`,
            food_balance: balance.food_balance,
            settings
          });
        } else {
          // Monthly bills invoice
          const invoiceData = buildMemberInvoiceData(mId, month);
          await sendInvoiceEmail(member, invoiceData);
        }
        sentCount++;
      } catch (err) {
        failedCount++;
        errorDetails.push(`${member.name}: ${err.message}`);
      }
    }

    logAudit(
      'admin',
      req.user?.user_id || 1,
      req.user?.name || 'Admin',
      'Batch Sent Emails',
      `Sent ${sentCount} ${email_type} emails for ${month} (${failedCount} failed/skipped)`
    );

    res.json({
      success: true,
      sentCount,
      failedCount,
      errors: errorDetails,
      message: `Batch email complete: ${sentCount} emails sent successfully (${failedCount} skipped/failed).`
    });
  } catch (err) {
    console.error('Batch email error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Full consolidated monthly master report for all members (Admin only)
router.get('/month-consolidated/:month', requireAdmin, (req, res) => {
  try {
    const { month } = req.params;
    const settingsRows = db.prepare(`SELECT * FROM settings`).all();
    const settings = {};
    for (const s of settingsRows) settings[s.key] = s.value;

    const bills = db.prepare(`SELECT * FROM monthly_bills WHERE month = ? ORDER BY id ASC`).all(month);
    const members = db.prepare(`
      SELECT m.*, r.name as room_name, r.base_rent as room_base_rent
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE m.status = 'Active' OR (m.status = 'Former' AND substr(m.leave_date, 1, 7) >= ?)
      ORDER BY m.type DESC, m.room_id ASC, m.name ASC
    `).all(month);

    let totalFlatRent = 0;
    let totalElectricity = 0;
    let totalWifi = 0;
    let totalCook = 0;
    let totalOtherBills = 0;
    let totalPriorArrears = 0;
    let totalMonthBills = 0;
    let totalBillsPaid = 0;
    let totalNetBillsDue = 0;
    let totalFoodShares = 0;
    let totalFoodPaid = 0;
    let totalOverallOutstanding = 0;

    const rows = members.map(m => {
      const memberBills = db.prepare(`
        SELECT bs.amount, b.id as bill_id, b.title, b.category
        FROM bill_splits bs
        JOIN monthly_bills b ON bs.bill_id = b.id
        WHERE bs.member_id = ? AND b.month = ?
      `).all(m.id, month);

      const billMap = {};
      let billsTotal = 0;
      let memberRent = 0;
      let memberElec = 0;
      let memberWifi = 0;
      let memberCook = 0;
      let memberOther = 0;

      for (const b of memberBills) {
        billMap[b.bill_id] = b.amount;
        billsTotal += b.amount;

        const titleLower = (b.title || '').toLowerCase();
        const catLower = (b.category || '').toLowerCase();
        if (titleLower.includes('rent') || catLower === 'rent') {
          memberRent += b.amount;
        } else if (titleLower.includes('elec') || titleLower.includes('bijli')) {
          memberElec += b.amount;
        } else if (titleLower.includes('wifi') || titleLower.includes('net') || titleLower.includes('internet')) {
          memberWifi += b.amount;
        } else if (titleLower.includes('cook') || titleLower.includes('khansama') || titleLower.includes('maid')) {
          memberCook += b.amount;
        } else {
          memberOther += b.amount;
        }
      }

      // Prior arrears carried forward into this month
      const cf = db.prepare(`SELECT amount FROM monthly_carry_forward WHERE month = ? AND member_id = ?`).get(month, m.id);
      let priorArrears = 0;
      if (cf) {
        priorArrears = Number(cf.amount);
      } else {
        const pastBills = db.prepare(`
          SELECT COALESCE(SUM(bs.amount), 0) as total
          FROM bill_splits bs JOIN monthly_bills b ON bs.bill_id = b.id
          WHERE bs.member_id = ? AND b.month < ?
        `).get(m.id, month).total;
        const pastPaid = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM payments
          WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) < ?
        `).get(m.id, month).total;
        priorArrears = Math.round((Number(m.opening_balance || 0) + pastBills - pastPaid) * 100) / 100;
      }

      // Bills paid in this month
      const paidBills = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) = ?
      `).get(m.id, month).total;

      const netBillsDue = Math.round((priorArrears + billsTotal - paidBills) * 100) / 100;

      // Weekly food mess totals for month
      const foodTotal = db.prepare(`
        SELECT COALESCE(SUM(fs.amount), 0) as total
        FROM food_splits fs
        JOIN weekly_food f ON fs.food_id = f.id
        WHERE fs.member_id = ? AND f.month = ?
      `).get(m.id, month).total;

      const foodPaid = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE member_id = ? AND status = 'approved' AND payment_for = 'food' AND substr(payment_date, 1, 7) = ?
      `).get(m.id, month).total;

      const overall = getMemberBalance(m.id);

      // Aggregate master totals
      totalFlatRent += memberRent;
      totalElectricity += memberElec;
      totalWifi += memberWifi;
      totalCook += memberCook;
      totalOtherBills += memberOther;
      totalPriorArrears += priorArrears;
      totalMonthBills += billsTotal;
      totalBillsPaid += paidBills;
      totalNetBillsDue += netBillsDue;
      totalFoodShares += foodTotal;
      totalFoodPaid += foodPaid;
      totalOverallOutstanding += overall.outstanding_balance;

      return {
        member: m,
        bills: billMap,
        member_rent: memberRent,
        member_electricity: memberElec,
        member_wifi: memberWifi,
        member_cook: memberCook,
        member_other: memberOther,
        prior_arrears: priorArrears,
        bills_total: billsTotal,
        paid_bills: paidBills,
        net_bills_due: netBillsDue,
        food_total: foodTotal,
        food_paid: foodPaid,
        food_balance: overall.food_balance,
        overall_outstanding: overall.outstanding_balance
      };
    });

    const masterTotals = {
      totalFlatRent,
      totalElectricity,
      totalWifi,
      totalCook,
      totalOtherBills,
      totalPriorArrears,
      totalMonthBills,
      totalBillsPaid,
      totalNetBillsDue,
      totalFoodShares,
      totalFoodPaid,
      totalOverallOutstanding
    };

    res.json({
      month,
      settings,
      bills,
      rows,
      totals: masterTotals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export Monthly Master Statement to Excel / CSV format (Admin only)
router.get('/export-excel/:month', requireAdmin, (req, res) => {
  try {
    const { month } = req.params;
    const settingsRows = db.prepare(`SELECT * FROM settings`).all();
    const settings = {};
    for (const s of settingsRows) settings[s.key] = s.value;
    const currency = settings.currency_symbol || 'Rs.';

    const members = db.prepare(`
      SELECT m.*, r.name as room_name 
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE m.status = 'Active' OR (m.status = 'Former' AND substr(m.leave_date, 1, 7) >= ?)
      ORDER BY m.type DESC, m.room_id ASC, m.name ASC
    `).all(month);

    const csvRows = [];
    csvRows.push([
      `"${settings.flat_name || 'Flat Management'} - Monthly Financial Master Statement"`,
      `"Month: ${month}"`,
      `"Exported: ${new Date().toLocaleDateString()}"`
    ].join(','));
    csvRows.push([]); // empty line

    // Header row
    csvRows.push([
      '"Member Name"',
      '"Unique ID"',
      '"Type"',
      '"Room"',
      '"Room Rent"',
      '"Electricity"',
      '"WiFi"',
      '"Cook Salary"',
      '"Other Bills"',
      '"Prior Arrears"',
      '"Total Month Bills"',
      '"Paid Bills"',
      '"Net Bills Due"',
      '"Weekly Food Total"',
      '"Weekly Food Paid"',
      '"Food Mess Balance"',
      '"Overall Total Outstanding"'
    ].join(','));

    let totalRent = 0, totalElec = 0, totalWifi = 0, totalCook = 0, totalOther = 0;
    let totalArrears = 0, totalMonthBills = 0, totalPaidBills = 0, totalNetBills = 0;
    let totalFood = 0, totalFoodPaid = 0, totalFoodBalance = 0, totalOverall = 0;

    for (const m of members) {
      const memberBills = db.prepare(`
        SELECT bs.amount, b.title, b.category
        FROM bill_splits bs
        JOIN monthly_bills b ON bs.bill_id = b.id
        WHERE bs.member_id = ? AND b.month = ?
      `).all(m.id, month);

      let mRent = 0, mElec = 0, mWifi = 0, mCook = 0, mOther = 0;
      for (const b of memberBills) {
        const titleLower = (b.title || '').toLowerCase();
        const catLower = (b.category || '').toLowerCase();
        if (titleLower.includes('rent') || catLower === 'rent') mRent += b.amount;
        else if (titleLower.includes('elec') || titleLower.includes('bijli')) mElec += b.amount;
        else if (titleLower.includes('wifi') || titleLower.includes('net')) mWifi += b.amount;
        else if (titleLower.includes('cook') || titleLower.includes('khansama')) mCook += b.amount;
        else mOther += b.amount;
      }

      const cf = db.prepare(`SELECT amount FROM monthly_carry_forward WHERE month = ? AND member_id = ?`).get(month, m.id);
      let prior = cf ? Number(cf.amount) : 0;
      if (!cf) {
        const pastBills = db.prepare(`
          SELECT COALESCE(SUM(bs.amount), 0) as total FROM bill_splits bs JOIN monthly_bills b ON bs.bill_id = b.id WHERE bs.member_id = ? AND b.month < ?
        `).get(m.id, month).total;
        const pastPaid = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) < ?
        `).get(m.id, month).total;
        prior = Math.round((Number(m.opening_balance || 0) + pastBills - pastPaid) * 100) / 100;
      }

      const billsSum = mRent + mElec + mWifi + mCook + mOther;
      const paidBills = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) = ?
      `).get(m.id, month).total;
      const netBills = Math.round((prior + billsSum - paidBills) * 100) / 100;

      const foodTotal = db.prepare(`
        SELECT COALESCE(SUM(fs.amount), 0) as total FROM food_splits fs JOIN weekly_food f ON fs.food_id = f.id WHERE fs.member_id = ? AND f.month = ?
      `).get(m.id, month).total;
      const foodPaid = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE member_id = ? AND status = 'approved' AND payment_for = 'food' AND substr(payment_date, 1, 7) = ?
      `).get(m.id, month).total;

      const overall = getMemberBalance(m.id);

      totalRent += mRent;
      totalElec += mElec;
      totalWifi += mWifi;
      totalCook += mCook;
      totalOther += mOther;
      totalArrears += prior;
      totalMonthBills += billsSum;
      totalPaidBills += paidBills;
      totalNetBills += netBills;
      totalFood += foodTotal;
      totalFoodPaid += foodPaid;
      totalFoodBalance += overall.food_balance;
      totalOverall += overall.outstanding_balance;

      csvRows.push([
        `"${m.name.replace(/"/g, '""')}"`,
        `"${m.unique_id}"`,
        `"${m.type}"`,
        `"${m.room_name || 'Outside'}"`,
        mRent,
        mElec,
        mWifi,
        mCook,
        mOther,
        prior,
        billsSum,
        paidBills,
        netBills,
        foodTotal,
        foodPaid,
        overall.food_balance,
        overall.outstanding_balance
      ].join(','));
    }

    // Totals row
    csvRows.push([
      '"GRAND TOTALS"',
      '""',
      '""',
      '""',
      totalRent,
      totalElec,
      totalWifi,
      totalCook,
      totalOther,
      totalArrears,
      totalMonthBills,
      totalPaidBills,
      totalNetBills,
      totalFood,
      totalFoodPaid,
      totalFoodBalance,
      totalOverall
    ].join(','));

    // UTF-8 BOM for Microsoft Excel compatibility
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Flat_Statement_${month}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Member Full Statement for any period (Download My Statement PDF / Ledger)
router.get('/member-full-statement/:memberId', requireMemberSelf('memberId'), (req, res) => {
  try {
    const { memberId } = req.params;
    const { from, to, period = 'all' } = req.query;

    const member = db.prepare(`
      SELECT m.*, r.name as room_name, r.base_rent as room_base_rent
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE m.id = ?
    `).get(memberId);

    if (!member) return res.status(404).json({ error: 'Member not found' });

    const settingsRows = db.prepare(`SELECT * FROM settings`).all();
    const settings = {};
    for (const s of settingsRows) settings[s.key] = s.value;

    let billsQuery = `
      SELECT bs.amount, b.month, b.title, b.category, b.created_at
      FROM bill_splits bs
      JOIN monthly_bills b ON bs.bill_id = b.id
      WHERE bs.member_id = ?
    `;
    let foodQuery = `
      SELECT fs.amount, fs.is_custom, f.date, f.month, f.title
      FROM food_splits fs
      JOIN weekly_food f ON fs.food_id = f.id
      WHERE fs.member_id = ?
    `;
    let paymentsQuery = `
      SELECT amount, payment_for, payment_method, payment_date, reference_no, note, status, created_at
      FROM payments
      WHERE member_id = ? AND status = 'approved'
    `;

    const queryParams = [memberId];
    if (from && to) {
      billsQuery += ` AND b.month >= ? AND b.month <= ?`;
      foodQuery += ` AND f.month >= ? AND f.month <= ?`;
      paymentsQuery += ` AND substr(payment_date, 1, 7) >= ? AND substr(payment_date, 1, 7) <= ?`;
      queryParams.push(from, to);
    }

    billsQuery += ` ORDER BY b.month ASC, b.id ASC`;
    foodQuery += ` ORDER BY f.date ASC, f.id ASC`;
    paymentsQuery += ` ORDER BY payment_date ASC, id ASC`;

    const bills = db.prepare(billsQuery).all(...queryParams);
    const food = db.prepare(foodQuery).all(...queryParams);
    const payments = db.prepare(paymentsQuery).all(...queryParams);

    const totalBills = bills.reduce((acc, b) => acc + b.amount, 0);
    const totalFood = food.reduce((acc, f) => acc + f.amount, 0);
    const totalPaidBills = payments.filter(p => p.payment_for === 'bills' || !p.payment_for).reduce((acc, p) => acc + p.amount, 0);
    const totalPaidFood = payments.filter(p => p.payment_for === 'food').reduce((acc, p) => acc + p.amount, 0);

    const overallBalance = getMemberBalance(memberId);

    res.json({
      member,
      period: from && to ? `${from} to ${to}` : 'All Time',
      opening_balance: Number(member.opening_balance || 0),
      security_deposit: Number(member.security_deposit || 0),
      security_deposit_status: member.security_deposit_status || 'Held',
      bills,
      food,
      payments,
      summary: {
        total_bills: totalBills,
        total_food: totalFood,
        total_paid_bills: totalPaidBills,
        total_paid_food: totalPaidFood,
        bills_balance: overallBalance.bills_balance,
        food_balance: overallBalance.food_balance,
        net_outstanding: overallBalance.outstanding_balance
      },
      settings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full database backup download (Super Admin only)
router.get('/database-backup', requireAdmin, (req, res) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Super Admin can download full system backups.' });
    }

    const path = require('path');
    const dbFilePath = path.join(__dirname, '../flat_management.db');
    const dateStr = new Date().toISOString().slice(0, 10);
    res.download(dbFilePath, `Flat_Management_Backup_${dateStr}.db`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
