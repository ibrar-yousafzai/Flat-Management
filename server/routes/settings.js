const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { sendTestEmail } = require('../services/email');
const { requireSuperAdmin, requireAdmin } = require('../middleware/auth');

// Get all settings (masks sensitive SMTP passwords for non-super admins)
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM settings`).all();
    const settings = {};
    const isSuperAdmin = req.user?.role === 'super_admin';

    for (const r of rows) {
      // Hide sensitive SMTP pass from non-super admins
      if (r.key === 'smtp_pass' && !isSuperAdmin) {
        settings[r.key] = r.value ? '••••••••' : '';
      } else {
        settings[r.key] = r.value;
      }
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update global flat settings (Super Admin Only)
router.put('/', requireSuperAdmin, (req, res) => {
  try {
    const updates = req.body;
    const actor_name = req.user?.name || updates.actor_name || 'Super Admin';
    delete updates.actor_name;

    const upsert = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        // If password is sent as masked dots, do not overwrite
        if (key === 'smtp_pass' && value === '••••••••') continue;
        upsert.run(key, String(value !== undefined && value !== null ? value : ''));
      }
    });

    transaction(updates);

    logAudit('super_admin', req.user?.user_id || 1, actor_name, 'Updated Global Settings', `Updated banking, SMTP email, and system configuration`);

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test SMTP Configuration (Super Admin Only)
router.post('/test-smtp', requireSuperAdmin, async (req, res) => {
  try {
    const { test_email } = req.body;
    if (!test_email) {
      return res.status(400).json({ error: 'Recipient test email address is required' });
    }

    await sendTestEmail(test_email);
    logAudit('super_admin', req.user?.user_id || 1, req.user?.name || 'Super Admin', 'Tested SMTP Connection', `Sent test email to ${test_email}`);

    res.json({ success: true, message: `Test email sent successfully to ${test_email}!` });
  } catch (err) {
    console.error('SMTP test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sub-Admin Update Personal Password
router.post('/change-password', requireAdmin, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const adminId = req.user.user_id;

    const admin = db.prepare(`SELECT * FROM admins WHERE id = ?`).get(adminId);
    if (!admin || admin.password !== current_password) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (!new_password || new_password.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    db.prepare(`UPDATE admins SET password = ? WHERE id = ?`).run(new_password, adminId);
    logAudit('admin', adminId, admin.name, 'Changed Password', `Admin ${admin.username} changed their password`);

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
