const { db, initDatabase, logAudit } = require('./db');
const fs = require('fs');
const path = require('path');

function seedDatabase() {
  initDatabase();

  const memberCount = db.prepare('SELECT count(*) as count FROM members').get().count;
  if (memberCount > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding initial Flat F-133-26 data...');

  // 1. Create Default Rooms
  const insertRoom = db.prepare(`INSERT INTO rooms (name, base_rent, description) VALUES (?, ?, ?)`);
  const r1 = insertRoom.run('Room 1', 25000, 'Master Bedroom (Shared by 2)').lastInsertRowid;
  const r2 = insertRoom.run('Room 2', 25000, 'Second Bedroom').lastInsertRowid;
  const r3 = insertRoom.run('Room 3', 25000, 'Third Bedroom').lastInsertRowid;

  // 2. Initial Member List with generated unique IDs & passwords
  const membersData = [
    { name: 'Murad', unique_id: 'MEM-001', pass: 'flat123', type: 'Inside', room_id: r1, phone: '03001234001', email: 'murad@example.com', join_date: '2024-02-01' },
    { name: 'Shah G', unique_id: 'MEM-002', pass: 'flat123', type: 'Inside', room_id: r1, phone: '03001234002', email: 'shahg@example.com', join_date: '2024-02-01' },
    { name: 'Izaz', unique_id: 'MEM-003', pass: 'flat123', type: 'Inside', room_id: r2, phone: '03001234003', email: 'izaz@example.com', join_date: '2024-02-01' },
    { name: 'Wasim', unique_id: 'MEM-004', pass: 'flat123', type: 'Inside', room_id: r2, phone: '03001234004', email: 'wasim@example.com', join_date: '2024-02-01' },
    { name: 'Saif', unique_id: 'MEM-005', pass: 'flat123', type: 'Inside', room_id: r2, phone: '03001234005', email: 'saif@example.com', join_date: '2024-02-01' },
    { name: 'Ibrar', unique_id: 'MEM-006', pass: 'flat123', type: 'Inside', room_id: r3, phone: '03001234006', email: 'ibrar@example.com', join_date: '2024-02-01' },
    { name: 'Arman', unique_id: 'MEM-007', pass: 'flat123', type: 'Inside', room_id: r3, phone: '03001234007', email: 'arman@example.com', join_date: '2024-04-01' },
    { name: 'Jibran', unique_id: 'MEM-008', pass: 'flat123', type: 'Inside', room_id: r3, phone: '03001234008', email: 'jibran@example.com', join_date: '2024-06-01' },
    { name: 'Shareef', unique_id: 'MEM-009', pass: 'flat123', type: 'Outside', room_id: null, phone: '03001234009', email: 'shareef@example.com', join_date: '2024-02-01' },
    { name: 'Hamza', unique_id: 'MEM-010', pass: 'flat123', type: 'Inside', room_id: r2, phone: '03001234010', email: 'hamza@example.com', join_date: '2024-08-01' },
    { name: 'Abbas', unique_id: 'MEM-011', pass: 'flat123', type: 'Inside', room_id: r3, phone: '03001234011', email: 'abbas@example.com', join_date: '2024-09-01' },
    { name: 'Yasin', unique_id: 'MEM-012', pass: 'flat123', type: 'Outside', room_id: null, phone: '03001234012', email: 'yasin@example.com', join_date: '2024-08-01' }
  ];

  const insertMember = db.prepare(`
    INSERT INTO members (unique_id, password, name, email, whatsapp, type, room_id, status, join_date, midmonth_rule, opening_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, 'days', 0)
  `);

  const memberMap = {};
  for (const m of membersData) {
    const res = insertMember.run(m.unique_id, m.pass, m.name, m.email, m.phone, m.type, m.room_id, m.join_date);
    memberMap[m.name.toLowerCase()] = res.lastInsertRowid;
  }

  // 3. Create Sample Sub-Admins to demonstrate multi-admin system
  db.prepare(`
    INSERT OR IGNORE INTO admins (username, password, name, role, can_manage_members, can_manage_rooms, can_manage_bills, can_manage_food, can_manage_payments, can_approve_payments)
    VALUES (?, ?, ?, 'admin', 1, 0, 1, 1, 1, 0)
  `).run('manager', 'pass123', 'Flat Assistant Manager');

  // Dedicated Weekly Food Manager (Only manages food & food payments/approvals)
  db.prepare(`
    INSERT OR IGNORE INTO admins (username, password, name, role, can_manage_members, can_manage_rooms, can_manage_bills, can_manage_food, can_manage_payments, can_approve_payments)
    VALUES (?, ?, ?, 'admin', 0, 0, 0, 1, 1, 1)
  `).run('foodmanager', 'food123', 'Weekly Food Manager');

  // 4. Seed Monthly Bills for historical months
  const monthsData = [
    {
      month: '2024-08',
      bills: [
        { title: 'Rent', category: 'rent', total_amount: 75000, split_type: 'inside_only' },
        { title: 'Wifi Internet', category: 'utility', total_amount: 3758, split_type: 'everyone' },
        { title: 'Cook Salary', category: 'salary', total_amount: 25000, split_type: 'everyone' },
        { title: 'Electricity Bill (August)', category: 'utility', total_amount: 22191, split_type: 'everyone' }
      ]
    },
    {
      month: '2024-09',
      bills: [
        { title: 'Rent', category: 'rent', total_amount: 75000, split_type: 'inside_only' },
        { title: 'Wifi Internet', category: 'utility', total_amount: 3758, split_type: 'everyone' },
        { title: 'Cook Salary', category: 'salary', total_amount: 25000, split_type: 'everyone' },
        { title: 'Electricity Bill (September)', category: 'utility', total_amount: 20264, split_type: 'everyone' }
      ]
    },
    {
      month: '2024-10',
      bills: [
        { title: 'Rent', category: 'rent', total_amount: 75000, split_type: 'inside_only' },
        { title: 'Wifi Internet', category: 'utility', total_amount: 3800, split_type: 'everyone' },
        { title: 'Cook Salary', category: 'salary', total_amount: 26000, split_type: 'everyone' },
        { title: 'Electricity Bill', category: 'utility', total_amount: 18450, split_type: 'everyone' }
      ]
    }
  ];

  const insertBill = db.prepare(`
    INSERT INTO monthly_bills (month, title, category, total_amount, split_type, room_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBillSplit = db.prepare(`
    INSERT INTO bill_splits (bill_id, member_id, amount) VALUES (?, ?, ?)
  `);

  for (const m of monthsData) {
    for (const b of m.bills) {
      const billRes = insertBill.run(m.month, b.title, b.category, b.total_amount, b.split_type, null, 'Auto generated bill');
      const billId = billRes.lastInsertRowid;

      // Calculate splits
      let eligible = [];
      if (b.split_type === 'everyone') {
        eligible = db.prepare(`SELECT id FROM members WHERE status = 'Active'`).all();
      } else if (b.split_type === 'inside_only') {
        eligible = db.prepare(`SELECT id FROM members WHERE status = 'Active' AND type = 'Inside'`).all();
      }

      if (eligible.length > 0) {
        const splitAmount = Math.round((b.total_amount / eligible.length) * 100) / 100;
        for (const mem of eligible) {
          insertBillSplit.run(billId, mem.id, splitAmount);
        }
      }
    }
  }

  // 5. Seed Weekly Food
  const insertFood = db.prepare(`
    INSERT INTO weekly_food (date, week_label, month, title, total_amount, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertFoodSplit = db.prepare(`
    INSERT INTO food_splits (food_id, member_id, amount) VALUES (?, ?, ?)
  `);

  const foodWeek1 = insertFood.run('2024-10-07', 'Week 1 - Oct', '2024-10', 'Grocery, Meat & Vegetables', 12500, 'Weekly flat food').lastInsertRowid;
  const foodMembers = db.prepare(`SELECT id FROM members WHERE status = 'Active' LIMIT 8`).all();
  const perPerson = Math.round((12500 / foodMembers.length) * 100) / 100;
  for (const fm of foodMembers) {
    insertFoodSplit.run(foodWeek1, fm.id, perPerson);
  }

  // 6. Seed Sample Payments (including pending approval)
  const insertPayment = db.prepare(`
    INSERT INTO payments (member_id, amount, payment_method, payment_date, bank_name, reference_no, note, submitted_by_type, submitted_by_id, status, admin_comment, reviewed_by_admin_id, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Approved payments
  const muradId = memberMap['murad'] || 1;
  const shahgId = memberMap['shah g'] || 2;
  const armanId = memberMap['arman'] || 7;

  insertPayment.run(muradId, 17500, 'bank_transfer', '2024-10-05', 'Meezan Bank', 'TXN-984210', 'Rent & Bills paid via online transfer', 'admin', 1, 'approved', 'Confirmed received in Meezan flat account', 1, '2024-10-05 14:00:00');
  insertPayment.run(shahgId, 18000, 'cash', '2024-10-06', '', 'RECEIPT-041', 'Paid cash to manager', 'admin', 1, 'approved', 'Cash deposited into flat cashbox', 1, '2024-10-06 18:30:00');

  // Pending approval payment submitted by member
  insertPayment.run(armanId, 15000, 'jazzcash', '2024-10-18', 'JazzCash', 'JC-8823190', 'Paid October rent and grocery share', 'member', armanId, 'pending', null, null, null);

  logAudit('system', 1, 'System', 'Initial Seed Completed', 'Seeded initial rooms, members, bills, food and payments from Flat F-133-26 records');
  console.log('Seeding successfully completed!');
}

module.exports = { seedDatabase };
