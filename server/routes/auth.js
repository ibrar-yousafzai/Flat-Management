const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, logAudit } = require('../db');
const { signToken } = require('../middleware/auth');

function createSession(userType, user) {
  const permissions = userType === 'admin' ? {
    can_manage_members: user.can_manage_members,
    can_manage_rooms: user.can_manage_rooms,
    can_manage_bills: user.can_manage_bills,
    can_manage_food: user.can_manage_food,
    can_manage_payments: user.can_manage_payments,
    can_approve_payments: user.can_approve_payments
  } : null;

  const payload = {
    user_type: userType,
    user_id: user.id,
    username: userType === 'admin' ? user.username : user.unique_id,
    name: user.name,
    role: userType === 'admin' ? user.role : 'member',
    permissions,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  const token = signToken(payload);

  try {
    db.prepare(`
      INSERT OR REPLACE INTO sessions (token, user_type, user_id, username, name, role, permissions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      token,
      userType,
      user.id,
      userType === 'admin' ? user.username : user.unique_id,
      user.name,
      userType === 'admin' ? user.role : 'member',
      permissions ? JSON.stringify(permissions) : null
    );
  } catch (e) {}

  return token;
}

// Admin Login
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const admin = db.prepare(`SELECT * FROM admins WHERE username = ?`).get(username.trim());
  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = createSession('admin', admin);
  const { password: _, ...adminData } = admin;

  logAudit('admin', admin.id, admin.name, 'Admin Login', `Admin ${admin.username} logged in`);

  res.json({
    success: true,
    token,
    userType: 'admin',
    user: adminData
  });
});

// Member Login
router.post('/member/login', (req, res) => {
  const { unique_id, password } = req.body;
  if (!unique_id || !password) {
    return res.status(400).json({ error: 'Unique ID and password are required' });
  }

  const member = db.prepare(`
    SELECT m.*, r.name as room_name 
    FROM members m
    LEFT JOIN rooms r ON m.room_id = r.id
    WHERE m.unique_id = ?
  `).get(unique_id.trim().toUpperCase());

  if (!member || member.password !== password) {
    return res.status(401).json({ error: 'Invalid Member ID or Password' });
  }

  const token = createSession('member', member);
  const { password: _, ...memberData } = member;

  logAudit('member', member.id, member.name, 'Member Portal Login', `Member ${member.unique_id} logged in`);

  res.json({
    success: true,
    token,
    userType: 'member',
    user: memberData
  });
});

// Verify Current Session / Me
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-session-token'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const session = db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token);
  if (!session) return res.status(401).json({ error: 'Session expired' });

  if (session.user_type === 'admin') {
    const admin = db.prepare(`SELECT * FROM admins WHERE id = ?`).get(session.user_id);
    if (!admin) return res.status(401).json({ error: 'User not found' });
    const { password: _, ...data } = admin;
    return res.json({ userType: 'admin', user: data, token });
  } else {
    const member = db.prepare(`
      SELECT m.*, r.name as room_name 
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE m.id = ?
    `).get(session.user_id);
    if (!member) return res.status(401).json({ error: 'Member not found' });
    const { password: _, ...data } = member;
    return res.json({ userType: 'member', user: data, token });
  }
});

module.exports = router;
