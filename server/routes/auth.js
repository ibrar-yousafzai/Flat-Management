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

// Member Login (Accepts Member Name OR Unique ID OR Phone, with flexible passwords)
router.post('/member/login', (req, res) => {
  const identifier = (req.body.unique_id || req.body.identifier || req.body.name || '').trim();
  const password = (req.body.password || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please enter Member Name or ID, and Password' });
  }

  // 1. Try finding member by unique_id (e.g. FL4907, fl4907)
  let member = db.prepare(`
    SELECT m.*, r.name as room_name 
    FROM members m
    LEFT JOIN rooms r ON m.room_id = r.id
    WHERE UPPER(m.unique_id) = UPPER(?)
  `).get(identifier);

  // 2. If not found, try matching by exact name
  if (!member) {
    member = db.prepare(`
      SELECT m.*, r.name as room_name 
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE LOWER(m.name) = LOWER(?)
    `).get(identifier);
  }

  // 3. If not found, try phone / whatsapp or partial name match
  if (!member) {
    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    member = db.prepare(`
      SELECT m.*, r.name as room_name 
      FROM members m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE (m.whatsapp IS NOT NULL AND LENGTH(m.whatsapp) > 5 AND REPLACE(m.whatsapp, ' ', '') = ?)
         OR LOWER(m.name) LIKE LOWER(?)
      LIMIT 1
    `).get(cleanPhone || identifier, `%${identifier}%`);
  }

  if (!member) {
    return res.status(401).json({ error: 'Member not found. Please enter your valid Name or ID (e.g. Abbas Khan or FL4907)' });
  }

  // Check password flexibility: stored password, or their unique ID, or default 'flat123'
  const passLower = password.toLowerCase();
  const storedPassLower = (member.password || '').toLowerCase();
  const uniqueIdLower = (member.unique_id || '').toLowerCase();
  const phoneClean = (member.whatsapp || '').replace(/[^0-9]/g, '');

  const isPasswordValid = 
    passLower === storedPassLower ||
    passLower === uniqueIdLower ||
    passLower === 'flat123' ||
    (phoneClean && passLower === phoneClean);

  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Incorrect password. Try your Member ID (' + member.unique_id + ') or flat123' });
  }

  const token = createSession('member', member);
  const { password: _, ...memberData } = member;

  logAudit('member', member.id, member.name, 'Member Portal Login', `Member ${member.name} (${member.unique_id}) logged in`);

  res.json({
    success: true,
    token,
    userType: 'member',
    user: memberData
  });
});

// Verify Current Session / Me
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.user_type === 'admin') {
    let admin = null;
    try {
      admin = db.prepare(`SELECT * FROM admins WHERE id = ?`).get(req.user.user_id);
    } catch (e) {}

    const adminData = admin ? {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      can_manage_members: admin.can_manage_members,
      can_manage_rooms: admin.can_manage_rooms,
      can_manage_bills: admin.can_manage_bills,
      can_manage_food: admin.can_manage_food,
      can_manage_payments: admin.can_manage_payments,
      can_approve_payments: admin.can_approve_payments
    } : {
      id: req.user.user_id,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role || 'super_admin',
      ...(req.user.permissions || {})
    };

    return res.json({ userType: 'admin', user: adminData, token: req.user.token });
  } else {
    let member = null;
    try {
      member = db.prepare(`
        SELECT m.*, r.name as room_name 
        FROM members m
        LEFT JOIN rooms r ON m.room_id = r.id
        WHERE m.id = ? OR m.unique_id = ?
      `).get(req.user.user_id, req.user.username);
    } catch (e) {}

    const memberData = member ? member : {
      id: req.user.user_id,
      unique_id: req.user.username,
      name: req.user.name,
      type: 'Inside'
    };

    return res.json({ userType: 'member', user: memberData, token: req.user.token });
  }
});

module.exports = router;
