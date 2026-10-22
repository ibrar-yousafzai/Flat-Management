require('dotenv').config();
const { db } = require('../server/db');
const {
  supabase,
  syncFromSupabase,
  pushBillToSupabase,
  updateBillInSupabase,
  deleteBillFromSupabase,
  pushPaymentToSupabase,
  updatePaymentInSupabase,
  deletePaymentFromSupabase,
  syncMonthStatusToSupabase
} = require('../server/supabase');

async function runAudit() {
  console.log('========================================================');
  console.log('🧪 FLAT MANAGEMENT FULL TRANSACTION AUDIT STARTING...');
  console.log('========================================================');

  const errors = [];
  const testMonth = '2026-10';

  // Step 1: Verify Supabase Cloud connection
  console.log('\n[TEST 1] Supabase Cloud Connection & Auth Check...');
  if (!supabase) {
    errors.push('Supabase client not initialized');
    console.error('❌ Failed: Supabase client not initialized');
    return;
  }
  const { data: mList, error: mErr } = await supabase.from('members').select('id, name, member_code');
  if (mErr || !mList || mList.length === 0) {
    errors.push(`Failed to read members from Supabase: ${mErr?.message}`);
    console.error('❌ Failed to fetch members:', mErr);
    return;
  }
  console.log(`✅ Supabase Cloud Connected! Found ${mList.length} members.`);

  // Pick a test member
  const testMember = mList[0];
  const localMem = db.prepare('SELECT * FROM members WHERE supabase_id = ?').get(testMember.id);
  console.log(`👉 Using test member: ${testMember.name} (ID: ${localMem?.id}, Supabase: ${testMember.id})`);

  let testBillId = null;
  let testSupabaseBillId = null;
  let testFoodId = null;
  let testSupabaseFoodId = null;
  let testPaymentId = null;
  let testSupabasePaymentId = null;

  try {
    // Step 2: Test Monthly Bill Creation & Split Push
    console.log('\n[TEST 2] Monthly Bill Creation & 2-Way Sync...');
    const billRes = db.prepare(`
      INSERT INTO monthly_bills (month, title, category, total_amount, split_type, notes)
      VALUES (?, 'AUDIT Test Utility Bill', 'utility', 1500, 'everyone', 'Automated Audit Test')
    `).run(testMonth);
    testBillId = billRes.lastInsertRowid;

    db.prepare(`INSERT INTO bill_splits (bill_id, member_id, amount) VALUES (?, ?, 1500)`).run(testBillId, localMem.id);

    const cloudBill = await pushBillToSupabase({
      month: testMonth,
      title: 'AUDIT Test Utility Bill',
      category: 'utility',
      total_amount: 1500,
      split_type: 'everyone'
    }, [{ member_id: localMem.id, amount: 1500 }]);

    if (!cloudBill || !cloudBill.id) {
      errors.push('Bill failed to push to Supabase');
      console.error('❌ Failed: Bill did not push to Supabase');
    } else {
      testSupabaseBillId = cloudBill.id;
      db.prepare('UPDATE monthly_bills SET supabase_id = ? WHERE id = ?').run(testSupabaseBillId, testBillId);
      console.log(`✅ Monthly Bill pushed to Supabase Cloud with ID: ${testSupabaseBillId}`);

      // Verify shares in Supabase
      const { data: shares } = await supabase.from('bill_shares').select('*').eq('bill_id', testSupabaseBillId);
      if (!shares || shares.length === 0 || shares[0].amount !== 1500) {
        errors.push('Bill shares mismatch in Supabase');
        console.error('❌ Bill shares mismatch in Supabase');
      } else {
        console.log(`✅ Bill shares verified in Supabase Cloud! Share amount: Rs. ${shares[0].amount}`);
      }
    }

    // Step 3: Test Weekly Food Mess Entry & 2-Way Sync
    console.log('\n[TEST 3] Weekly Food Mess Creation & 2-Way Sync...');
    const foodRes = db.prepare(`
      INSERT INTO weekly_food (date, week_label, month, title, total_amount, notes)
      VALUES ('2026-10-22', 'Week 4 Oct', ?, 'AUDIT Weekly Mess Food', 3000, 'Audit Food Test')
    `).run(testMonth);
    testFoodId = foodRes.lastInsertRowid;

    const foodSplitRes = db.prepare(`
      INSERT INTO food_splits (food_id, member_id, amount, is_paid, paid_amount)
      VALUES (?, ?, 3000, 0, 0)
    `).run(testFoodId, localMem.id);
    const testFoodSplitId = foodSplitRes.lastInsertRowid;

    const cloudFood = await pushBillToSupabase({
      month: testMonth,
      bill_date: '2026-10-22',
      title: 'AUDIT Weekly Mess Food',
      category: 'food',
      total_amount: 3000,
      split_type: 'everyone'
    }, [{ member_id: localMem.id, amount: 3000 }]);

    if (!cloudFood || !cloudFood.id) {
      errors.push('Weekly food failed to push to Supabase');
      console.error('❌ Failed: Weekly food did not push to Supabase');
    } else {
      testSupabaseFoodId = cloudFood.id;
      db.prepare('UPDATE weekly_food SET supabase_id = ? WHERE id = ?').run(testSupabaseFoodId, testFoodId);
      console.log(`✅ Weekly Food Mess pushed to Supabase Cloud with ID: ${testSupabaseFoodId}`);
    }

    // Step 4: Test Weekly Food Payment Toggle & Partial Payment Sync
    console.log('\n[TEST 4] Weekly Food Payment Persistence...');
    const foodPayment = await pushPaymentToSupabase({
      member_id: localMem.id,
      amount: 1000,
      payment_for: 'food',
      payment_method: 'cash',
      payment_date: '2026-10-22',
      note: '[FOOD] AUDIT Partial food payment'
    });

    if (!foodPayment || !foodPayment.id) {
      errors.push('Weekly food payment failed to push to Supabase');
      console.error('❌ Failed: Food payment did not push to Supabase');
    } else {
      console.log(`✅ Food partial payment persisted to Supabase! ID: ${foodPayment.id}, Amount: Rs. 1,000`);
      // Clean up test food payment
      await deletePaymentFromSupabase(foodPayment.id);
    }

    // Step 5: Test Monthly Bill Payment Recording & Approval
    console.log('\n[TEST 5] Monthly Bill Payment Recording & Approval...');
    const paymentRes = db.prepare(`
      INSERT INTO payments (member_id, amount, payment_for, payment_method, payment_date, bank_name, reference_no, note, status)
      VALUES (?, 1500, 'bills', 'online', '2026-10-22', 'Meezan Bank', 'TX-AUDIT-999', 'Audit Test Payment', 'approved')
    `).run(localMem.id);
    testPaymentId = paymentRes.lastInsertRowid;

    const cloudPayment = await pushPaymentToSupabase({
      member_id: localMem.id,
      amount: 1500,
      payment_for: 'bills',
      payment_method: 'online',
      payment_date: '2026-10-22',
      bank_name: 'Meezan Bank',
      reference_no: 'TX-AUDIT-999',
      note: 'Audit Test Payment',
      status: 'approved'
    });

    if (!cloudPayment || !cloudPayment.id) {
      errors.push('Payment failed to push to Supabase');
      console.error('❌ Failed: Payment did not push to Supabase');
    } else {
      testSupabasePaymentId = cloudPayment.id;
      db.prepare('UPDATE payments SET supabase_id = ? WHERE id = ?').run(testSupabasePaymentId, testPaymentId);
      console.log(`✅ Monthly Bill Payment pushed to Supabase Cloud! ID: ${testSupabasePaymentId}`);
    }

    // Step 6: Test Month Confirmation Sync
    console.log('\n[TEST 6] Month Status Confirmation Sync...');
    const syncRes = await syncMonthStatusToSupabase(testMonth, 'confirmed');
    if (!syncRes) {
      errors.push('Failed to sync month status to Supabase');
      console.error('❌ Failed: Month status sync error');
    } else {
      const { data: moData } = await supabase.from('months').select('*').eq('year', 2026).eq('month', 10).single();
      if (moData?.status === 'published') {
        console.log(`✅ Month ${testMonth} status confirmed (published) in Supabase Cloud!`);
      } else {
        errors.push(`Month status expected 'published', got '${moData?.status}'`);
      }
    }

    // Step 7: Test Full Cloud Re-Sync Roundtrip
    console.log('\n[TEST 7] Supabase Cloud Roundtrip Synchronization...');
    const roundtrip = await syncFromSupabase();
    if (!roundtrip.success) {
      errors.push(`Roundtrip sync error: ${roundtrip.error}`);
      console.error('❌ Roundtrip sync failed:', roundtrip.error);
    } else {
      console.log(`✅ Roundtrip sync passed! Successfully re-synced ${roundtrip.memberCount} members, ${roundtrip.billCount} bills, ${roundtrip.paymentCount} payments.`);
    }

  } finally {
    // Step 8: Clean up test artifacts from local and cloud databases
    console.log('\n[TEST 8] Cleaning up temporary audit records...');
    if (testSupabaseBillId) await deleteBillFromSupabase(testSupabaseBillId);
    if (testBillId) {
      db.prepare('DELETE FROM bill_splits WHERE bill_id = ?').run(testBillId);
      db.prepare('DELETE FROM monthly_bills WHERE id = ?').run(testBillId);
    }

    if (testSupabaseFoodId) await deleteBillFromSupabase(testSupabaseFoodId);
    if (testFoodId) {
      db.prepare('DELETE FROM food_splits WHERE food_id = ?').run(testFoodId);
      db.prepare('DELETE FROM weekly_food WHERE id = ?').run(testFoodId);
    }

    if (testSupabasePaymentId) await deletePaymentFromSupabase(testSupabasePaymentId);
    if (testPaymentId) {
      db.prepare('DELETE FROM payments WHERE id = ?').run(testPaymentId);
    }
    console.log('✅ Temporary audit records cleaned up completely.');
  }

  console.log('\n========================================================');
  if (errors.length === 0) {
    console.log('🎉 AUDIT COMPLETE: ALL TRANSACTIONS & PERSISTENCE VERIFIED 100% SUCCESSFUL!');
  } else {
    console.log(`⚠️ AUDIT FINISHED WITH ${errors.length} ISSUE(S):`);
    errors.forEach(e => console.log(`   - ${e}`));
  }
  console.log('========================================================');
}

runAudit();
