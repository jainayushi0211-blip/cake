import { executeSql } from '../src/db';
import { runMigrations } from '../src/db/migrate';
import { runSeed } from '../src/db/seed';
import { createPendingOrder } from '../src/server/services/order-service';

async function runConcurrencyTest() {
  console.log('⚡ Starting CakeCart Concurrency & Race-Condition Stress Test...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    await runMigrations();
    await runSeed();

    // 1. Pick a test date 5 days in future
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 5);
    const testDateStr = testDate.toISOString().split('T')[0];

    // Set daily capacity for test date: max_cakes = 1, reserved_cakes = 0
    await executeSql(
      `INSERT INTO daily_capacity (bakery_date, max_cakes, reserved_cakes, is_closed)
       VALUES ($1, 1, 0, false)
       ON CONFLICT (bakery_date) DO UPDATE 
       SET max_cakes = 1, reserved_cakes = 0, is_closed = false;`,
      [testDateStr]
    );

    // Create a slot on this date: max_orders = 1, reserved_orders = 0
    const slotRes = await executeSql(
      `INSERT INTO pickup_slots (bakery_date, start_time, end_time, max_orders, reserved_orders)
       VALUES ($1, '14:00', '16:00', 1, 0)
       RETURNING id;`,
      [testDateStr]
    );
    const testSlotId = slotRes.rows[0].id;

    const prodRes = await executeSql('SELECT id FROM products LIMIT 1;');
    const testProductId = prodRes.rows[0].id;

    console.log(`📅 Test Date: ${testDateStr}`);
    console.log(`🎂 Initial State: max_cakes = 1, reserved_cakes = 0 (Only 1 cake remaining!)\n`);

    // 2. Launch two simultaneous order requests for the last available cake
    console.log('🚀 Firing 2 simultaneous concurrent transactions from separate customer sessions...');

    const orderPromise1 = createPendingOrder({
      customerName: 'Session A Customer',
      customerEmail: 'sessionA@test.com',
      customerPhone: '+1-555-0101',
      pickupDate: testDateStr,
      pickupSlotId: testSlotId,
      items: [{ productId: testProductId, quantity: 1, customMessage: 'Session A Cake' }],
    });

    const orderPromise2 = createPendingOrder({
      customerName: 'Session B Customer',
      customerEmail: 'sessionB@test.com',
      customerPhone: '+1-555-0102',
      pickupDate: testDateStr,
      pickupSlotId: testSlotId,
      items: [{ productId: testProductId, quantity: 1, customMessage: 'Session B Cake' }],
    });

    const results = await Promise.allSettled([orderPromise1, orderPromise2]);

    const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = results.filter((r) => r.status === 'rejected').length;

    console.log(`\nResults: ${fulfilledCount} Fulfilled, ${rejectedCount} Rejected`);

    assert(fulfilledCount === 1, 'Exactly ONE concurrent order transaction succeeded');
    assert(rejectedCount === 1, 'Exactly ONE concurrent order transaction was rejected');

    const rejectedResult = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    const errorMsg = rejectedResult?.reason?.message || '';
    assert(
      errorMsg.includes('CAPACITY_EXCEEDED'),
      `Rejected transaction failed with explicit capacity error: "${errorMsg}"`
    );

    // 3. Verify Database Integrity
    const capCheck = await executeSql(
      'SELECT max_cakes, reserved_cakes FROM daily_capacity WHERE bakery_date = $1;',
      [testDateStr]
    );
    const capacityRow = capCheck.rows[0];

    assert(
      capacityRow.reserved_cakes === 1,
      `Database reserved_cakes is exactly 1 (expected 1, got ${capacityRow.reserved_cakes})`
    );
    assert(
      capacityRow.reserved_cakes <= capacityRow.max_cakes,
      `reserved_cakes (${capacityRow.reserved_cakes}) does not exceed max_cakes (${capacityRow.max_cakes})`
    );
    assert(
      capacityRow.reserved_cakes >= 0,
      `reserved_cakes is never negative`
    );

    // 4. Attempt a 3rd order when capacity is now full
    console.log('\n--- Subsequent Order Attempt on Exhausted Capacity ---');
    try {
      await createPendingOrder({
        customerName: 'Session C Customer',
        customerEmail: 'sessionC@test.com',
        customerPhone: '+1-555-0103',
        pickupDate: testDateStr,
        pickupSlotId: testSlotId,
        items: [{ productId: testProductId, quantity: 1 }],
      });
      assert(false, 'Subsequent order must be rejected when capacity is full');
    } catch (err: any) {
      assert(
        err.message.includes('CAPACITY_EXCEEDED'),
        'Subsequent order rejected immediately with capacity exhausted message'
      );
    }

    console.log(`\n===========================================`);
    console.log(`Concurrency Test Finished: ${passed} Passed, ${failed} Failed`);
    console.log(`===========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Concurrency test failure:', err);
    process.exit(1);
  }
}

runConcurrencyTest();
