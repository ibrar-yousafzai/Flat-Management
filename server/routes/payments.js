const express = require('express');
const router = express.Router();
const { db, logAudit, createNotification } = require('../db');
const {
  pushPaymentToSupabase,
  updatePaymentInSupabase,
  deletePaymentFromSupabase
} = require('../supabase');

// Get all payments (filterable by member_id, status, payment_for: 'all' | 'bills' | 'food')
router.get('/', (req, res) => {
  try {
    const { member_id, status, payment_for } = req.query;
    let query = `
      SELECT p.*, m.name as member_name, m.unique_id, m.whatsapp, m.email,
             a.name as reviewed_by_name, a.username as reviewed_by_username
      FROM payments p
      JOIN members m ON p.member_id = m.id
      LEFT JOIN admins a ON p.reviewed_by_admin_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (member_id) {
      query += ` AND p.member_id = ?`;
      params.push(member_id);
    }

    if (status && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (payment_for && payment_for !== 'all') {
      query += ` AND p.payment_for = ?`;
      params.push(payment_for);
    }

    query += ` ORDER BY CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END, p.payment_date DESC, p.id DESC`;
    const payments = db.prepare(query).all(...params);

    const pendingCount = db.prepare(`SELECT count(*) as count FROM payments WHERE status = 'pending'`).get().count;
    const foodPendingCount = db.prepare(`SELECT count(*) as count FROM payments WHERE status = 'pending' AND payment_for = 'food'`).get().count;

    res.json({
      payments,
      pendingCount,
      foodPendingCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin records a payment directly
router.post('/record', (req, res) => {
  try {
    const {
      member_id,
      amount,
      payment_for = 'bills', // 'bills' or 'food'
      payment_method = 'cash',
      payment_date = new Date().toISOString().slice(0, 10),
      bank_name = '',
      reference_no = '',
      note = '',
      receipt_url = '',
      admin_id = 1,
      admin_name = 'Admin',
      admin_comment = 'Confirmed by Admin'
    } = req.body;

    if (!member_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Member and valid amount are required' });
    }

    const member = db.prepare(`SELECT name, unique_id FROM members WHERE id = ?`).get(member_id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const info = db.prepare(`
      INSERT INTO payments (
        member_id, amount, payment_for, payment_method, payment_date, bank_name, reference_no, note, receipt_url,
        submitted_by_type, submitted_by_id, status, admin_comment, reviewed_by_admin_id, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, 'approved', ?, ?, CURRENT_TIMESTAMP)
    `).run(
      member_id,
      Number(amount),
      payment_for,
      payment_method,
      payment_date,
      bank_name.trim(),
      reference_no.trim(),
      note.trim(),
      receipt_url,
      admin_id,
      admin_comment,
      admin_id
    );

    logAudit('admin', admin_id, admin_name, 'Recorded Payment', `Recorded Rs. ${amount} (${payment_for.toUpperCase()}) for ${member.name} (${member.unique_id}) via ${payment_method}`);

    // Sync recorded payment to Supabase
    (async () => {
      const cloudPayment = await pushPaymentToSupabase({
        member_id,
        amount,
        payment_for,
        payment_method,
        payment_date,
        bank_name,
        reference_no,
        note,
        status: 'approved'
      });
      if (cloudPayment?.id) {
        db.prepare('UPDATE payments SET supabase_id = ? WHERE id = ?').run(cloudPayment.id, info.lastInsertRowid);
      }
    })().catch(e => console.error('Supabase payment record error:', e.message));

    createNotification({
      title: `Payment Received & Credited`,
      message: `Admin recorded payment of Rs. ${Number(amount).toLocaleString()} for ${payment_for === 'food' ? 'Weekly Food Mess' : 'Monthly Bills'}.`,
      category: 'payment',
      target_type: 'member',
      target_id: Number(member_id),
      actor_name: admin_name,
      data: { amount, payment_for, payment_id: info.lastInsertRowid }
    });

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Member submits a payment for admin approval
router.post('/submit', (req, res) => {
  try {
    const {
      member_id,
      amount,
      payment_for = 'bills', // 'bills' (Rent/Utilities) or 'food' (Weekly Food mess)
      payment_method = 'bank_transfer',
      payment_date = new Date().toISOString().slice(0, 10),
      bank_name = '',
      reference_no = '',
      note = '',
      receipt_url = ''
    } = req.body;

    if (!member_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const member = db.prepare(`SELECT name, unique_id FROM members WHERE id = ?`).get(member_id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const info = db.prepare(`
      INSERT INTO payments (
        member_id, amount, payment_for, payment_method, payment_date, bank_name, reference_no, note, receipt_url,
        submitted_by_type, submitted_by_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'member', ?, 'pending')
    `).run(
      member_id,
      Number(amount),
      payment_for,
      payment_method,
      payment_date,
      bank_name.trim(),
      reference_no.trim(),
      note.trim(),
      receipt_url,
      member_id
    );

    logAudit('member', member_id, member.name, 'Submitted Payment', `Member submitted Rs. ${amount} for ${payment_for.toUpperCase()} via ${payment_method} for approval`);

    // Sync claimed payment to Supabase
    (async () => {
      const cloudPayment = await pushPaymentToSupabase({
        member_id,
        amount,
        payment_for,
        payment_method,
        payment_date,
        bank_name,
        reference_no,
        note,
        status: 'pending'
      });
      if (cloudPayment?.id) {
        db.prepare('UPDATE payments SET supabase_id = ? WHERE id = ?').run(cloudPayment.id, info.lastInsertRowid);
      }
    })().catch(e => console.error('Supabase payment submit error:', e.message));

    createNotification({
      title: `New Payment Claim Submitted`,
      message: `${member.name} (${member.unique_id}) submitted Rs. ${Number(amount).toLocaleString()} for ${payment_for === 'food' ? 'Weekly Food Mess' : 'Monthly Bills'}.`,
      category: 'payment',
      target_type: 'admin',
      actor_name: member.name,
      data: { payment_id: info.lastInsertRowid, amount, member_id, payment_for }
    });

    res.json({
      success: true,
      id: info.lastInsertRowid,
      message: `Payment claim for ${payment_for === 'food' ? 'Weekly Food Mess' : 'Monthly Bills'} submitted successfully! Waiting for Admin verification.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit an existing payment record
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      payment_for,
      payment_method,
      payment_date,
      bank_name,
      reference_no,
      note,
      status,
      admin_comment,
      admin_name = 'Admin'
    } = req.body;

    const payment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    db.prepare(`
      UPDATE payments SET
        amount = COALESCE(?, amount),
        payment_for = COALESCE(?, payment_for),
        payment_method = COALESCE(?, payment_method),
        payment_date = COALESCE(?, payment_date),
        bank_name = COALESCE(?, bank_name),
        reference_no = COALESCE(?, reference_no),
        note = COALESCE(?, note),
        status = COALESCE(?, status),
        admin_comment = COALESCE(?, admin_comment)
      WHERE id = ?
    `).run(
      amount !== undefined ? Number(amount) : null,
      payment_for,
      payment_method,
      payment_date,
      bank_name,
      reference_no,
      note,
      status,
      admin_comment,
      id
    );

    logAudit('admin', null, admin_name, 'Edited Payment', `Updated payment #${id} (Rs. ${amount || payment.amount}, ${payment_for || payment.payment_for})`);

    // Sync updated payment to Supabase
    (async () => {
      if (payment.supabase_id) {
        await updatePaymentInSupabase(payment.supabase_id, {
          amount,
          note,
          bank_name,
          reference_no,
          status
        });
      }
    })().catch(e => console.error('Supabase payment edit error:', e.message));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin approves a pending payment
router.post('/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id = 1, admin_name = 'Admin', admin_comment = 'Verified and approved' } = req.body;

    const payment = db.prepare(`
      SELECT p.*, m.name as member_name, m.unique_id
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE p.id = ?
    `).get(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    db.prepare(`
      UPDATE payments SET
        status = 'approved',
        admin_comment = ?,
        reviewed_by_admin_id = ?,
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(admin_comment.trim(), admin_id, id);

    logAudit('admin', admin_id, admin_name, 'Approved Payment', `Approved payment #${id} of Rs. ${payment.amount} for ${payment.member_name} (${payment.unique_id}). Comment: ${admin_comment}`);

    // Sync approved payment to Supabase
    (async () => {
      if (payment.supabase_id) {
        await updatePaymentInSupabase(payment.supabase_id, { status: 'approved' });
      } else {
        const cloudPayment = await pushPaymentToSupabase({
          member_id: payment.member_id,
          amount: payment.amount,
          payment_for: payment.payment_for,
          payment_method: payment.payment_method,
          payment_date: payment.payment_date,
          bank_name: payment.bank_name,
          reference_no: payment.reference_no,
          note: payment.note,
          status: 'approved'
        });
        if (cloudPayment?.id) {
          db.prepare('UPDATE payments SET supabase_id = ? WHERE id = ?').run(cloudPayment.id, id);
        }
      }
    })().catch(e => console.error('Supabase payment approve error:', e.message));

    createNotification({
      title: `Payment Approved & Credited`,
      message: `Your payment of Rs. ${Number(payment.amount).toLocaleString()} for ${payment.payment_for === 'food' ? 'Weekly Food Mess' : 'Monthly Bills'} has been approved and credited!`,
      category: 'payment',
      target_type: 'member',
      target_id: payment.member_id,
      actor_name: admin_name,
      data: { payment_id: id, amount: payment.amount, payment_for: payment.payment_for }
    });

    res.json({ success: true, message: 'Payment approved and credited to member balance.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin rejects a pending payment with required comment
router.post('/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id = 1, admin_name = 'Admin', admin_comment } = req.body;

    if (!admin_comment || !admin_comment.trim()) {
      return res.status(400).json({ error: 'Rejection reason/comment is required so the member knows why it was rejected.' });
    }

    const payment = db.prepare(`
      SELECT p.*, m.name as member_name, m.unique_id
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE p.id = ?
    `).get(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    db.prepare(`
      UPDATE payments SET
        status = 'rejected',
        admin_comment = ?,
        reviewed_by_admin_id = ?,
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(admin_comment.trim(), admin_id, id);

    logAudit('admin', admin_id, admin_name, 'Rejected Payment', `Rejected payment #${id} of Rs. ${payment.amount} for ${payment.member_name}. Reason: ${admin_comment}`);

    // Sync rejection to Supabase
    (async () => {
      if (payment.supabase_id) {
        await updatePaymentInSupabase(payment.supabase_id, { status: 'pending' });
      }
    })().catch(e => console.error('Supabase payment reject error:', e.message));

    createNotification({
      title: `Payment Claim Rejected`,
      message: `Your payment claim of Rs. ${Number(payment.amount).toLocaleString()} was rejected: "${admin_comment.trim()}".`,
      category: 'payment',
      target_type: 'member',
      target_id: payment.member_id,
      actor_name: admin_name,
      data: { payment_id: id, amount: payment.amount, reason: admin_comment }
    });

    res.json({ success: true, message: 'Payment rejected with explanation comment.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a payment
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { admin_name = 'Admin', reason = '' } = req.body;

    const payment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    db.prepare(`DELETE FROM payments WHERE id = ?`).run(id);

    // Sync deletion to Supabase
    if (payment.supabase_id) {
      deletePaymentFromSupabase(payment.supabase_id).catch(e => console.error('Supabase payment delete error:', e.message));
    }

    logAudit(
      'admin',
      req.user?.user_id || null,
      admin_name,
      'Voided / Corrected Payment',
      `Voided payment #${id}: Member #${payment.member_id}, Amount: Rs. ${payment.amount}, Category: ${payment.payment_for}, Date: ${payment.payment_date}. Correction Reason: ${reason || 'Admin Adjustment'}`
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
