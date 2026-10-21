const express = require('express');
const router = express.Router();
const { db, logAudit, createNotification } = require('../db');

// Get all weekly food entries (optionally filtered by month)
router.get('/', (req, res) => {
  try {
    const { month } = req.query;
    let query = `SELECT * FROM weekly_food WHERE 1=1`;
    const params = [];

    if (month) {
      query += ` AND month = ?`;
      params.push(month);
    }

    query += ` ORDER BY date DESC, id DESC`;
    const entries = db.prepare(query).all(...params);

    const enriched = entries.map(entry => {
      const splits = db.prepare(`
        SELECT fs.*, m.name as member_name, m.unique_id, m.whatsapp, m.type as member_type, r.name as room_name
        FROM food_splits fs
        JOIN members m ON fs.member_id = m.id
        LEFT JOIN rooms r ON m.room_id = r.id
        WHERE fs.food_id = ?
        ORDER BY m.name ASC
      `).all(entry.id).map(s => {
        const amt = Number(s.amount || 0);
        const paid = Number(s.paid_amount !== undefined && s.paid_amount !== null ? s.paid_amount : (s.is_paid === 1 ? amt : 0));
        const remaining = Math.max(0, amt - paid);
        let status = 'unpaid';
        if (paid >= amt && amt > 0) status = 'paid';
        else if (paid > 0) status = 'partial';
        return {
          ...s,
          amount: amt,
          paid_amount: paid,
          remaining_due: remaining,
          payment_status: status
        };
      });

      const totalMembers = splits.length;
      const perPerson = totalMembers > 0 ? Math.round((entry.total_amount / totalMembers) * 100) / 100 : 0;
      
      const fullyPaidCount = splits.filter(s => s.payment_status === 'paid').length;
      const partialCount = splits.filter(s => s.payment_status === 'partial').length;
      const unpaidCount = splits.filter(s => s.payment_status === 'unpaid').length;
      const totalPaidAmount = splits.reduce((acc, s) => acc + s.paid_amount, 0);
      const totalRemainingAmount = Math.max(0, entry.total_amount - totalPaidAmount);

      return {
        ...entry,
        per_person: perPerson,
        member_count: totalMembers,
        paid_count: fullyPaidCount,
        partial_count: partialCount,
        unpaid_count: unpaidCount,
        paid_amount: totalPaidAmount,
        unpaid_amount: totalRemainingAmount,
        members: splits
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create weekly food entry with mid-week custom assignment support
router.post('/', (req, res) => {
  try {
    const {
      date = new Date().toISOString().slice(0, 10),
      week_label = '',
      title = 'Weekly Grocery & Mess',
      total_amount,
      member_ids = [],
      custom_shares = {}, // { "memberId": 1000 } for mid-week joiners
      notes = '',
      actor_name = 'Admin'
    } = req.body;

    const amount = Number(total_amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid total amount is required' });
    }

    if (!member_ids || member_ids.length === 0) {
      return res.status(400).json({ error: 'Please select at least one participating member' });
    }

    const month = date.slice(0, 7);

    const entryRes = db.prepare(`
      INSERT INTO weekly_food (date, week_label, month, title, total_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(date, week_label || `Week of ${date}`, month, title.trim(), amount, notes.trim());

    const foodId = entryRes.lastInsertRowid;
    const insertSplit = db.prepare(`
      INSERT INTO food_splits (food_id, member_id, amount, is_custom, custom_note)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Calculate splits with mid-week custom overrides
    let totalCustomAmount = 0;
    const customMemberSet = new Set();

    for (const memId of member_ids) {
      const customVal = custom_shares[memId];
      if (customVal !== undefined && customVal !== null && customVal !== '' && !isNaN(Number(customVal))) {
        totalCustomAmount += Number(customVal);
        customMemberSet.add(Number(memId));
      }
    }

    const remainingMembers = member_ids.filter(id => !customMemberSet.has(Number(id)));
    const remainingAmount = Math.max(0, amount - totalCustomAmount);
    const standardPerPerson = remainingMembers.length > 0 ? Math.round((remainingAmount / remainingMembers.length) * 100) / 100 : 0;

    for (const memId of member_ids) {
      const numId = Number(memId);
      if (customMemberSet.has(numId)) {
        const customAmt = Number(custom_shares[numId]);
        insertSplit.run(foodId, numId, customAmt, 1, 'Mid-week / custom assigned share');
      } else {
        insertSplit.run(foodId, numId, standardPerPerson, 0, null);
      }
    }

    logAudit('food_manager', null, actor_name, 'Added Food Expense', `Recorded weekly food "${title}" on ${date} (Rs. ${amount}, ${customMemberSet.size} custom mid-week shares)`);

    createNotification({
      title: `Weekly Mess Grocery: ${title}`,
      message: `Rs. ${amount.toLocaleString()} mess grocery recorded for ${date}. Share: Rs. ${standardPerPerson.toLocaleString()} per member.`,
      category: 'food',
      target_type: 'all',
      actor_name: actor_name || req.user?.name || 'Food Manager',
      data: { food_id: foodId, amount, date, standardPerPerson }
    });

    res.json({ success: true, id: foodId, standardPerPerson, memberCount: member_ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update weekly food entry
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      week_label,
      title,
      total_amount,
      member_ids,
      custom_shares = {},
      notes,
      actor_name = 'Admin'
    } = req.body;

    const current = db.prepare(`SELECT * FROM weekly_food WHERE id = ?`).get(id);
    if (!current) {
      return res.status(404).json({ error: 'Food entry not found' });
    }

    const newDate = date || current.date;
    const newMonth = newDate.slice(0, 7);
    const newAmount = total_amount !== undefined ? Number(total_amount) : current.total_amount;

    db.prepare(`
      UPDATE weekly_food SET
        date = ?,
        month = ?,
        week_label = COALESCE(?, week_label),
        title = COALESCE(?, title),
        total_amount = ?,
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(newDate, newMonth, week_label, title ? title.trim() : null, newAmount, notes, id);

    if (member_ids && member_ids.length > 0) {
      db.prepare(`DELETE FROM food_splits WHERE food_id = ?`).run(id);
      const insertSplit = db.prepare(`
        INSERT INTO food_splits (food_id, member_id, amount, is_custom, custom_note)
        VALUES (?, ?, ?, ?, ?)
      `);

      let totalCustomAmount = 0;
      const customMemberSet = new Set();
      for (const memId of member_ids) {
        const customVal = custom_shares[memId];
        if (customVal !== undefined && customVal !== null && customVal !== '' && !isNaN(Number(customVal))) {
          totalCustomAmount += Number(customVal);
          customMemberSet.add(Number(memId));
        }
      }

      const remainingMembers = member_ids.filter(mId => !customMemberSet.has(Number(mId)));
      const remainingAmount = Math.max(0, newAmount - totalCustomAmount);
      const standardPerPerson = remainingMembers.length > 0 ? Math.round((remainingAmount / remainingMembers.length) * 100) / 100 : 0;

      for (const memId of member_ids) {
        const numId = Number(memId);
        if (customMemberSet.has(numId)) {
          const customAmt = Number(custom_shares[numId]);
          insertSplit.run(id, numId, customAmt, 1, 'Mid-week / custom assigned share');
        } else {
          insertSplit.run(id, numId, standardPerPerson, 0, null);
        }
      }
    }

    logAudit('admin', null, actor_name, 'Updated Food Expense', `Updated food entry #${id} (Rs. ${newAmount})`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete weekly food entry
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const current = db.prepare(`SELECT * FROM weekly_food WHERE id = ?`).get(id);
    if (!current) {
      return res.status(404).json({ error: 'Food entry not found' });
    }

    db.prepare(`DELETE FROM food_splits WHERE food_id = ?`).run(id);
    db.prepare(`DELETE FROM weekly_food WHERE id = ?`).run(id);

    const actorName = req.body?.actor_name || req.query?.actor_name || 'Admin';
    logAudit('admin', null, actorName, 'Deleted Food Expense', `Deleted food entry "${current.title}" (${current.date})`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle member paid status for a specific weekly food split (Full toggle)
router.patch('/splits/:id/toggle-paid', (req, res) => {
  try {
    const { id } = req.params;
    const split = db.prepare(`
      SELECT fs.*, m.name as member_name, wf.title as food_title, wf.date as food_date
      FROM food_splits fs
      JOIN members m ON fs.member_id = m.id
      JOIN weekly_food wf ON fs.food_id = wf.id
      WHERE fs.id = ?
    `).get(id);

    if (!split) {
      return res.status(404).json({ error: 'Food split not found' });
    }

    const isCurrentlyPaid = split.is_paid === 1 && (split.paid_amount >= split.amount);
    const newPaid = isCurrentlyPaid ? 0 : 1;
    const newPaidAmount = newPaid === 1 ? split.amount : 0;
    const paidAt = newPaid === 1 ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE food_splits
      SET is_paid = ?, paid_amount = ?, paid_at = ?
      WHERE id = ?
    `).run(newPaid, newPaidAmount, paidAt, id);

    const actorName = req.body?.actor_name || req.user?.name || 'Admin';
    logAudit('admin', split.member_id, actorName, newPaid === 1 ? 'Marked Food Paid' : 'Marked Food Unpaid', `${split.member_name} marked ${newPaid === 1 ? 'PAID (Full)' : 'UNPAID'} for "${split.food_title}" (Rs. ${split.amount})`);

    res.json({
      success: true,
      split_id: id,
      is_paid: newPaid,
      paid_amount: newPaidAmount,
      remaining_due: newPaid === 1 ? 0 : split.amount,
      paid_at: paidAt,
      member_name: split.member_name,
      amount: split.amount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record partial payment or custom payment installment for weekly food split
router.post('/splits/:id/record-payment', (req, res) => {
  try {
    const { id } = req.params;
    const { amount_received, actor_name = 'Admin' } = req.body;

    const received = Number(amount_received);
    if (isNaN(received) || received <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const split = db.prepare(`
      SELECT fs.*, m.name as member_name, wf.title as food_title, wf.date as food_date
      FROM food_splits fs
      JOIN members m ON fs.member_id = m.id
      JOIN weekly_food wf ON fs.food_id = wf.id
      WHERE fs.id = ?
    `).get(id);

    if (!split) {
      return res.status(404).json({ error: 'Food split not found' });
    }

    const currentPaid = Number(split.paid_amount || (split.is_paid === 1 ? split.amount : 0));
    const newTotalPaid = Math.min(split.amount, currentPaid + received);
    const isFullyPaid = newTotalPaid >= split.amount ? 1 : 0;
    const paidAt = isFullyPaid ? new Date().toISOString() : split.paid_at;

    db.prepare(`
      UPDATE food_splits
      SET paid_amount = ?, is_paid = ?, paid_at = ?
      WHERE id = ?
    `).run(newTotalPaid, isFullyPaid, paidAt, id);

    const remainingDue = Math.max(0, split.amount - newTotalPaid);

    logAudit('admin', split.member_id, actor_name, 'Recorded Food Partial Payment', `Received Rs. ${received} from ${split.member_name} for "${split.food_title}" (Paid: Rs. ${newTotalPaid}/${split.amount}, Due: Rs. ${remainingDue})`);

    res.json({
      success: true,
      split_id: id,
      paid_amount: newTotalPaid,
      amount_received: received,
      remaining_due: remainingDue,
      is_paid: isFullyPaid,
      member_name: split.member_name,
      total_amount: split.amount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all members as paid for a weekly food batch
router.post('/:id/mark-all-paid', (req, res) => {
  try {
    const { id } = req.params;
    const current = db.prepare(`SELECT * FROM weekly_food WHERE id = ?`).get(id);
    if (!current) {
      return res.status(404).json({ error: 'Food entry not found' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE food_splits
      SET is_paid = 1, paid_amount = amount, paid_at = ?
      WHERE food_id = ? AND is_paid != 1
    `).run(now, id);

    const actorName = req.body?.actor_name || req.user?.name || 'Admin';
    logAudit('admin', null, actorName, 'Marked All Food Paid', `Marked all members as PAID for "${current.title}"`);

    res.json({ success: true, message: 'All members marked as paid' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
