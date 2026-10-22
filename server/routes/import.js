const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { db, logAudit } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// Require Admin authorization for all Excel data imports
router.use(requireAdmin);

// Use memoryStorage for cloud/serverless compatibility (e.g. Vercel read-only filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Helper to normalize member name
function cleanName(name) {
  if (!name) return '';
  return name.toString().trim().replace(/\s+/g, ' ');
}

// 1. One-click endpoint to import the user's specific Desktop Excel file
router.post('/import-desktop-excel', (req, res) => {
  try {
    const desktopFilePath = path.join(__dirname, '../../../Expenses F-133-26 update.xlsx');
    if (!fs.existsSync(desktopFilePath)) {
      return res.status(404).json({ error: 'Expenses F-133-26 update.xlsx not found on Desktop' });
    }

    const workbook = xlsx.readFile(desktopFilePath);
    const result = processWorkbook(workbook);

    logAudit('admin', null, req.body.actor_name || 'Admin', 'Imported Excel File', `Imported historical data from Expenses F-133-26 update.xlsx (${result.monthsImported} months, ${result.billsCount} bills)`);

    res.json({
      success: true,
      message: 'Successfully imported historical data from Expenses F-133-26 update.xlsx!',
      details: result
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Generic File Upload endpoint for any Excel file
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = req.file.buffer
      ? xlsx.read(req.file.buffer, { type: 'buffer' })
      : xlsx.readFile(req.file.path);

    const result = processWorkbook(workbook);

    // Clean up uploaded temp file if on disk
    if (req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    logAudit('admin', null, req.body.actor_name || 'Admin', 'Uploaded Excel File', `Processed uploaded Excel (${result.monthsImported} months)`);

    res.json({
      success: true,
      message: 'Excel file processed successfully!',
      details: result
    });
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    console.error('Upload process error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Parser engine that understands monthly sheets and Details sheet
function processWorkbook(workbook) {
  const monthMap = {
    'feb': '2024-02',
    'february': '2024-02',
    'march': '2024-03',
    'mar': '2024-03',
    'april': '2024-04',
    'apr': '2024-04',
    'may': '2024-05',
    'jun': '2024-06',
    'june': '2024-06',
    'july': '2024-07',
    'jul': '2024-07',
    'august': '2024-08',
    'aug': '2024-08',
    'sept': '2024-09',
    'sep': '2024-09',
    'september': '2024-09'
  };

  let monthsImported = 0;
  let billsCount = 0;

  // Ensure default rooms exist
  const getRoom = (name, rent) => {
    let r = db.prepare(`SELECT * FROM rooms WHERE name = ?`).get(name);
    if (!r) {
      const info = db.prepare(`INSERT INTO rooms (name, base_rent) VALUES (?, ?)`).run(name, rent || 25000);
      r = { id: info.lastInsertRowid, name, base_rent: rent || 25000 };
    }
    return r;
  };

  const r1 = getRoom('Room 1', 25000);
  const r2 = getRoom('Room 2', 25000);
  const r3 = getRoom('Room 3', 25000);

  // Helper to ensure member exists
  const getOrCreateMember = (name, room = null, type = 'Inside') => {
    const clean = cleanName(name);
    if (!clean) return null;
    let m = db.prepare(`SELECT * FROM members WHERE lower(name) = ?`).get(clean.toLowerCase());
    if (!m) {
      const count = db.prepare(`SELECT count(*) as c FROM members`).get().c + 1;
      const uid = `MEM-${String(count).padStart(3, '0')}`;
      const info = db.prepare(`
        INSERT INTO members (unique_id, password, name, type, room_id, status, join_date)
        VALUES (?, 'flat123', ?, ?, ?, 'Active', '2024-02-01')
      `).run(uid, clean, type, room ? room.id : null);
      m = { id: info.lastInsertRowid, name: clean, unique_id: uid };
    }
    return m;
  };

  // Known members mapped to rooms
  getOrCreateMember('Murad', r1, 'Inside');
  getOrCreateMember('Shah G', r1, 'Inside');
  getOrCreateMember('Izaz', r2, 'Inside');
  getOrCreateMember('Wasim', r2, 'Inside');
  getOrCreateMember('Saif', r2, 'Inside');
  getOrCreateMember('Ibrar', r3, 'Inside');
  getOrCreateMember('Arman', r3, 'Inside');
  getOrCreateMember('Shareef', null, 'Outside');
  getOrCreateMember('Yasin', null, 'Outside');

  for (const sheetName of workbook.SheetNames) {
    const normalizedKey = sheetName.trim().toLowerCase();
    const yearMonth = monthMap[normalizedKey];

    if (yearMonth) {
      monthsImported++;
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 'A', raw: true, defval: null });

      // Scan rows for expense line items
      for (const row of rows) {
        const item = (row['A'] || row['B'] || '').toString().trim().toUpperCase();
        let amount = parseFloat(row['B'] || row['C'] || 0);

        if (isNaN(amount) || amount <= 0) continue;

        let category = 'utility';
        let splitType = 'everyone';
        let title = '';

        if (item.includes('RENT')) {
          category = 'rent';
          title = 'Flat Rent';
          splitType = 'inside_only';
        } else if (item.includes('WIFI')) {
          category = 'utility';
          title = 'WiFi Internet';
          splitType = 'everyone';
        } else if (item.includes('COOK') || item.includes('SALARY')) {
          category = 'salary';
          title = 'Cook Salary';
          splitType = 'everyone';
        } else if (item.includes('ELECTRICITY')) {
          category = 'utility';
          title = 'Electricity Bill';
          splitType = 'everyone';
        } else if (item.includes('WASHING')) {
          category = 'utility';
          title = 'Washing Machine';
          splitType = 'everyone';
        } else if (item.includes('MAINTAINANCE') || item.includes('MAINTENANCE')) {
          category = 'maintenance';
          title = 'Flat Maintenance';
          splitType = 'everyone';
        } else if (item.includes('MILK') || item.includes('WATER')) {
          category = 'utility';
          title = 'Milk / Water';
          splitType = 'everyone';
        }

        if (title) {
          // Check if bill exists
          let bill = db.prepare(`SELECT * FROM monthly_bills WHERE month = ? AND title = ?`).get(yearMonth, title);
          if (!bill) {
            const billRes = db.prepare(`
              INSERT INTO monthly_bills (month, title, category, total_amount, split_type)
              VALUES (?, ?, ?, ?, ?)
            `).run(yearMonth, title, category, amount, splitType);

            billsCount++;
            const billId = billRes.lastInsertRowid;

            // Generate splits
            let members = [];
            if (splitType === 'everyone') {
              members = db.prepare(`SELECT id FROM members WHERE status = 'Active'`).all();
            } else if (splitType === 'inside_only') {
              members = db.prepare(`SELECT id FROM members WHERE status = 'Active' AND type = 'Inside'`).all();
            }

            if (members.length > 0) {
              const perMem = Math.round((amount / members.length) * 100) / 100;
              const insSplit = db.prepare(`INSERT OR IGNORE INTO bill_splits (bill_id, member_id, amount) VALUES (?, ?, ?)`);
              for (const m of members) {
                insSplit.run(billId, m.id, perMem);
              }
            }
          }
        }
      }
    }
  }

  return {
    monthsImported,
    billsCount,
    totalMembers: db.prepare(`SELECT count(*) as c FROM members`).get().c,
    totalRooms: db.prepare(`SELECT count(*) as c FROM rooms`).get().c
  };
}

module.exports = router;
