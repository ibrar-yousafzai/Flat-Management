const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');

// Helper to get days in a given month (YYYY-MM)
function getDaysInMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

// Helper to compute mid-month proration factor (0.0 to 1.0)
function calculateProration(joinDateStr, leaveDateStr, yearMonth, rule = 'days') {
  if (rule === 'full') return 1.0;

  const totalDays = getDaysInMonth(yearMonth);
  const monthStart = new Date(`${yearMonth}-01`);
  const monthEnd = new Date(`${yearMonth}-${totalDays}`);

  const joinDate = joinDateStr ? new Date(joinDateStr) : monthStart;
  const leaveDate = leaveDateStr ? new Date(leaveDateStr) : monthEnd;

  const effectiveStart = joinDate > monthStart ? joinDate : monthStart;
  const effectiveEnd = leaveDate < monthEnd ? leaveDate : monthEnd;

  if (effectiveStart > monthEnd || effectiveEnd < monthStart || effectiveStart > effectiveEnd) {
    return 0.0;
  }

  const activeDays = Math.round((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(1.0, Math.max(0.0, activeDays / totalDays));
}

// Get all historical and active months list
router.get('/months-list', (req, res) => {
  try {
    const billMonths = db.prepare(`SELECT DISTINCT month FROM monthly_bills`).all().map(r => r.month);
    const foodMonths = db.prepare(`SELECT DISTINCT month FROM weekly_food`).all().map(r => r.month);
    const statusMonths = db.prepare(`SELECT DISTINCT month FROM month_status`).all().map(r => r.month);
    const activeSetting = db.prepare(`SELECT value FROM settings WHERE key = 'active_month'`).get();
    const activeMonth = activeSetting ? activeSetting.value : new Date().toISOString().slice(0, 7);

    const allMonths = Array.from(new Set([...billMonths, ...foodMonths, ...statusMonths, activeMonth, '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10']))
      .filter(Boolean)
      .sort();

    res.json({
      months: allMonths,
      active_month: activeMonth
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to compute a member's carried forward arrears prior to a given month
function getPriorArrears(memberId, targetMonth) {
  // First check if an explicit carry-forward record was locked during month rollover
  const cf = db.prepare(`SELECT amount FROM monthly_carry_forward WHERE month = ? AND member_id = ?`).get(targetMonth, memberId);
  if (cf) return Number(cf.amount);

  // Otherwise calculate previous balance dynamically from past bills & payments
  const member = db.prepare(`SELECT opening_balance FROM members WHERE id = ?`).get(memberId);
  const opening = member ? Number(member.opening_balance || 0) : 0;

  const pastBills = db.prepare(`
    SELECT COALESCE(SUM(bs.amount), 0) as total
    FROM bill_splits bs
    JOIN monthly_bills b ON bs.bill_id = b.id
    WHERE bs.member_id = ? AND b.month < ?
  `).get(memberId, targetMonth).total;

  const pastPayments = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) < ?
  `).get(memberId, targetMonth).total;

  return Math.round((opening + pastBills - pastPayments) * 100) / 100;
}

// Check if a month is locked against modifications
function checkMonthNotLocked(month) {
  if (!month) return;
  const statusRow = db.prepare(`SELECT status, confirmed_by FROM month_status WHERE month = ?`).get(month);
  if (statusRow && (statusRow.status === 'confirmed' || statusRow.status === 'closed')) {
    const err = new Error(`Month ${month} is locked and finalized (by ${statusRow.confirmed_by || 'Admin'}). You cannot add, edit, or delete bills without reopening the month first.`);
    err.status = 403;
    throw err;
  }
}

// Get bills and full matrix for a given month (e.g., '2024-10')
router.get('/', (req, res) => {
  try {
    const activeSetting = db.prepare(`SELECT value FROM settings WHERE key = 'active_month'`).get();
    const defaultActive = activeSetting ? activeSetting.value : new Date().toISOString().slice(0, 7);
    const { month = defaultActive } = req.query;

    const bills = db.prepare(`
      SELECT b.*, r.name as room_name 
      FROM monthly_bills b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.month = ?
      ORDER BY b.id ASC
    `).all(month);

    // Get all active members during this month
    const members = db.prepare(`
      SELECT m.*, r.name as room_name, r.base_rent as room_base_rent
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE (m.status = 'Active' OR (m.status = 'Former' AND substr(m.leave_date, 1, 7) >= ?))
        AND substr(m.join_date, 1, 7) <= ?
      ORDER BY m.type DESC, m.room_id ASC, m.name ASC
    `).all(month, month);

    // Get all splits for this month
    const splits = db.prepare(`
      SELECT bs.*, b.month 
      FROM bill_splits bs
      JOIN monthly_bills b ON bs.bill_id = b.id
      WHERE b.month = ?
    `).all(month);

    const splitsMap = {};
    for (const s of splits) {
      if (!splitsMap[s.member_id]) splitsMap[s.member_id] = {};
      splitsMap[s.member_id][s.bill_id] = s.amount;
    }

    // Get weekly food total for this month per member (for reference)
    const foodTotals = db.prepare(`
      SELECT fs.member_id, COALESCE(SUM(fs.amount), 0) as total_food
      FROM food_splits fs
      JOIN weekly_food f ON fs.food_id = f.id
      WHERE f.month = ?
      GROUP BY fs.member_id
    `).all(month);

    const foodMap = {};
    for (const f of foodTotals) foodMap[f.member_id] = f.total_food;

    // Get payments made in this month per member for bills
    const paymentsInMonth = db.prepare(`
      SELECT member_id, COALESCE(SUM(amount), 0) as total_paid
      FROM payments
      WHERE status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) = ?
      GROUP BY member_id
    `).all(month);

    const paidMap = {};
    for (const p of paymentsInMonth) paidMap[p.member_id] = p.total_paid;

    // Construct matrix rows with itemized Carried Forward Arrears
    const matrix = members.map(m => {
      let memberBillsTotal = 0;
      const billValues = {};

      for (const b of bills) {
        const val = (splitsMap[m.id] && splitsMap[m.id][b.id]) || 0;
        billValues[b.id] = val;
        memberBillsTotal += val;
      }

      const carriedForward = getPriorArrears(m.id, month);
      const foodAmount = foodMap[m.id] || 0;
      const paidAmount = paidMap[m.id] || 0;
      const netMonthBillsPayable = Math.round((carriedForward + memberBillsTotal - paidAmount) * 100) / 100;

      return {
        member: {
          id: m.id,
          unique_id: m.unique_id,
          name: m.name,
          type: m.type,
          room_name: m.room_name || 'No Room',
          whatsapp: m.whatsapp
        },
        carried_forward: carriedForward,
        bills: billValues,
        bills_total: memberBillsTotal,
        food_total: foodAmount,
        paid_amount: paidAmount,
        net_month_payable: netMonthBillsPayable
      };
    });

    const totalBillsAmount = bills.reduce((acc, b) => acc + Number(b.total_amount), 0);

    // Get confirmation status of this month
    const monthStatusRow = db.prepare(`SELECT * FROM month_status WHERE month = ?`).get(month);
    const monthStatus = monthStatusRow ? monthStatusRow.status : 'draft';

    res.json({
      month,
      month_status: monthStatus,
      confirmed_by: monthStatusRow?.confirmed_by,
      confirmed_at: monthStatusRow?.confirmed_at,
      bills,
      total_bills_amount: totalBillsAmount,
      matrix
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm & publish month's bills (Finalize draft so members see it)
router.post('/confirm-month', (req, res) => {
  try {
    const { month, admin_name = 'Admin' } = req.body;
    if (!month) return res.status(400).json({ error: 'Month is required' });

    db.prepare(`
      INSERT OR REPLACE INTO month_status (month, status, confirmed_by, confirmed_at)
      VALUES (?, 'confirmed', ?, CURRENT_TIMESTAMP)
    `).run(month, admin_name);

    logAudit('admin', null, admin_name, 'Confirmed Monthly Bills', `Confirmed and published monthly bills for ${month}`);

    res.json({ success: true, message: `Bills for ${month} confirmed and published to members!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reopen / Unlock a previously finalized month (Requires recorded reason)
router.post('/reopen-month', (req, res) => {
  try {
    const { month, admin_name = 'Admin', reason = '' } = req.body;
    if (!month) return res.status(400).json({ error: 'Month is required' });

    const cleanReason = (reason || '').trim();
    if (!cleanReason) {
      return res.status(400).json({ error: 'Please provide a reason for reopening finalized bills (e.g., utility correction, meter adjustment).' });
    }

    db.prepare(`
      INSERT OR REPLACE INTO month_status (month, status, reopened_by, reopened_at, reopen_reason)
      VALUES (?, 'draft', ?, CURRENT_TIMESTAMP, ?)
    `).run(month, admin_name, cleanReason);

    logAudit('admin', null, admin_name, 'Reopened Monthly Bills', `Unlocked bills for ${month}. Reason: ${cleanReason}`);

    res.json({
      success: true,
      message: `Month ${month} bills successfully unlocked for editing! Audit record created.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close current month and advance to next month, carrying forward all remaining balances
router.post('/close-and-advance-month', (req, res) => {
  try {
    const { month, admin_name = 'Admin' } = req.body;
    if (!month) return res.status(400).json({ error: 'Month is required' });

    // Calculate next month string (YYYY-MM)
    const [year, mNum] = month.split('-').map(Number);
    let nextYear = year;
    let nextMonthNum = mNum + 1;
    if (nextMonthNum > 12) {
      nextYear += 1;
      nextMonthNum = 1;
    }
    const nextMonth = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}`;

    // Mark current month as closed
    db.prepare(`
      INSERT OR REPLACE INTO month_status (month, status, confirmed_by, confirmed_at, closed_by, closed_at)
      VALUES (?, 'closed', ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
    `).run(month, admin_name, admin_name);

    // Calculate ending balance for each active member in this month
    const members = db.prepare(`SELECT id, name, unique_id FROM members WHERE status = 'Active'`).all();
    const insertCarry = db.prepare(`
      INSERT OR REPLACE INTO monthly_carry_forward (month, from_month, member_id, amount, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    let carriedCount = 0;
    for (const m of members) {
      // Prior arrears up to this month
      const prior = getPriorArrears(m.id, month);

      // Bills in this month
      const thisMonthBills = db.prepare(`
        SELECT COALESCE(SUM(bs.amount), 0) as total
        FROM bill_splits bs
        JOIN monthly_bills b ON bs.bill_id = b.id
        WHERE bs.member_id = ? AND b.month = ?
      `).get(m.id, month).total;

      // Payments made in this month for bills
      const thisMonthPaid = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL) AND substr(payment_date, 1, 7) = ?
      `).get(m.id, month).total;

      const endingBillsBalance = Math.round((prior + thisMonthBills - thisMonthPaid) * 100) / 100;
      insertCarry.run(nextMonth, month, m.id, endingBillsBalance, `Carried forward from ${month} closing balance`);
      if (endingBillsBalance !== 0) carriedCount++;
    }

    // Set new month as active in settings
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('active_month', ?)`).run(nextMonth);
    // Initialize new month status as draft
    db.prepare(`INSERT OR IGNORE INTO month_status (month, status) VALUES (?, 'draft')`).run(nextMonth);

    logAudit('admin', null, admin_name, 'Closed Month & Advanced', `Closed ${month} and advanced active month to ${nextMonth}. Carried forward balances for ${carriedCount} members.`);

    res.json({
      success: true,
      message: `Month ${month} closed successfully! Advanced to ${nextMonth}. Remaining balances carried forward.`,
      nextMonth,
      carriedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit specific individual splits for a bill directly
router.put('/:id/splits', (req, res) => {
  try {
    const { id } = req.params;
    const { member_splits = {}, admin_name = 'Admin' } = req.body; // { "memberId": 5000 }

    const bill = db.prepare(`SELECT * FROM monthly_bills WHERE id = ?`).get(id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    checkMonthNotLocked(bill.month);

    const updateSplit = db.prepare(`UPDATE bill_splits SET amount = ? WHERE bill_id = ? AND member_id = ?`);
    const insertSplit = db.prepare(`INSERT OR IGNORE INTO bill_splits (bill_id, member_id, amount) VALUES (?, ?, ?)`);

    let newTotal = 0;
    for (const [memId, amount] of Object.entries(member_splits)) {
      const val = Math.round(Number(amount) * 100) / 100;
      newTotal += val;
      const res = updateSplit.run(val, id, Number(memId));
      if (res.changes === 0) {
        insertSplit.run(id, Number(memId), val);
      }
    }

    // Update bill total amount to match sum of edited splits
    db.prepare(`UPDATE monthly_bills SET total_amount = ? WHERE id = ?`).run(newTotal, id);

    logAudit('admin', null, admin_name, 'Edited Bill Splits', `Custom adjusted splits for bill "${bill.title}" (New Total: Rs. ${newTotal})`);

    res.json({ success: true, newTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit or override a member's carried forward balance directly
router.put('/carry-forward/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes, admin_name = 'Admin' } = req.body;

    const cf = db.prepare(`SELECT * FROM monthly_carry_forward WHERE id = ?`).get(id);
    if (!cf) return res.status(404).json({ error: 'Carry-forward record not found' });
    checkMonthNotLocked(cf.month);

    db.prepare(`UPDATE monthly_carry_forward SET amount = ?, notes = COALESCE(?, notes) WHERE id = ?`).run(Number(amount), notes, id);

    logAudit('admin', null, admin_name, 'Adjusted Carry Forward', `Adjusted carried balance for member #${cf.member_id} in ${cf.month} to Rs. ${amount}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-generate or populate Rent Bills from active Rooms for a given month
router.post('/auto-generate-rent', (req, res) => {
  try {
    const { month, actor_name = 'Admin' } = req.body;
    if (!month) {
      return res.status(400).json({ error: 'Month is required (YYYY-MM)' });
    }
    checkMonthNotLocked(month);

    // Check if rent bill already exists
    const existingRent = db.prepare(`SELECT * FROM monthly_bills WHERE month = ? AND category = 'rent'`).get(month);
    if (existingRent) {
      return res.status(400).json({ error: 'Rent bill already generated for this month. You can edit it directly.' });
    }

    const rooms = db.prepare(`SELECT * FROM rooms`).all();
    const insideMembers = db.prepare(`
      SELECT m.*, r.base_rent
      FROM members m
      JOIN rooms r ON m.room_id = r.id
      WHERE m.status = 'Active' AND m.type = 'Inside'
    `).all();

    if (rooms.length === 0) {
      return res.status(400).json({ error: 'No rooms configured yet. Please add rooms first.' });
    }

    let totalRent = 0;
    for (const r of rooms) totalRent += Number(r.base_rent);

    const billRes = db.prepare(`
      INSERT INTO monthly_bills (month, title, category, total_amount, split_type, room_id, notes)
      VALUES (?, 'Monthly Flat Rent', 'rent', ?, 'by_room', NULL, 'Auto-generated from active rooms')
    `).run(month, totalRent);

    const billId = billRes.lastInsertRowid;
    const insertSplit = db.prepare(`INSERT INTO bill_splits (bill_id, member_id, amount) VALUES (?, ?, ?)`);

    // Split rent room by room equally among room occupants
    for (const room of rooms) {
      const roomOccupants = insideMembers.filter(m => m.room_id === room.id);
      if (roomOccupants.length > 0) {
        const baseShare = room.base_rent / roomOccupants.length;
        for (const occ of roomOccupants) {
          const factor = calculateProration(occ.join_date, occ.leave_date, month, occ.midmonth_rule);
          const finalShare = Math.round(baseShare * factor * 100) / 100;
          insertSplit.run(billId, occ.id, finalShare);
        }
      }
    }

    logAudit('admin', null, actor_name, 'Generated Monthly Rent', `Auto-generated rent for ${month} (Total: Rs. ${totalRent})`);

    res.json({ success: true, billId, totalRent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add custom or utility bill (Electricity, Cook, Wifi, etc.)
router.post('/', (req, res) => {
  try {
    const {
      month,
      title,
      category = 'utility',
      total_amount,
      split_type = 'everyone', // 'everyone', 'inside_only', 'by_room', 'pick_people'
      room_id = null,
      selected_members = [],
      notes = '',
      attachment_url = '',
      actor_name = 'Admin'
    } = req.body;

    if (!month || !title || total_amount === undefined || total_amount === null) {
      return res.status(400).json({ error: 'Month, title and total amount are required' });
    }
    checkMonthNotLocked(month);

    const amount = Number(total_amount);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ error: 'Valid total amount is required' });
    }

    // Determine eligible members to split among
    let eligibleMembers = [];
    if (split_type === 'everyone') {
      eligibleMembers = db.prepare(`SELECT * FROM members WHERE status = 'Active'`).all();
    } else if (split_type === 'inside_only') {
      eligibleMembers = db.prepare(`SELECT * FROM members WHERE status = 'Active' AND type = 'Inside'`).all();
    } else if (split_type === 'by_room') {
      if (!room_id) {
        return res.status(400).json({ error: 'Room is required for "By Room" split' });
      }
      eligibleMembers = db.prepare(`SELECT * FROM members WHERE status = 'Active' AND room_id = ?`).all(room_id);
    } else if (split_type === 'pick_people') {
      if (!selected_members || selected_members.length === 0) {
        return res.status(400).json({ error: 'Please select at least one member' });
      }
      eligibleMembers = db.prepare(`
        SELECT * FROM members WHERE id IN (${selected_members.map(() => '?').join(',')})
      `).all(...selected_members);
    }

    if (eligibleMembers.length === 0) {
      return res.status(400).json({ error: 'No eligible members found for this split criteria' });
    }

    const billRes = db.prepare(`
      INSERT INTO monthly_bills (month, title, category, total_amount, split_type, room_id, attachment_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(month, title.trim(), category, amount, split_type, room_id || null, attachment_url, notes.trim());

    const billId = billRes.lastInsertRowid;
    const insertSplit = db.prepare(`INSERT INTO bill_splits (bill_id, member_id, amount) VALUES (?, ?, ?)`);

    const splitShare = Math.round((amount / eligibleMembers.length) * 100) / 100;
    for (const mem of eligibleMembers) {
      insertSplit.run(billId, mem.id, splitShare);
    }

    logAudit('admin', null, actor_name, 'Created Bill', `Added bill "${title}" for ${month} (Rs. ${amount}, Split: ${split_type})`);

    res.json({ success: true, id: billId, count: eligibleMembers.length, splitShare });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an existing bill
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      total_amount,
      split_type,
      room_id,
      selected_members,
      notes,
      attachment_url,
      actor_name = 'Admin'
    } = req.body;

    const existingBill = db.prepare(`SELECT * FROM monthly_bills WHERE id = ?`).get(id);
    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    checkMonthNotLocked(existingBill.month);

    const newAmount = total_amount !== undefined ? Number(total_amount) : existingBill.total_amount;
    const newSplitType = split_type || existingBill.split_type;
    const newRoomId = room_id !== undefined ? (room_id ? Number(room_id) : null) : existingBill.room_id;

    db.prepare(`
      UPDATE monthly_bills SET
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        total_amount = ?,
        split_type = ?,
        room_id = ?,
        attachment_url = COALESCE(?, attachment_url),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      title ? title.trim() : null,
      category,
      newAmount,
      newSplitType,
      newRoomId,
      attachment_url,
      notes,
      id
    );

    // Recompute splits
    let eligibleMembers = [];
    if (newSplitType === 'everyone') {
      eligibleMembers = db.prepare(`SELECT id FROM members WHERE status = 'Active'`).all();
    } else if (newSplitType === 'inside_only') {
      eligibleMembers = db.prepare(`SELECT id FROM members WHERE status = 'Active' AND type = 'Inside'`).all();
    } else if (newSplitType === 'by_room') {
      eligibleMembers = db.prepare(`SELECT id FROM members WHERE status = 'Active' AND room_id = ?`).all(newRoomId);
    } else if (newSplitType === 'pick_people' && selected_members && selected_members.length > 0) {
      eligibleMembers = db.prepare(`
        SELECT id FROM members WHERE id IN (${selected_members.map(() => '?').join(',')})
      `).all(...selected_members);
    } else {
      // Keep existing members who had splits
      eligibleMembers = db.prepare(`SELECT member_id as id FROM bill_splits WHERE bill_id = ?`).all(id);
    }

    if (eligibleMembers.length > 0) {
      db.prepare(`DELETE FROM bill_splits WHERE bill_id = ?`).run(id);
      const insertSplit = db.prepare(`INSERT INTO bill_splits (bill_id, member_id, amount) VALUES (?, ?, ?)`);
      const splitShare = Math.round((newAmount / eligibleMembers.length) * 100) / 100;
      for (const mem of eligibleMembers) {
        insertSplit.run(id, mem.id, splitShare);
      }
    }

    logAudit('admin', null, actor_name, 'Updated Bill', `Updated bill "${title || existingBill.title}" (${existingBill.month})`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete bill
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const bill = db.prepare(`SELECT * FROM monthly_bills WHERE id = ?`).get(id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    checkMonthNotLocked(bill.month);

    db.prepare(`DELETE FROM bill_splits WHERE bill_id = ?`).run(id);
    db.prepare(`DELETE FROM monthly_bills WHERE id = ?`).run(id);

    logAudit('admin', null, req.body.actor_name || 'Admin', 'Deleted Bill', `Deleted bill "${bill.title}" for ${bill.month} (Rs. ${bill.total_amount})`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all bills and data for an entire month
router.delete('/month/:month', (req, res) => {
  try {
    const { month } = req.params;
    const actor_name = req.body?.actor_name || req.query?.actor_name || 'Admin';
    const deleteFood = req.body?.delete_food === true || req.query?.delete_food === 'true';

    // Get all bills in this month
    const bills = db.prepare(`SELECT id FROM monthly_bills WHERE month = ?`).all(month);
    const billIds = bills.map(b => b.id);

    const deleteTx = db.transaction(() => {
      if (billIds.length > 0) {
        const placeholders = billIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM bill_splits WHERE bill_id IN (${placeholders})`).run(...billIds);
        db.prepare(`DELETE FROM monthly_bills WHERE month = ?`).run(month);
      }
      db.prepare(`DELETE FROM month_status WHERE month = ?`).run(month);
      db.prepare(`DELETE FROM monthly_carry_forward WHERE month = ?`).run(month);

      if (deleteFood) {
        const foodEntries = db.prepare(`SELECT id FROM weekly_food WHERE month = ?`).all(month);
        const foodIds = foodEntries.map(f => f.id);
        if (foodIds.length > 0) {
          const fPlaceholders = foodIds.map(() => '?').join(',');
          db.prepare(`DELETE FROM food_splits WHERE food_id IN (${fPlaceholders})`).run(...foodIds);
          db.prepare(`DELETE FROM weekly_food WHERE month = ?`).run(month);
        }
      }
    });

    deleteTx();

    logAudit('admin', null, actor_name, 'Deleted Month Data', `Cleared bills (${billIds.length} bills), carry-forward, and status for month ${month}${deleteFood ? ' (including weekly food)' : ''}`);

    res.json({
      success: true,
      message: `Month ${month} data successfully deleted (${billIds.length} bills removed).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
