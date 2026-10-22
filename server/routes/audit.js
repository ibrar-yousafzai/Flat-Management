const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// Get audit logs (Admins only)
router.get('/', requireAdmin, (req, res) => {
  try {
    const { limit = 100, actor_type } = req.query;
    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];

    if (actor_type) {
      query += ` AND actor_type = ?`;
      params.push(actor_type);
    }

    query += ` ORDER BY id DESC LIMIT ?`;
    params.push(Number(limit));

    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
