const { db, initDatabase, logAudit } = require('./db');

function seedDatabase() {
  initDatabase();

  // Ensure flat_name is clean
  try {
    db.prepare(`UPDATE settings SET value = 'Flat Management System' WHERE key = 'flat_name' AND value LIKE '%133%'`).run();
  } catch (e) {}

  // No dummy bills, food or payments are inserted. User enters all records manually.
}

module.exports = { seedDatabase };
