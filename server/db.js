const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'flat_management.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrent reads/writes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    -- Admins table
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin', -- 'super_admin' or 'admin'
      can_manage_members INTEGER DEFAULT 1,
      can_manage_rooms INTEGER DEFAULT 1,
      can_manage_bills INTEGER DEFAULT 1,
      can_manage_food INTEGER DEFAULT 1,
      can_manage_payments INTEGER DEFAULT 1,
      can_approve_payments INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Flat Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Rooms table
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_rent REAL NOT NULL DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Room version history for past months freezing
    CREATE TABLE IF NOT EXISTS room_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      month TEXT NOT NULL, -- 'YYYY-MM'
      rent REAL NOT NULL,
      assigned_members TEXT, -- JSON array of member IDs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(room_id, month)
    );

    -- Members table
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_id TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      whatsapp TEXT,
      type TEXT NOT NULL DEFAULT 'Inside', -- 'Inside' or 'Outside'
      room_id INTEGER,
      status TEXT DEFAULT 'Active', -- 'Active' or 'Former'
      join_date TEXT NOT NULL, -- 'YYYY-MM-DD'
      leave_date TEXT,
      midmonth_rule TEXT DEFAULT 'days', -- 'days' or 'full'
      opening_balance REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
    );

    -- Member Room & Type History
    CREATE TABLE IF NOT EXISTS member_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      room_id INTEGER,
      effective_date TEXT NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    -- Monthly Bills table
    CREATE TABLE IF NOT EXISTS monthly_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL, -- 'YYYY-MM'
      title TEXT NOT NULL,
      category TEXT DEFAULT 'utility', -- 'rent', 'utility', 'salary', 'maintenance', 'other'
      total_amount REAL NOT NULL,
      split_type TEXT NOT NULL DEFAULT 'everyone', -- 'everyone', 'inside_only', 'by_room', 'pick_people'
      room_id INTEGER,
      attachment_url TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
    );

    -- Individual Bill Splits
    CREATE TABLE IF NOT EXISTS bill_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES monthly_bills(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(bill_id, member_id)
    );

    -- Weekly Food Expenses
    CREATE TABLE IF NOT EXISTS weekly_food (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL, -- 'YYYY-MM-DD'
      week_label TEXT,
      month TEXT NOT NULL, -- 'YYYY-MM'
      title TEXT NOT NULL,
      total_amount REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Weekly Food Splits
    CREATE TABLE IF NOT EXISTS food_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      is_custom INTEGER DEFAULT 0,
      custom_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (food_id) REFERENCES weekly_food(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(food_id, member_id)
    );

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_for TEXT NOT NULL DEFAULT 'bills', -- 'bills' (Rent/Utilities) or 'food' (Weekly Food mess)
      payment_method TEXT NOT NULL, -- 'cash', 'bank_transfer', 'jazzcash', 'easypaisa'
      payment_date TEXT NOT NULL, -- 'YYYY-MM-DD'
      bank_name TEXT,
      reference_no TEXT,
      note TEXT,
      receipt_url TEXT,
      submitted_by_type TEXT NOT NULL DEFAULT 'admin', -- 'admin' or 'member'
      submitted_by_id INTEGER,
      status TEXT NOT NULL DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
      admin_comment TEXT,
      reviewed_by_admin_id INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
    );

    -- Month Status (Draft vs Confirmed vs Closed)
    CREATE TABLE IF NOT EXISTS month_status (
      month TEXT PRIMARY KEY,
      status TEXT DEFAULT 'draft', -- 'draft', 'confirmed', 'closed'
      confirmed_by TEXT,
      confirmed_at DATETIME,
      closed_by TEXT,
      closed_at DATETIME
    );

    -- Monthly Carry-Forward (Arrears & Remaining Balance carried to next month)
    CREATE TABLE IF NOT EXISTS monthly_carry_forward (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL, -- The new month receiving the carried balance (e.g. '2024-11')
      from_month TEXT NOT NULL, -- The prior month from which it was carried (e.g. '2024-10')
      member_id INTEGER NOT NULL,
      amount REAL NOT NULL, -- Remaining unpaid balance from prior month
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(month, member_id)
    );

    -- Auth Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_type TEXT NOT NULL, -- 'admin' or 'member'
      user_id INTEGER NOT NULL,
      username TEXT,
      name TEXT,
      role TEXT,
      permissions TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_type TEXT NOT NULL, -- 'super_admin', 'admin', 'member', 'system'
      actor_id INTEGER,
      actor_name TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe schema migrations
  try {
    db.prepare(`ALTER TABLE payments ADD COLUMN payment_for TEXT DEFAULT 'bills'`).run();
  } catch (e) {
    // Column already exists
  }
  try {
    db.prepare(`ALTER TABLE food_splits ADD COLUMN is_custom INTEGER DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE food_splits ADD COLUMN custom_note TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE month_status ADD COLUMN closed_by TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE month_status ADD COLUMN closed_at DATETIME`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE month_status ADD COLUMN reopened_by TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE month_status ADD COLUMN reopened_at DATETIME`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE month_status ADD COLUMN reopen_reason TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE members ADD COLUMN security_deposit REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE members ADD COLUMN security_deposit_status TEXT DEFAULT 'Held'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE members ADD COLUMN security_deposit_notes TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE members ADD COLUMN settlement_status TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE members ADD COLUMN settlement_details TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE members ADD COLUMN settled_at DATETIME`).run();
  } catch (e) {}

  // Default settings
  const defaultSettings = [
    ['flat_name', 'Flat F-133-26'],
    ['active_month', '2024-10'],
    ['bank_name', 'Meezan Bank'],
    ['account_title', 'Flat Manager Account'],
    ['account_number', '0101-0105892341'],
    ['iban', 'PK36MEZN0001010105892341'],
    ['jazzcash_number', '0300-1234567'],
    ['jazzcash_title', 'Flat Manager'],
    ['easypaisa_number', '0345-1234567'],
    ['easypaisa_title', 'Flat Manager'],
    ['default_midmonth_rule', 'days'],
    ['currency_symbol', 'Rs.'],
    ['smtp_host', 'smtp.gmail.com'],
    ['smtp_port', '587'],
    ['smtp_secure', 'false'],
    ['smtp_user', ''],
    ['smtp_pass', ''],
    ['smtp_from', 'Flat Management <noreply@flatmanagement.com>'],
    ['whatsapp_country_code', '92'],
    ['monthly_bills_due_day', '10'],
    ['weekly_food_due_day', 'Sunday'],
    ['show_flat_totals_to_members', 'true'],
    ['session_timeout_minutes', '15']
  ];

  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  // Ensure default super admin exists
  const superAdmin = db.prepare(`SELECT * FROM admins WHERE username = 'superadmin'`).get();
  if (!superAdmin) {
    db.prepare(`
      INSERT INTO admins (username, password, name, role, can_manage_members, can_manage_rooms, can_manage_bills, can_manage_food, can_manage_payments, can_approve_payments)
      VALUES (?, ?, ?, 'super_admin', 1, 1, 1, 1, 1, 1)
    `).run('superadmin', 'admin123', 'Super Admin');
  }
}

// Audit logger helper
function logAudit(actorType, actorId, actorName, action, details, ip = '') {
  try {
    db.prepare(`
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(actorType, actorId || null, actorName || 'System', action, typeof details === 'object' ? JSON.stringify(details) : details, ip);
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = {
  db,
  initDatabase,
  logAudit
};
