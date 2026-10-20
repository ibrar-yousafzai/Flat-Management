const { db } = require('../db');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-session-token'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const session = db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token);
    if (session) {
      req.user = {
        ...session,
        permissions: session.permissions ? JSON.parse(session.permissions) : {}
      };
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
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

    // If logged in as member, strictly enforce own ID only
    const targetId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    if (String(req.user.user_id) !== String(targetId)) {
      return res.status(403).json({
        error: 'Security Violation: You are strictly forbidden from viewing or accessing other members records!'
      });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  requireAdmin,
  requireSuperAdmin,
  requireMemberSelf
};
