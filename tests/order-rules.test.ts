import { executeSql } from '../src/db';
import { runMigrations } from '../src/db/migrate';
import { runSeed } from '../src/db/seed';
import {
  createPendingOrder,
  confirmPayment,
  releaseExpiredHolds,
  cancelOrder,
} from '../src/server/services/order-service';

async function runRulesTests() {
  console.log('🧪 Starting CakeCart Order Rules & Business Constraints Test Suite...\n');
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
    // 0. Ensure clean migrations and seed
    await runMigrations();
    await runSeed();

    // Fetch sample product and future pickup dates
    const prodRes = await executeSql('SELECT id, base_price_cents FROM products LIMIT 1;');
    const product = prodRes.rows[0];

    const slotRes = await executeSql(
      `SELECT ps.id, ps.bakery_date 
       FROM pickup_slots ps 
       JOIN daily_capacity dc ON ps.bakery_date = dc.bakery_date 
       WHERE dc.is_closed = false AND ps.bakery_date > CURRENT_DATE + INTERVAL '2 days' 
       LIMIT 1;`
    );
    const validSlot = slotRes.rows[0];
    const validDate = typeof validSlot.bakery_date === 'string'
      ? validSlot.bakery_date.split('T')[0]
      : new Date(validSlot.bakery_date).toISOString().split('T')[0];

    // TEST 1: Minimum Lead Time Enforcement (< 48 hours rejected on server)
    console.log('\n--- Test 1: Minimum Lead Time (48 hours) ---');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      await createPendingOrder({
        customerName: 'Too Soon Customer',
        customerEmail: 'toosoon@test.com',
        customerPhone: '+1-555-0101',
        pickupDate: tomorrowStr,
        pickupSlotId: validSlot.id,
        items: [{ productId: product.id, quantity: 1 }],
      });
      assert(false, 'Server must reject order placed with < 48 hours notice');
    } catch (err: any) {
      assert(
        err.message.includes('MINIMUM_LEAD_TIME_VIOLATION'),
        'Server successfully rejected order within 48h lead time'
      );
    }

    // TEST 2: Closed Date Enforcement
    console.log('\n--- Test 2: Closed Date Enforcement ---');
    const closedDateRes = await executeSql(
      'SELECT bakery_date, id FROM daily_capacity WHERE is_closed = true LIMIT 1;'
    );
    if (closedDateRes.rows.length > 0) {
      const closedDate = typeof closedDateRes.rows[0].bakery_date === 'string'
        ? closedDateRes.rows[0].bakery_date.split('T')[0]
        : new Date(closedDateRes.rows[0].bakery_date).toISOString().split('T')[0];

      const closedSlotRes = await executeSql('SELECT id FROM pickup_slots WHERE bakery_date = $1 LIMIT 1;', [closedDate]);
      if (closedSlotRes.rows.length > 0) {
        try {
          await createPendingOrder({
            customerName: 'Closed Date Order',
            customerEmail: 'closed@test.com',
            customerPhone: '+1-555-0102',
            pickupDate: closedDate,
            pickupSlotId: closedSlotRes.rows[0].id,
            items: [{ productId: product.id, quantity: 1 }],
          });
          assert(false, 'Server must reject order placed on a closed date');
        } catch (err: any) {
          assert(
            err.message.includes('DATE_CLOSED'),
            'Server successfully rejected order on closed date'
          );
        }
      }
    }

    // TEST 3: Custom Message 40 Characters Limit
    console.log('\n--- Test 3: 40-Character Message Limit ---');
    const message41Chars = 'This message has exactly forty-one chars!'; // 41 characters
    try {
      await createPendingOrder({
        customerName: 'Long Message Customer',
        customerEmail: 'long@test.com',
        customerPhone: '+1-555-0103',
        pickupDate: validDate,
        pickupSlotId: validSlot.id,
        items: [{ productId: product.id, quantity: 1, customMessage: message41Chars }],
      });
      assert(false, 'Server must reject custom message exceeding 40 characters');
    } catch (err: any) {
      assert(
        err.message.includes('MESSAGE_TOO_LONG'),
        'Server successfully rejected message with 41 characters'
      );
    }

    // TEST 4: Pricing, Message Fee & Pending Order Creation
    console.log('\n--- Test 4: Pricing Calculation & Hold Reservation ---');
    const validMessage = 'Happy 30th Birthday Ayushi!'; // 27 characters
    const orderResult = await createPendingOrder({
      customerName: 'Ayushi Test',
      customerEmail: 'ayushi@test.com',
      customerPhone: '+1-555-0104',
      pickupDate: validDate,
      pickupSlotId: validSlot.id,
      items: [{ productId: product.id, quantity: 1, customMessage: validMessage }],
    });

    assert(!!orderResult.orderReference, 'Order reference generated: ' + orderResult.orderReference);
    assert(orderResult.status === 'PENDING', 'Order created in PENDING status');
    assert(
      orderResult.totalCents === product.base_price_cents + 300,
      `Calculated total (${orderResult.totalCents}) equals base (${product.base_price_cents}) + $3.00 message fee`
    );

    // TEST 5: Payment Confirmation & Idempotency
    console.log('\n--- Test 5: Payment Confirmation & Idempotency ---');
    const idemKey = `test_idem_${orderResult.orderReference}_123`;
    const payRes1 = await confirmPayment({
      orderReference: orderResult.orderReference,
      idempotencyKey: idemKey,
      providerPaymentId: 'ch_test_123',
    });
    assert(payRes1.status === 'CONFIRMED', 'Order transitioned to CONFIRMED on payment');

    // Duplicate payment attempt with same idempotency key
    const payRes2 = await confirmPayment({
      orderReference: orderResult.orderReference,
      idempotencyKey: idemKey,
      providerPaymentId: 'ch_test_123_duplicate',
    });
    assert(payRes2.status === 'CONFIRMED', 'Idempotent payment call handled safely without error');

    // TEST 6: Customer Cancellation with 24-hour Cut-Off Rule
    console.log('\n--- Test 6: 24-Hour Cancellation Cut-Off Rule ---');
    // Order was scheduled > 48 hours away, so it should be eligible for cancellation (> 24 hours)
    const cancelRes = await cancelOrder({
      orderReference: orderResult.orderReference,
      actorRole: 'customer',
    });
    assert(cancelRes.status === 'CANCELLED', 'Order successfully cancelled > 24 hours before pickup');

    // TEST 7: Expired Hold Cleanup Cron
    console.log('\n--- Test 7: Expired Hold Cleanup Cron ---');
    // Create an order with an expired hold manually to test cleanup
    const orderToExpire = await createPendingOrder({
      customerName: 'Expired Hold Tester',
      customerEmail: 'expire@test.com',
      customerPhone: '+1-555-0105',
      pickupDate: validDate,
      pickupSlotId: validSlot.id,
      items: [{ productId: product.id, quantity: 2 }],
    });

    // Artificially age the hold timestamp to the past
    await executeSql(
      "UPDATE orders SET hold_expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = $1;",
      [orderToExpire.orderId]
    );

    // Run releaseExpiredHolds
    const cleanupRes = await releaseExpiredHolds();
    assert(cleanupRes.releasedCount >= 1, `releaseExpiredHolds released ${cleanupRes.releasedCount} expired hold(s)`);

    // Verify order is now EXPIRED
    const checkOrder = await executeSql('SELECT status FROM orders WHERE id = $1;', [orderToExpire.orderId]);
    assert(checkOrder.rows[0].status === 'EXPIRED', 'Order status transitioned to EXPIRED');

    // Repeat releaseExpiredHolds immediately (idempotency check)
    const cleanupRes2 = await releaseExpiredHolds();
    assert(cleanupRes2.releasedCount === 0, 'Subsequent cron run is safe and finds 0 remaining expired holds');

    // Summary
    console.log(`\n===========================================`);
    console.log(`Test Suite Finished: ${passed} Passed, ${failed} Failed`);
    console.log(`===========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runRulesTests();
