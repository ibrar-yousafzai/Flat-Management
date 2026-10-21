const crypto = require('crypto');
const { db } = require('../db');

// Stable session secret across serverless cold starts
const SESSION_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SESSION_SECRET || 'flat-management-secure-secret-2026';

function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-session-token'] || req.query.token || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    req.user = null;
    return next();
  }

  // 1. Try local SQLite sessions table
  try {
    const session = db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token);
    if (session) {
      req.user = {
        ...session,
        permissions: session.permissions ? (typeof session.permissions === 'string' ? JSON.parse(session.permissions) : session.permissions) : {}
      };
      return next();
    }
  } catch (err) {}

  // 2. Stateless HMAC fallback (Critical for Vercel Serverless cold starts)
  const payload = verifyToken(token);
  if (payload) {
    req.user = {
      token,
      user_type: payload.user_type,
      user_id: payload.user_id,
      username: payload.username,
      name: payload.name,
      role: payload.role,
      permissions: payload.permissions || {}
    };

    // Re-insert into local /tmp SQLite database so subsequent queries hit cache
    try {
      db.prepare(`
        INSERT OR IGNORE INTO sessions (token, user_type, user_id, username, name, role, permissions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        token,
        payload.user_type,
        payload.user_id,
        payload.username,
        payload.name,
        payload.role,
        payload.permissions ? JSON.stringify(payload.permissions) : null
      );
    } catch (e) {}

    return next();
  }

  req.user = null;
  next();
}

// Guard: Require Admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin credentials required' });
  }
  next();
}

// Guard: Require Super Admin
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.user_type !== 'admin' || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied: Super Admin privilege required' });
  }
  next();
}

// Guard: Strict Member Privacy & Isolation
function requireMemberSelf(paramName = 'memberId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins have access to member files
    if (req.user.user_type === 'admin') {
      return next();
    }

    // If logged in as member, strictly enforce own ID or own code only
    let targetId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    if (!targetId || targetId === 'self' || targetId === 'me') {
      req.params[paramName] = req.user.user_id;
      return next();
    }

    const isOwnId = String(req.user.user_id) === String(targetId);
    const isOwnCode = req.user.username && String(req.user.username).toUpperCase() === String(targetId).toUpperCase();

    if (!isOwnId && !isOwnCode) {
      return res.status(403).json({
        error: 'Security Violation: You are strictly forbidden from viewing or accessing other members records!'
      });
    }

    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  authMiddleware,
  requireAdmin,
  requireSuperAdmin,
  requireMemberSelf
};
