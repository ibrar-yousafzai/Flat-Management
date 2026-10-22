require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { db } = require('./db');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bzrojmndspukjhsiatzp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
let supabase = null;

if (effectiveKey) {
  try {
    supabase = createClient(SUPABASE_URL, effectiveKey, {
      auth: {
        persistSession: false
      }
    });
    console.log('✅ Supabase client initialized successfully');
  } catch (err) {
    console.warn('⚠️ Supabase client initialization warning:', err.message);
  }
} else {
  console.warn('⚠️ Supabase key not set in environment variables. Running in local standalone mode.');
}

// Ensure local tables have supabase_id column for 1:1 mapping
function initSupabaseSchema() {
  try { db.exec('ALTER TABLE members ADD COLUMN supabase_id TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE rooms ADD COLUMN supabase_id TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE monthly_bills ADD COLUMN supabase_id TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE payments ADD COLUMN supabase_id TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE weekly_food ADD COLUMN supabase_id TEXT'); } catch (e) {}
}

initSupabaseSchema();

// Full Synchronization from Supabase Cloud to Local State
async function syncFromSupabase() {
  if (!supabase) {
    console.log('ℹ️ Supabase sync skipped: No credentials provided in environment.');
    return { success: false, message: 'Supabase environment variables not configured' };
  }
  try {
    console.log('🔄 Syncing with Supabase Cloud Database...');
    const [
      { data: rooms, error: errRooms },
      { data: roomRents, error: errRents },
      { data: members, error: errMembers },
      { data: periods, error: errPeriods },
      { data: months, error: errMonths },
      { data: bills, error: errBills },
      { data: billShares, error: errShares },
      { data: payments, error: errPayments }
    ] = await Promise.all([
      supabase.from('rooms').select('*'),
      supabase.from('room_rents').select('*'),
      supabase.from('members').select('*'),
      supabase.from('member_periods').select('*'),
      supabase.from('months').select('*'),
      supabase.from('bills').select('*'),
      supabase.from('bill_shares').select('*'),
      supabase.from('payments').select('*')
    ]);

    if (errMembers) throw errMembers;

    // 1. Sync Rooms
    const roomMap = {};
    for (const r of (rooms || [])) {
      const activeRent = (roomRents || [])
        .filter(rr => rr.room_id === r.id)
        .sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from))[0]?.amount || 25000;

      let existing = db.prepare('SELECT id FROM rooms WHERE supabase_id = ? OR name = ?').get(r.id, r.name);
      let localRoomId;
      if (existing) {
        db.prepare('UPDATE rooms SET supabase_id = ?, base_rent = ? WHERE id = ?').run(r.id, activeRent, existing.id);
        localRoomId = existing.id;
      } else {
        const ins = db.prepare('INSERT INTO rooms (name, base_rent, description, supabase_id) VALUES (?, ?, ?, ?)').run(r.name, activeRent, 'Cloud Room', r.id);
        localRoomId = ins.lastInsertRowid;
      }
      roomMap[r.id] = localRoomId;
    }

    // 2. Sync Members
    const memberMap = {};
    for (const m of (members || [])) {
      const p = (periods || []).find(x => x.member_id === m.id && !x.end_date);
      const mType = p?.member_type === 'inside' ? 'Inside' : 'Outside';
      const mRoomId = p?.room_id ? roomMap[p.room_id] || null : null;
      const status = m.left_on ? 'Former' : 'Active';
      const pass = m.member_code ? m.member_code.toLowerCase() : 'flat123';

      let existing = db.prepare('SELECT id FROM members WHERE supabase_id = ? OR unique_id = ?').get(m.id, m.member_code);
      let localMemberId;
      if (existing) {
        db.prepare(`
          UPDATE members SET
            supabase_id = ?,
            name = ?,
            email = COALESCE(?, email),
            whatsapp = COALESCE(?, whatsapp),
            type = ?,
            room_id = ?,
            status = ?,
            join_date = COALESCE(?, join_date),
            leave_date = ?,
            opening_balance = COALESCE(?, opening_balance)
          WHERE id = ?
        `).run(m.id, m.name, m.email, m.whatsapp, mType, mRoomId, status, m.joined_on, m.left_on, m.opening_balance || 0, existing.id);
        localMemberId = existing.id;
      } else {
        const ins = db.prepare(`
          INSERT INTO members (unique_id, password, name, email, whatsapp, type, room_id, status, join_date, leave_date, opening_balance, supabase_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(m.member_code, pass, m.name, m.email || '', m.whatsapp || '', mType, mRoomId, status, m.joined_on || '2026-10-20', m.left_on, m.opening_balance || 0, m.id);
        localMemberId = ins.lastInsertRowid;
      }
      memberMap[m.id] = localMemberId;
    }

    // 3. Sync Months & Month Status
    const monthIdMap = {};
    for (const mo of (months || [])) {
      const monthStr = `${mo.year}-${String(mo.month).padStart(2, '0')}`;
      monthIdMap[mo.id] = monthStr;
      const localStatus = mo.status === 'published' ? 'confirmed' : 'draft';
      const existingStatus = db.prepare('SELECT month, status FROM month_status WHERE month = ?').get(monthStr);
      if (!existingStatus) {
        db.prepare('INSERT INTO month_status (month, status, confirmed_by) VALUES (?, ?, ?)').run(monthStr, localStatus, 'Supabase Cloud');
      } else if (existingStatus.status !== localStatus) {
        db.prepare('UPDATE month_status SET status = ? WHERE month = ?').run(localStatus, monthStr);
      }
    }

    // 4. Sync Bills & Shares (Separating Monthly Bills and Weekly Food Mess)
    for (const b of (bills || [])) {
      const monthStr = monthIdMap[b.month_id] || '2026-10';
      const shares = (billShares || []).filter(s => s.bill_id === b.id);

      if (b.kind === 'food') {
        // Sync to weekly_food and food_splits
        let existingFood = db.prepare('SELECT id FROM weekly_food WHERE supabase_id = ?').get(b.id);
        let localFoodId;
        if (existingFood) {
          db.prepare('UPDATE weekly_food SET date = ?, month = ?, title = ?, total_amount = ? WHERE id = ?')
            .run(b.bill_date || `${monthStr}-01`, monthStr, b.title, b.amount, existingFood.id);
          localFoodId = existingFood.id;
        } else {
          const ins = db.prepare('INSERT INTO weekly_food (date, week_label, month, title, total_amount, supabase_id) VALUES (?, ?, ?, ?, ?, ?)')
            .run(b.bill_date || `${monthStr}-01`, `Week of ${b.bill_date || monthStr}`, monthStr, b.title, b.amount, b.id);
          localFoodId = ins.lastInsertRowid;
        }

        if (shares.length > 0) {
          db.prepare('DELETE FROM food_splits WHERE food_id = ?').run(localFoodId);
          const insSplit = db.prepare('INSERT INTO food_splits (food_id, member_id, amount) VALUES (?, ?, ?)');
          for (const sh of shares) {
            const localMemId = memberMap[sh.member_id];
            if (localMemId) insSplit.run(localFoodId, localMemId, sh.amount);
          }
        }
      } else {
        // Sync to monthly_bills and bill_splits
        let existingBill = db.prepare('SELECT id FROM monthly_bills WHERE supabase_id = ?').get(b.id);
        let localBillId;
        let splitMode = 'everyone';
        if (b.split_mode === 'inside_only') splitMode = 'inside_only';
        else if (b.split_mode === 'by_room') splitMode = 'by_room';

        if (existingBill) {
          db.prepare(`
            UPDATE monthly_bills SET
              month = ?, title = ?, category = ?, total_amount = ?, split_type = ?
            WHERE id = ?
          `).run(monthStr, b.title, b.kind || 'utility', b.amount, splitMode, existingBill.id);
          localBillId = existingBill.id;
        } else {
          const ins = db.prepare(`
            INSERT INTO monthly_bills (month, title, category, total_amount, split_type, supabase_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(monthStr, b.title, b.kind || 'utility', b.amount, splitMode, b.id);
          localBillId = ins.lastInsertRowid;
        }

        if (shares.length > 0) {
          db.prepare('DELETE FROM bill_splits WHERE bill_id = ?').run(localBillId);
          const insSplit = db.prepare('INSERT INTO bill_splits (bill_id, member_id, amount) VALUES (?, ?, ?)');
          for (const sh of shares) {
            const localMemId = memberMap[sh.member_id];
            if (localMemId) {
              insSplit.run(localBillId, localMemId, sh.amount);
            }
          }
        }
      }
    }

    // 5. Sync Payments
    for (const p of (payments || [])) {
      let existingPayment = db.prepare('SELECT id FROM payments WHERE supabase_id = ?').get(p.id);
      const localMemId = memberMap[p.member_id];
      if (!localMemId) continue;

      const isFood = (p.note && p.note.includes('[FOOD]')) ? 'food' : 'bills';

      if (!existingPayment) {
        db.prepare(`
          INSERT INTO payments (member_id, amount, payment_for, payment_method, payment_date, bank_name, reference_no, note, status, supabase_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          localMemId,
          p.amount,
          isFood,
          p.method || 'online',
          p.paid_on || new Date().toISOString().slice(0, 10),
          p.bank_name || '',
          p.reference || '',
          p.note || '',
          p.status || 'approved',
          p.id
        );
      } else {
        db.prepare(`
          UPDATE payments SET
            amount = ?, status = ?, payment_for = ?, payment_method = ?, payment_date = ?, bank_name = ?, reference_no = ?, note = ?
          WHERE id = ?
        `).run(
          p.amount,
          p.status || 'approved',
          isFood,
          p.method || 'online',
          p.paid_on || new Date().toISOString().slice(0, 10),
          p.bank_name || '',
          p.reference || '',
          p.note || '',
          existingPayment.id
        );
      }
    }

    console.log(`✅ Supabase Cloud sync complete! Loaded: ${Object.keys(members || []).length} members, ${Object.keys(rooms || []).length} rooms, ${Object.keys(bills || []).length} bills, ${Object.keys(payments || []).length} payments.`);
    return { success: true, memberCount: members.length, roomCount: rooms.length, billCount: bills.length, paymentCount: payments.length };
  } catch (err) {
    console.error('⚠️ Supabase Cloud sync warning:', err.message);
    return { success: false, error: err.message };
  }
}

// Push New Member to Supabase Cloud
async function pushMemberToSupabase(member) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('members').insert({
      member_code: member.unique_id,
      name: member.name,
      email: member.email || null,
      whatsapp: member.whatsapp || null,
      joined_on: member.join_date || new Date().toISOString().slice(0, 10),
      opening_balance: Number(member.opening_balance || 0),
      notes: member.notes || null
    }).select().single();

    if (error) throw error;

    // Also insert period
    if (data?.id) {
      await supabase.from('member_periods').insert({
        member_id: data.id,
        member_type: member.type === 'Inside' ? 'inside' : 'outside',
        room_id: member.supabase_room_id || null,
        start_date: member.join_date || new Date().toISOString().slice(0, 10)
      });
    }

    return data;
  } catch (err) {
    console.error('Error pushing member to Supabase:', err.message);
    return null;
  }
}

// Delete Member from Supabase Cloud
async function deleteMemberFromSupabase(supabaseId) {
  if (!supabase || !supabaseId) return;
  try {
    await supabase.from('bill_shares').delete().eq('member_id', supabaseId);
    await supabase.from('member_periods').delete().eq('member_id', supabaseId);
    await supabase.from('payments').delete().eq('member_id', supabaseId);
    await supabase.from('members').delete().eq('id', supabaseId);
  } catch (err) {
    console.error('Error deleting member from Supabase:', err.message);
  }
}

// Push New Bill & Splits to Supabase Cloud
async function pushBillToSupabase(bill, splits = []) {
  if (!supabase) return null;
  try {
    const [year, month] = (bill.month || new Date().toISOString().slice(0, 7)).split('-').map(Number);
    let { data: monthRow } = await supabase.from('months').select('id').eq('year', year).eq('month', month).maybeSingle();

    if (!monthRow) {
      const { data: newMonth } = await supabase.from('months').insert({
        year,
        month,
        status: 'draft'
      }).select().single();
      monthRow = newMonth;
    }

    const validKinds = ['rent', 'utility', 'food', 'salary', 'maintenance', 'other'];
    let kind = (bill.category || 'utility').toLowerCase();
    if (!validKinds.includes(kind)) kind = 'other';

    let splitMode = 'equal_all';
    if (bill.split_type === 'inside_only') splitMode = 'inside_only';
    else if (bill.split_type === 'by_room') splitMode = 'by_room';

    const { data: billRow, error } = await supabase.from('bills').insert({
      month_id: monthRow?.id,
      kind,
      title: bill.title,
      amount: Number(bill.total_amount),
      bill_date: bill.bill_date || `${bill.month || '2026-10'}-01`,
      split_mode: splitMode
    }).select().single();

    if (error) throw error;

    if (billRow?.id && splits.length > 0) {
      const shareInserts = [];
      for (const s of splits) {
        let sMemId = s.supabase_member_id;
        if (!sMemId && s.member_id) {
          const m = db.prepare('SELECT supabase_id FROM members WHERE id = ?').get(s.member_id);
          sMemId = m?.supabase_id;
        }
        if (sMemId) {
          shareInserts.push({
            bill_id: billRow.id,
            member_id: sMemId,
            amount: Number(s.amount)
          });
        }
      }

      if (shareInserts.length > 0) {
        await supabase.from('bill_shares').insert(shareInserts);
      }
    }

    return billRow;
  } catch (err) {
    console.error('Error pushing bill to Supabase:', err.message);
    return null;
  }
}

// Update Bill & Splits in Supabase Cloud
async function updateBillInSupabase(supabaseId, bill, splits = []) {
  if (!supabase || !supabaseId) return null;
  try {
    const validKinds = ['rent', 'utility', 'food', 'salary', 'maintenance', 'other'];
    let kind = bill.category ? bill.category.toLowerCase() : undefined;
    if (kind && !validKinds.includes(kind)) kind = 'other';

    let splitMode;
    if (bill.split_type) {
      if (bill.split_type === 'inside_only') splitMode = 'inside_only';
      else if (bill.split_type === 'by_room') splitMode = 'by_room';
      else splitMode = 'equal_all';
    }

    const updatePayload = {};
    if (bill.title) updatePayload.title = bill.title;
    if (bill.total_amount !== undefined) updatePayload.amount = Number(bill.total_amount);
    if (kind) updatePayload.kind = kind;
    if (splitMode) updatePayload.split_mode = splitMode;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('bills').update(updatePayload).eq('id', supabaseId);
    }

    if (splits && splits.length > 0) {
      await supabase.from('bill_shares').delete().eq('bill_id', supabaseId);
      const shareInserts = [];
      for (const s of splits) {
        let sMemId = s.supabase_member_id;
        if (!sMemId && s.member_id) {
          const m = db.prepare('SELECT supabase_id FROM members WHERE id = ?').get(s.member_id);
          sMemId = m?.supabase_id;
        }
        if (sMemId) {
          shareInserts.push({
            bill_id: supabaseId,
            member_id: sMemId,
            amount: Number(s.amount)
          });
        }
      }
      if (shareInserts.length > 0) {
        await supabase.from('bill_shares').insert(shareInserts);
      }
    }

    return true;
  } catch (err) {
    console.error('Error updating bill in Supabase:', err.message);
    return false;
  }
}

// Delete Bill from Supabase Cloud
async function deleteBillFromSupabase(supabaseId) {
  if (!supabase || !supabaseId) return;
  try {
    await supabase.from('bill_shares').delete().eq('bill_id', supabaseId);
    await supabase.from('bills').delete().eq('id', supabaseId);
  } catch (err) {
    console.error('Error deleting bill from Supabase:', err.message);
  }
}

// Push Payment to Supabase Cloud
async function pushPaymentToSupabase(payment) {
  if (!supabase) return null;
  try {
    let sMemId = payment.supabase_member_id;
    if (!sMemId && payment.member_id) {
      const m = db.prepare('SELECT supabase_id FROM members WHERE id = ?').get(payment.member_id);
      sMemId = m?.supabase_id;
    }
    if (!sMemId) {
      console.warn('Cannot push payment to Supabase: member has no supabase_id');
      return null;
    }

    let method = (payment.payment_method || 'online').toLowerCase();
    if (method !== 'cash') method = 'online';

    let status = 'approved';
    if (payment.status === 'pending' || payment.status === 'rejected') status = 'pending';

    let noteText = payment.note || payment.notes || '';
    if (payment.payment_for === 'food' && !noteText.includes('[FOOD]')) {
      noteText = `[FOOD] ${noteText}`.trim();
    }

    const { data, error } = await supabase.from('payments').insert({
      member_id: sMemId,
      amount: Number(payment.amount),
      method,
      paid_on: payment.payment_date || new Date().toISOString().slice(0, 10),
      bank_name: payment.bank_name || null,
      reference: payment.reference_no || payment.reference || null,
      note: noteText || null,
      status
    }).select().single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error pushing payment to Supabase:', err.message);
    return null;
  }
}

// Update Payment Status in Supabase Cloud
async function updatePaymentInSupabase(supabaseId, updates = {}) {
  if (!supabase || !supabaseId) return null;
  try {
    const payload = {};
    if (updates.status) {
      payload.status = (updates.status === 'pending' || updates.status === 'rejected') ? 'pending' : 'approved';
    }
    if (updates.amount !== undefined) payload.amount = Number(updates.amount);
    if (updates.note !== undefined) payload.note = updates.note;
    if (updates.bank_name !== undefined) payload.bank_name = updates.bank_name;
    if (updates.reference_no !== undefined) payload.reference = updates.reference_no;

    const { data, error } = await supabase.from('payments').update(payload).eq('id', supabaseId).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error updating payment in Supabase:', err.message);
    return null;
  }
}

// Delete Payment from Supabase Cloud
async function deletePaymentFromSupabase(supabaseId) {
  if (!supabase || !supabaseId) return;
  try {
    await supabase.from('payments').delete().eq('id', supabaseId);
  } catch (err) {
    console.error('Error deleting payment from Supabase:', err.message);
  }
}

// Sync Month Status to Supabase Cloud
async function syncMonthStatusToSupabase(monthStr, status = 'draft') {
  if (!supabase || !monthStr) return null;
  try {
    const [year, month] = monthStr.split('-').map(Number);
    // Supabase check constraint only allows 'draft' or 'published'
    const validStatus = (status === 'confirmed' || status === 'closed' || status === 'published') ? 'published' : 'draft';
    
    const { data: existing } = await supabase.from('months').select('id').eq('year', year).eq('month', month).maybeSingle();
    if (existing) {
      await supabase.from('months').update({ status: validStatus }).eq('id', existing.id);
    } else {
      await supabase.from('months').insert({ year, month, status: validStatus });
    }
    return true;
  } catch (err) {
    console.error('Error syncing month status to Supabase:', err.message);
    return false;
  }
}

module.exports = {
  supabase,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  syncFromSupabase,
  pushMemberToSupabase,
  deleteMemberFromSupabase,
  pushBillToSupabase,
  updateBillInSupabase,
  deleteBillFromSupabase,
  pushPaymentToSupabase,
  updatePaymentInSupabase,
  deletePaymentFromSupabase,
  syncMonthStatusToSupabase
};
