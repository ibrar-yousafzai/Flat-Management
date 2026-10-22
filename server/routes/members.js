const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { pushMemberToSupabase, deleteMemberFromSupabase } = require('../supabase');
const { requireMemberSelf, requireAdmin, requirePermission } = require('../middleware/auth');

// Helper to calculate a member's separated balances (Monthly Bills vs Weekly Food)
function getMemberBalance(memberId) {
  const member = db.prepare(`SELECT opening_balance FROM members WHERE id = ?`).get(memberId);
  const openingBalance = member ? Number(member.opening_balance || 0) : 0;

  // Total monthly bills assigned (Rent, Utilities)
  const billsTotal = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM bill_splits WHERE member_id = ?
  `).get(memberId).total;

  // Payments approved specifically for monthly bills
  const billsPaymentsTotal = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM payments 
    WHERE member_id = ? AND status = 'approved' AND (payment_for = 'bills' OR payment_for IS NULL)
  `).get(memberId).total;

  // Pending payments for monthly bills
  const billsPendingTotal = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM payments 
    WHERE member_id = ? AND status = 'pending' AND (payment_for = 'bills' OR payment_for IS NULL)
  `).get(memberId).total;

  // Total weekly food assigned (Separate Week-to-Week Mess)
  const foodTotalRow = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total,
      COALESCE(SUM(COALESCE(paid_amount, CASE WHEN is_paid = 1 THEN amount ELSE 0 END)), 0) as split_paid_total
    FROM food_splits WHERE member_id = ?
  `).get(memberId) || { total: 0, split_paid_total: 0 };
  const foodTotal = foodTotalRow.total;
  const foodSplitPaidTotal = foodTotalRow.split_paid_total;

  // Payments approved specifically for food mess
  const foodPaymentsTotal = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM payments 
    WHERE member_id = ? AND status = 'approved' AND payment_for = 'food'
  `).get(memberId).total;

  const effectiveFoodPaid = Math.max(foodSplitPaidTotal, foodPaymentsTotal);

  // Pending payments for food mess
  const foodPendingTotal = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM payments 
    WHERE member_id = ? AND status = 'pending' AND payment_for = 'food'
  `).get(memberId).total;

  // Independent Balances:
  // 1. Monthly Bills Balance (Rent + Utilities)
  const billsBalance = Math.round((openingBalance + billsTotal - billsPaymentsTotal) * 100) / 100;
  
  // 2. Weekly Food Balance (Week-to-week mess, overpayment is advance for next week)
  const foodBalance = Math.max(0, Math.round((foodTotal - effectiveFoodPaid) * 100) / 100);

  // Combined totals for convenience
  const totalCharges = openingBalance + billsTotal + foodTotal;
  const paymentsTotal = billsPaymentsTotal + foodPaymentsTotal;
  const pendingTotal = billsPendingTotal + foodPendingTotal;
  const outstandingBalance = Math.round((billsBalance + foodBalance) * 100) / 100;

  return {
    opening_balance: openingBalance,
    // Monthly Bills Ledger
    bills_total: billsTotal,
    bills_payments_total: billsPaymentsTotal,
    bills_pending_total: billsPendingTotal,
    bills_balance: billsBalance,
    // Weekly Food Ledger (Separate!)
    food_total: foodTotal,
    food_payments_total: foodPaymentsTotal,
    food_pending_total: foodPendingTotal,
    food_balance: foodBalance,
    // Aggregate summary
    payments_total: paymentsTotal,
    pending_total: pendingTotal,
    total_charges: totalCharges,
    outstanding_balance: outstandingBalance
  };
}

// Generate next unique member ID
function generateUniqueId() {
  const lastMember = db.prepare(`
    SELECT unique_id FROM members 
    WHERE unique_id LIKE 'MEM-%' 
    ORDER BY id DESC LIMIT 1
  `).get();

  if (!lastMember) return 'MEM-001';
  const numPart = parseInt(lastMember.unique_id.replace('MEM-', ''), 10);
  const nextNum = isNaN(numPart) ? 1 : numPart + 1;
  return `MEM-${String(nextNum).padStart(3, '0')}`;
}

// Get members (If logged in as member, strictly scoped to self only)
router.get('/', (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const isMember = req.user?.user_type === 'member';
    const { status, type } = req.query;
    let query = `
      SELECT m.*, r.name as room_name, r.base_rent as room_base_rent
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    // Privacy isolation
    if (isMember) {
      query += ` AND m.id = ?`;
      params.push(req.user.user_id);
    } else {
      if (status && status !== 'all') {
        query += ` AND m.status = ?`;
        params.push(status);
      }
      if (type && type !== 'all') {
        query += ` AND m.type = ?`;
        params.push(type);
      }
    }

    query += ` ORDER BY m.status ASC, m.name ASC`;
    const members = db.prepare(query).all(...params);

    const membersWithBalance = members.map(m => {
      const balance = getMemberBalance(m.id);
      return {
        ...m,
        ...balance
      };
    });

    res.json(membersWithBalance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single member details and full statement / ledger (Strictly guarded)
router.get('/:id', requireMemberSelf('id'), (req, res) => {
  try {
    const { id } = req.params;
    const member = db.prepare(`
      SELECT m.*, r.name as room_name, r.base_rent as room_base_rent
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE m.id = ? OR m.unique_id = ?
    `).get(id, id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const balance = getMemberBalance(member.id);

    // Bill splits history
    const bills = db.prepare(`
      SELECT bs.amount, b.id as bill_id, b.month, b.title, b.category, b.total_amount as bill_total, b.split_type
      FROM bill_splits bs
      JOIN monthly_bills b ON bs.bill_id = b.id
      WHERE bs.member_id = ?
      ORDER BY b.month DESC, b.id DESC
    `).all(member.id);

    // Food splits history
    const food = db.prepare(`
      SELECT fs.amount, f.id as food_id, f.date, f.week_label, f.month, f.title, f.total_amount as food_total
      FROM food_splits fs
      JOIN weekly_food f ON fs.food_id = f.id
      WHERE fs.member_id = ?
      ORDER BY f.date DESC
    `).all(member.id);

    // Payments history
    const payments = db.prepare(`
      SELECT p.*, a.name as reviewed_by_name
      FROM payments p
      LEFT JOIN admins a ON p.reviewed_by_admin_id = a.id
      WHERE p.member_id = ?
      ORDER BY p.payment_date DESC, p.id DESC
    `).all(member.id);

    // Member type / room change history
    const history = db.prepare(`
      SELECT mh.*, r.name as room_name
      FROM member_history mh
      LEFT JOIN rooms r ON mh.room_id = r.id
      WHERE mh.member_id = ?
      ORDER BY mh.effective_date DESC
    `).all(member.id);

    res.json({
      member,
      balance,
      bills,
      food,
      payments,
      history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new member
router.post('/', requirePermission('can_manage_members'), (req, res) => {
  try {
    const {
      name,
      email = '',
      whatsapp = '',
      type = 'Inside',
      room_id = null,
      join_date = new Date().toISOString().slice(0, 10),
      midmonth_rule = 'days',
      opening_balance = 0,
      security_deposit = 0,
      security_deposit_notes = '',
      unique_id,
      password,
      notes = '',
      actor_name = 'Admin'
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Member name is required' });
    }

    const finalUniqueId = unique_id ? unique_id.trim().toUpperCase() : generateUniqueId();
    const finalPassword = password || 'flat' + Math.floor(1000 + Math.random() * 9000);
    const assignedRoomId = type === 'Outside' ? null : (room_id ? Number(room_id) : null);

    const info = db.prepare(`
      INSERT INTO members (
        unique_id, password, name, email, whatsapp, type, room_id, status, join_date, midmonth_rule, opening_balance, security_deposit, security_deposit_status, security_deposit_notes, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, 'Held', ?, ?)
    `).run(
      finalUniqueId,
      finalPassword,
      name.trim(),
      email.trim(),
      whatsapp.trim(),
      type,
      assignedRoomId,
      join_date,
      midmonth_rule,
      Number(opening_balance) || 0,
      Number(security_deposit) || 0,
      security_deposit_notes.trim(),
      notes.trim()
    );

    const newId = info.lastInsertRowid;

    // Record initial history
    db.prepare(`
      INSERT INTO member_history (member_id, type, room_id, effective_date, reason)
      VALUES (?, ?, ?, ?, 'Initial Registration')
    `).run(newId, type, assignedRoomId, join_date);

    logAudit('admin', null, actor_name, 'Created Member', `Added member ${name} (${finalUniqueId}, ${type})`);

    // Sync to Supabase Cloud
    pushMemberToSupabase({
      unique_id: finalUniqueId,
      name,
      email,
      whatsapp,
      type,
      join_date,
      opening_balance,
      notes
    }).then(sb => {
      if (sb?.id) {
        db.prepare('UPDATE members SET supabase_id = ? WHERE id = ?').run(sb.id, newId);
      }
    }).catch(err => console.error('Supabase member push error:', err));

    res.json({
      success: true,
      id: newId,
      unique_id: finalUniqueId,
      password: finalPassword
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update member
router.put('/:id', requirePermission('can_manage_members'), (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      whatsapp,
      type,
      room_id,
      status,
      join_date,
      leave_date,
      midmonth_rule,
      opening_balance,
      security_deposit,
      security_deposit_status,
      security_deposit_notes,
      password,
      notes,
      effective_date = new Date().toISOString().slice(0, 10),
      actor_name = 'Admin'
    } = req.body;

    const current = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id);
    if (!current) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const newType = type || current.type;
    const newRoomId = newType === 'Outside' ? null : (room_id !== undefined ? (room_id ? Number(room_id) : null) : current.room_id);

    // Track type or room switch in history if changed
    if (newType !== current.type || newRoomId !== current.room_id) {
      db.prepare(`
        INSERT INTO member_history (member_id, type, room_id, effective_date, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, newType, newRoomId, effective_date, `Switched to ${newType} (Room: ${newRoomId || 'None'})`);
    }

    db.prepare(`
      UPDATE members SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        whatsapp = COALESCE(?, whatsapp),
        type = ?,
        room_id = ?,
        status = COALESCE(?, status),
        join_date = COALESCE(?, join_date),
        leave_date = ?,
        midmonth_rule = COALESCE(?, midmonth_rule),
        opening_balance = COALESCE(?, opening_balance),
        security_deposit = COALESCE(?, security_deposit),
        security_deposit_status = COALESCE(?, security_deposit_status),
        security_deposit_notes = COALESCE(?, security_deposit_notes),
        password = COALESCE(?, password),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      name,
      email,
      whatsapp,
      newType,
      newRoomId,
      status,
      join_date,
      leave_date !== undefined ? leave_date : current.leave_date,
      midmonth_rule,
      opening_balance !== undefined ? Number(opening_balance) : current.opening_balance,
      security_deposit !== undefined ? Number(security_deposit) : current.security_deposit,
      security_deposit_status,
      security_deposit_notes,
      password,
      notes,
      id
    );

    logAudit('admin', null, actor_name, 'Updated Member', `Updated member ${current.name} (${current.unique_id})`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate Leaving Settlement Statement (What they owe vs refundable security deposit)
router.get('/:id/settlement-statement', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const member = db.prepare(`
      SELECT m.*, r.name as room_name, r.base_rent as room_base_rent
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE m.id = ? OR m.unique_id = ?
    `).get(id, id);

    if (!member) return res.status(404).json({ error: 'Member not found' });

    const balance = getMemberBalance(id);
    const deposit = Number(member.security_deposit || 0);
    const totalOwed = balance.outstanding_balance;
    const netSettlement = deposit - totalOwed; // positive: refund to member; negative: member owes flat

    res.json({
      member,
      balance,
      security_deposit: deposit,
      security_deposit_status: member.security_deposit_status || 'Held',
      total_owed: totalOwed,
      net_settlement: Math.round(netSettlement * 100) / 100,
      settlement_type: netSettlement > 0 ? 'refund_due' : (netSettlement < 0 ? 'dues_owed' : 'settled_balanced'),
      summary_text: netSettlement > 0 
        ? `Refund of Rs. ${netSettlement.toLocaleString()} payable to member (after deducting Rs. ${totalOwed.toLocaleString()} total dues from deposit).`
        : (netSettlement < 0
          ? `Member owes Rs. ${Math.abs(netSettlement).toLocaleString()} to the flat (Security deposit of Rs. ${deposit.toLocaleString()} has been fully consumed).`
          : `Fully balanced. Dues exactly match the security deposit.`)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Execute and Confirm Leaving Settlement
router.post('/:id/execute-settlement', requirePermission('can_manage_members'), (req, res) => {
  try {
    const { id } = req.params;
    const {
      leave_date = new Date().toISOString().slice(0, 10),
      action = 'offset_and_refund', // 'offset_and_refund', 'mark_cleared', 'custom'
      refund_amount = 0,
      recovery_amount = 0,
      settlement_notes = '',
      actor_name = 'Admin'
    } = req.body;

    const member = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const balance = getMemberBalance(id);
    const deposit = Number(member.security_deposit || 0);

    // If offset against dues, record system offset payment to clear the balance
    if (action === 'offset_and_refund' && balance.bills_balance > 0) {
      const offsetAmount = Math.min(deposit, balance.bills_balance);
      if (offsetAmount > 0) {
        db.prepare(`
          INSERT INTO payments (member_id, amount, payment_for, payment_method, payment_date, note, status, submitted_by_type)
          VALUES (?, ?, 'bills', 'adjustment', ?, 'Security deposit adjusted against unpaid room bills upon departure', 'approved', 'admin')
        `).run(id, offsetAmount, leave_date);
      }
    }

    const finalDetails = JSON.stringify({
      leave_date,
      original_deposit: deposit,
      bills_due_at_exit: balance.bills_balance,
      food_due_at_exit: balance.food_balance,
      refund_amount: Number(refund_amount) || 0,
      recovery_amount: Number(recovery_amount) || 0,
      action,
      notes: settlement_notes
    });

    db.prepare(`
      UPDATE members SET
        status = 'Former',
        leave_date = ?,
        room_id = NULL,
        security_deposit_status = 'Settled',
        settlement_status = 'Settled',
        settlement_details = ?,
        settled_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(leave_date, finalDetails, id);

    db.prepare(`
      INSERT INTO member_history (member_id, type, room_id, effective_date, reason)
      VALUES (?, ?, NULL, ?, ?)
    `).run(id, member.type, leave_date, `Departure Settlement Completed: ${settlement_notes || action}`);

    logAudit('admin', req.user?.user_id || null, actor_name, 'Completed Leaving Settlement', `Settled departure for ${member.name} (${member.unique_id}). Action: ${action}, Refund: Rs. ${refund_amount}, Recovery: Rs. ${recovery_amount}`);

    res.json({
      success: true,
      message: `Leaving settlement successfully finalized for ${member.name}! Moved to Former members with complete history preserved.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Archive member (Move to Former)
router.post('/:id/archive', requirePermission('can_manage_members'), (req, res) => {
  try {
    const { id } = req.params;
    const { leave_date = new Date().toISOString().slice(0, 10), actor_name = 'Admin' } = req.body;

    const member = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    db.prepare(`
      UPDATE members SET status = 'Former', leave_date = ?, room_id = NULL WHERE id = ?
    `).run(leave_date, id);

    db.prepare(`
      INSERT INTO member_history (member_id, type, room_id, effective_date, reason)
      VALUES (?, ?, NULL, ?, 'Left Flat / Moved to Former')
    `).run(id, member.type, leave_date);

    logAudit('admin', null, actor_name, 'Archived Member', `Moved ${member.name} (${member.unique_id}) to Former members`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reactivate former member
router.post('/:id/reactivate', requirePermission('can_manage_members'), (req, res) => {
  try {
    const { id } = req.params;
    const { room_id = null, type = 'Inside', actor_name = 'Admin' } = req.body;

    const member = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    db.prepare(`
      UPDATE members SET status = 'Active', leave_date = NULL, type = ?, room_id = ? WHERE id = ?
    `).run(type, type === 'Outside' ? null : room_id, id);

    logAudit('admin', null, actor_name, 'Reactivated Member', `Reactivated member ${member.name} (${member.unique_id})`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Permanently delete member
router.delete('/:id', requirePermission('can_manage_members'), (req, res) => {
  try {
    const { id } = req.params;
    const actor_name = req.body?.actor_name || req.query?.actor_name || 'Admin';

    const member = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const deleteTx = db.transaction(() => {
      db.prepare(`DELETE FROM bill_splits WHERE member_id = ?`).run(id);
      db.prepare(`DELETE FROM food_splits WHERE member_id = ?`).run(id);
      db.prepare(`DELETE FROM payments WHERE member_id = ?`).run(id);
      db.prepare(`DELETE FROM monthly_carry_forward WHERE member_id = ?`).run(id);
      db.prepare(`DELETE FROM member_history WHERE member_id = ?`).run(id);
      db.prepare(`DELETE FROM member_settlements WHERE member_id = ?`).run(id);
      db.prepare(`DELETE FROM members WHERE id = ?`).run(id);
    });

    deleteTx();

    if (member.supabase_id) {
      deleteMemberFromSupabase(member.supabase_id).catch(err => console.error('Supabase delete error:', err));
    }

    logAudit('admin', null, actor_name, 'Permanently Deleted Member', `Deleted member ${member.name} (${member.unique_id}) and cleaned up all associated records`);

    res.json({ success: true, message: `Member ${member.name} (${member.unique_id}) was permanently deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, getMemberBalance };
