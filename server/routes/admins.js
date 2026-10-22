const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { requireSuperAdmin } = require('../middleware/auth');

// All admin management actions strictly require Super Admin authorization
router.use(requireSuperAdmin);

// Get all admins
router.get('/', (req, res) => {
  try {
    const admins = db.prepare(`
      SELECT id, username, name, role, 
             can_manage_members, can_manage_rooms, can_manage_bills, 
             can_manage_food, can_manage_payments, can_approve_payments, created_at 
      FROM admins
      ORDER BY role DESC, id ASC
    `).all();
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new admin (Super Admin only)
router.post('/', (req, res) => {
  try {
    const {
      username,
      password,
      name,
      role = 'admin',
      can_manage_members = 1,
      can_manage_rooms = 0,
      can_manage_bills = 1,
      can_manage_food = 1,
      can_manage_payments = 1,
      can_approve_payments = 0,
      actor_name = 'Super Admin'
    } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password and name are required' });
    }

    const existing = db.prepare(`SELECT id FROM admins WHERE username = ?`).get(username.trim());
    if (existing) {
      return res.status(400).json({ error: 'Admin username already exists' });
    }

    const info = db.prepare(`
      INSERT INTO admins (
        username, password, name, role, 
        can_manage_members, can_manage_rooms, can_manage_bills, 
        can_manage_food, can_manage_payments, can_approve_payments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username.trim(),
      password,
      name.trim(),
      role,
      can_manage_members ? 1 : 0,
      can_manage_rooms ? 1 : 0,
      can_manage_bills ? 1 : 0,
      can_manage_food ? 1 : 0,
      can_manage_payments ? 1 : 0,
      can_approve_payments ? 1 : 0
    );

    logAudit('super_admin', null, actor_name, 'Created Sub-Admin', `Created admin ${username} (${name}) with custom permissions`);

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update admin permissions & details
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      password,
      can_manage_members,
      can_manage_rooms,
      can_manage_bills,
      can_manage_food,
      can_manage_payments,
      can_approve_payments,
      actor_name = 'Super Admin'
    } = req.body;

    const admin = db.prepare(`SELECT * FROM admins WHERE id = ?`).get(id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (password) {
      db.prepare(`
        UPDATE admins SET 
          name = COALESCE(?, name),
          password = ?,
          can_manage_members = ?,
          can_manage_rooms = ?,
          can_manage_bills = ?,
          can_manage_food = ?,
          can_manage_payments = ?,
          can_approve_payments = ?
        WHERE id = ?
      `).run(
        name,
        password,
        can_manage_members !== undefined ? (can_manage_members ? 1 : 0) : admin.can_manage_members,
        can_manage_rooms !== undefined ? (can_manage_rooms ? 1 : 0) : admin.can_manage_rooms,
        can_manage_bills !== undefined ? (can_manage_bills ? 1 : 0) : admin.can_manage_bills,
        can_manage_food !== undefined ? (can_manage_food ? 1 : 0) : admin.can_manage_food,
        can_manage_payments !== undefined ? (can_manage_payments ? 1 : 0) : admin.can_manage_payments,
        can_approve_payments !== undefined ? (can_approve_payments ? 1 : 0) : admin.can_approve_payments,
        id
      );
    } else {
      db.prepare(`
        UPDATE admins SET 
          name = COALESCE(?, name),
          can_manage_members = ?,
          can_manage_rooms = ?,
          can_manage_bills = ?,
          can_manage_food = ?,
          can_manage_payments = ?,
          can_approve_payments = ?
        WHERE id = ?
      `).run(
        name,
        can_manage_members !== undefined ? (can_manage_members ? 1 : 0) : admin.can_manage_members,
        can_manage_rooms !== undefined ? (can_manage_rooms ? 1 : 0) : admin.can_manage_rooms,
        can_manage_bills !== undefined ? (can_manage_bills ? 1 : 0) : admin.can_manage_bills,
        can_manage_food !== undefined ? (can_manage_food ? 1 : 0) : admin.can_manage_food,
        can_manage_payments !== undefined ? (can_manage_payments ? 1 : 0) : admin.can_manage_payments,
        can_approve_payments !== undefined ? (can_approve_payments ? 1 : 0) : admin.can_approve_payments,
        id
      );
    }

    logAudit('super_admin', null, actor_name, 'Updated Admin Permissions', `Updated permissions for admin ${admin.username}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete admin
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const admin = db.prepare(`SELECT * FROM admins WHERE id = ?`).get(id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (admin.role === 'super_admin') {
      const superCount = db.prepare(`SELECT count(*) as count FROM admins WHERE role = 'super_admin'`).get().count;
      if (superCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only Super Admin' });
      }
    }

    db.prepare(`DELETE FROM admins WHERE id = ?`).run(id);
    logAudit('super_admin', null, 'Super Admin', 'Deleted Admin', `Deleted admin account ${admin.username}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
