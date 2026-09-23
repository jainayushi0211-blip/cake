import { executeSql, withTransaction } from '@/db';
import QRCode from 'qrcode';

export interface OrderItemInput {
  productId: string;
  quantity: number;
  sizeOptionId?: string;
  flavourOptionId?: string;
  customMessage?: string;
  referenceImageUrl?: string;
}

export interface CreateOrderInput {
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupDate: string; // YYYY-MM-DD
  pickupSlotId: string;
  items: OrderItemInput[];
  notes?: string;
}

export interface OrderResult {
  orderId: string;
  orderReference: string;
  status: string;
  totalCents: number;
  holdExpiresAt: string;
  qrCodeData: string;
  pickupDate: string;
  pickupSlotId: string;
}

// Generate random uppercase reference e.g. CC-2026-X8F2
function generateOrderReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `CC-${year}-${randomPart}`;
}

export async function createPendingOrder(input: CreateOrderInput): Promise<OrderResult> {
  const {
    userId,
    customerName,
    customerEmail,
    customerPhone,
    pickupDate,
    pickupSlotId,
    items,
    notes,
  } = input;

  if (!items || items.length === 0) {
    throw new Error('CART_EMPTY: Cart contains no items.');
  }

  // 1. Lead time validation: Minimum 48 hours in advance
  const nowUtc = new Date();
  const targetPickupDateTime = new Date(`${pickupDate}T10:00:00Z`);
  const hoursUntilPickup = (targetPickupDateTime.getTime() - nowUtc.getTime()) / (1000 * 60 * 60);

  if (hoursUntilPickup < 48) {
    throw new Error('MINIMUM_LEAD_TIME_VIOLATION: Orders require at least 48 hours advance notice.');
  }

  // 2. Custom message length validation (max 40 characters)
  for (const item of items) {
    if (item.customMessage && item.customMessage.trim().length > 40) {
      throw new Error('MESSAGE_TOO_LONG: Custom cake message exceeds the 40 characters limit.');
    }
  }

  const totalCakesInCart = items.reduce((sum, item) => sum + item.quantity, 0);

  // 3. Begin Transaction & Lock Rows
  return await withTransaction(async (txQuery) => {
    // Lock daily_capacity for chosen pickup date
    const capRes = await txQuery(
      'SELECT id, bakery_date, max_cakes, reserved_cakes, is_closed FROM daily_capacity WHERE bakery_date = $1 FOR UPDATE;',
      [pickupDate]
    );

    if (!capRes.rows || capRes.rows.length === 0) {
      throw new Error(`DATE_UNAVAILABLE: No capacity record found for date ${pickupDate}.`);
    }

    const capacityRow = capRes.rows[0];
    if (capacityRow.is_closed) {
      throw new Error('DATE_CLOSED: The bakery is closed for orders on this date.');
    }

    if (capacityRow.reserved_cakes + totalCakesInCart > capacityRow.max_cakes) {
      const remaining = Math.max(0, capacityRow.max_cakes - capacityRow.reserved_cakes);
      throw new Error(`DAILY_CAPACITY_EXCEEDED: Only ${remaining} cakes available for ${pickupDate}.`);
    }

    // Lock pickup_slots row for chosen slot
    const slotRes = await txQuery(
      'SELECT id, start_time, end_time, max_orders, reserved_orders FROM pickup_slots WHERE id = $1 FOR UPDATE;',
      [pickupSlotId]
    );

    if (!slotRes.rows || slotRes.rows.length === 0) {
      throw new Error('SLOT_NOT_FOUND: Selected pickup slot does not exist.');
    }

    const slotRow = slotRes.rows[0];
    if (slotRow.reserved_orders + 1 > slotRow.max_orders) {
      throw new Error('SLOT_CAPACITY_EXCEEDED: This pickup slot is fully booked. Please select another slot.');
    }

    // 4. Reserve capacity as a 10-minute hold
    await txQuery(
      'UPDATE daily_capacity SET reserved_cakes = reserved_cakes + $1 WHERE id = $2;',
      [totalCakesInCart, capacityRow.id]
    );

    await txQuery(
      'UPDATE pickup_slots SET reserved_orders = reserved_orders + 1 WHERE id = $1;',
      [slotRow.id]
    );

    // 5. Calculate Server-Side Pricing (minor units)
    let subtotalCents = 0;
    let messageFeeCents = 0;
    const evaluatedItems: Array<{
      productId: string;
      quantity: number;
      unitPriceCents: number;
      totalPriceCents: number;
      sizeOptionId?: string;
      flavourOptionId?: string;
      customMessage?: string;
      itemMessageFeeCents: number;
      referenceImageUrl?: string;
    }> = [];

    for (const item of items) {
      // Fetch Product
      const prodRes = await txQuery('SELECT id, name, base_price_cents FROM products WHERE id = $1;', [item.productId]);
      if (!prodRes.rows || prodRes.rows.length === 0) {
        throw new Error(`PRODUCT_NOT_FOUND: Product ${item.productId} not found.`);
      }
      const product = prodRes.rows[0];

      let unitPrice = product.base_price_cents;

      // Size option modifier
      if (item.sizeOptionId) {
        const sizeRes = await txQuery('SELECT price_modifier_cents FROM product_options WHERE id = $1;', [item.sizeOptionId]);
        if (sizeRes.rows && sizeRes.rows.length > 0) {
          unitPrice += sizeRes.rows[0].price_modifier_cents;
        }
      }

      // Flavour option modifier
      if (item.flavourOptionId) {
        const flavRes = await txQuery('SELECT price_modifier_cents FROM product_options WHERE id = $1;', [item.flavourOptionId]);
        if (flavRes.rows && flavRes.rows.length > 0) {
          unitPrice += flavRes.rows[0].price_modifier_cents;
        }
      }

      // Custom message fee ($3.00 = 300 cents if message non-empty)
      const hasMessage = item.customMessage && item.customMessage.trim().length > 0;
      const itemMsgFee = hasMessage ? 300 : 0;
      messageFeeCents += itemMsgFee;

      const itemTotalPrice = unitPrice * item.quantity;
      subtotalCents += itemTotalPrice;

      evaluatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: unitPrice,
        totalPriceCents: itemTotalPrice,
        sizeOptionId: item.sizeOptionId,
        flavourOptionId: item.flavourOptionId,
        customMessage: item.customMessage ? item.customMessage.trim() : undefined,
        itemMessageFeeCents: itemMsgFee,
        referenceImageUrl: item.referenceImageUrl,
      });
    }

    const totalCents = subtotalCents + messageFeeCents;
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL
    const orderReference = generateOrderReference();

    // Generate Collection QR Code
    const qrPayload = JSON.stringify({
      ref: orderReference,
      pickupDate,
      time: `${slotRow.start_time}-${slotRow.end_time}`,
      customer: customerName,
      cakes: totalCakesInCart,
    });
    const qrCodeData = await QRCode.toDataURL(qrPayload, { margin: 1, width: 256 });

    // 6. Insert Order
    const orderRes = await txQuery(
      `INSERT INTO orders (
        order_reference, user_id, customer_name, customer_email, customer_phone,
        pickup_date, pickup_slot_id, status, subtotal_cents, message_fee_cents,
        total_cents, hold_expires_at, qr_code_data, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10, $11, $12, $13)
      RETURNING id;`,
      [
        orderReference,
        userId || null,
        customerName,
        customerEmail,
        customerPhone,
        pickupDate,
        pickupSlotId,
        subtotalCents,
        messageFeeCents,
        totalCents,
        holdExpiresAt.toISOString(),
        qrCodeData,
        notes || null,
      ]
    );

    const orderId = orderRes.rows[0].id;

    // Insert Order Items & Customisations
    for (const item of evaluatedItems) {
      const itemRes = await txQuery(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents, total_price_cents)
         VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
        [orderId, item.productId, item.quantity, item.unitPriceCents, item.totalPriceCents]
      );
      const orderItemId = itemRes.rows[0].id;

      await txQuery(
        `INSERT INTO order_customisations (
          order_item_id, size_option_id, flavour_option_id, custom_message, message_fee_cents, reference_image_url
        ) VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          orderItemId,
          item.sizeOptionId || null,
          item.flavourOptionId || null,
          item.customMessage || null,
          item.itemMessageFeeCents,
          item.referenceImageUrl || null,
        ]
      );
    }

    // Insert Initial Payment Record
    const initialIdempotencyKey = `pay_init_${orderId}`;
    await txQuery(
      `INSERT INTO payments (
        order_id, payment_provider, provider_payment_id, idempotency_key, amount_cents, currency, status
      ) VALUES ($1, 'simulated_test', $2, $3, $4, 'USD', 'PENDING');`,
      [orderId, `test_pay_${Date.now()}`, initialIdempotencyKey, totalCents]
    );

    // Audit Log
    await txQuery(
      `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, actor_role, details)
       VALUES ('order', $1, 'HOLD_RESERVED', $2, 'customer', $3);`,
      [orderId, userId || 'guest', JSON.stringify({ orderReference, totalCakesInCart, totalCents, pickupDate })]
    );

    return {
      orderId,
      orderReference,
      status: 'PENDING',
      totalCents,
      holdExpiresAt: holdExpiresAt.toISOString(),
      qrCodeData,
      pickupDate,
      pickupSlotId,
    };
  });

}

// 8. Confirm Payment (Idempotent)
export async function confirmPayment(params: {
  orderReference: string;
  idempotencyKey: string;
  providerPaymentId: string;
}): Promise<{ success: boolean; orderReference: string; status: string }> {
  const { orderReference, idempotencyKey, providerPaymentId } = params;

  // Check if idempotency key was already processed successfully
  const existingPay = await executeSql(
    'SELECT id, status, order_id FROM payments WHERE idempotency_key = $1;',
    [idempotencyKey]
  );
  if (existingPay.rows.length > 0 && existingPay.rows[0].status === 'SUCCEEDED') {
    return { success: true, orderReference, status: 'CONFIRMED' };
  }

  await executeSql('BEGIN;');
  try {
    const orderRes = await executeSql(
      'SELECT id, status, pickup_date, pickup_slot_id FROM orders WHERE order_reference = $1 FOR UPDATE;',
      [orderReference]
    );

    if (orderRes.rows.length === 0) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const order = orderRes.rows[0];
    if (order.status === 'CONFIRMED' || order.status === 'BAKING' || order.status === 'READY') {
      await executeSql('COMMIT;');
      return { success: true, orderReference, status: order.status };
    }

    if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
      throw new Error(`ORDER_CANNOT_BE_CONFIRMED: Order is ${order.status}`);
    }

    // Update order status to CONFIRMED
    await executeSql("UPDATE orders SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [order.id]);

    // Upsert or update payment to SUCCEEDED
    await executeSql(
      `UPDATE payments 
       SET status = 'SUCCEEDED', provider_payment_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE order_id = $2;`,
      [providerPaymentId, order.id]
    );

    // Audit log
    await executeSql(
      `INSERT INTO audit_logs (entity_type, entity_id, action, actor_role, details)
       VALUES ('order', $1, 'PAYMENT_CONFIRMED', 'payment_gateway', $2);`,
      [order.id, JSON.stringify({ idempotencyKey, providerPaymentId })]
    );

    await executeSql('COMMIT;');
    return { success: true, orderReference, status: 'CONFIRMED' };
  } catch (err) {
    await executeSql('ROLLBACK;');
    throw err;
  }
}

// Expired Holds Cleanup Cron (Idempotent)
export async function releaseExpiredHolds(): Promise<{ releasedCount: number }> {
  await executeSql('BEGIN;');
  try {
    // Find all expired pending orders
    const expiredRes = await executeSql(
      `SELECT id, order_reference, pickup_date, pickup_slot_id 
       FROM orders 
       WHERE status = 'PENDING' AND hold_expires_at < CURRENT_TIMESTAMP 
       FOR UPDATE;`
    );

    let releasedCount = 0;

    for (const order of expiredRes.rows) {
      // Find cakes count
      const itemsRes = await executeSql(
        'SELECT COALESCE(SUM(quantity), 0) as total_cakes FROM order_items WHERE order_id = $1;',
        [order.id]
      );
      const cakesCount = parseInt(itemsRes.rows[0]?.total_cakes || '0', 10);

      // Decrement daily_capacity
      await executeSql(
        'UPDATE daily_capacity SET reserved_cakes = GREATEST(0, reserved_cakes - $1) WHERE bakery_date = $2;',
        [cakesCount, order.pickup_date]
      );

      // Decrement pickup_slots
      await executeSql(
        'UPDATE pickup_slots SET reserved_orders = GREATEST(0, reserved_orders - 1) WHERE id = $1;',
        [order.pickup_slot_id]
      );

      // Mark order EXPIRED
      await executeSql("UPDATE orders SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [order.id]);

      // Cancel payment
      await executeSql("UPDATE payments SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1;", [order.id]);

      // Audit log
      await executeSql(
        `INSERT INTO audit_logs (entity_type, entity_id, action, actor_role, details)
         VALUES ('order', $1, 'EXPIRED_HOLD_RELEASED', 'system_cron', $2);`,
        [order.id, JSON.stringify({ releasedCakes: cakesCount, orderReference: order.order_reference })]
      );

      releasedCount++;
    }

    await executeSql('COMMIT;');
    return { releasedCount };
  } catch (err) {
    await executeSql('ROLLBACK;');
    throw err;
  }
}

// Cancel Order (Enforcing 24h cut-off rule)
export async function cancelOrder(params: {
  orderReference: string;
  actorUserId?: string;
  actorRole: 'customer' | 'baker';
}): Promise<{ success: boolean; status: string }> {
  const { orderReference, actorUserId, actorRole } = params;

  await executeSql('BEGIN;');
  try {
    const orderRes = await executeSql(
      'SELECT id, user_id, pickup_date, pickup_slot_id, status FROM orders WHERE order_reference = $1 FOR UPDATE;',
      [orderReference]
    );

    if (orderRes.rows.length === 0) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const order = orderRes.rows[0];

    // Authorization check: customers can only cancel their own order
    if (actorRole === 'customer' && order.user_id && order.user_id !== actorUserId) {
      throw new Error('FORBIDDEN: You do not have permission to cancel this order.');
    }

    // 24-hour Cut-Off Rule for customers
    if (actorRole === 'customer') {
      const now = new Date();
      const pickupDateTime = new Date(`${order.pickup_date}T10:00:00Z`);
      const hoursUntilPickup = (pickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilPickup < 24) {
        throw new Error('CANCEL_CUTOFF_EXCEEDED: Orders cannot be cancelled less than 24 hours before pickup.');
      }
    }

    if (order.status === 'CANCELLED') {
      await executeSql('COMMIT;');
      return { success: true, status: 'CANCELLED' };
    }

    if (order.status === 'COLLECTED') {
      throw new Error('INVALID_STATUS: Collected orders cannot be cancelled.');
    }

    // Release capacity if order was holding capacity
    if (['PENDING', 'CONFIRMED', 'BAKING'].includes(order.status)) {
      const itemsRes = await executeSql(
        'SELECT COALESCE(SUM(quantity), 0) as total_cakes FROM order_items WHERE order_id = $1;',
        [order.id]
      );
      const cakesCount = parseInt(itemsRes.rows[0]?.total_cakes || '0', 10);

      await executeSql(
        'UPDATE daily_capacity SET reserved_cakes = GREATEST(0, reserved_cakes - $1) WHERE bakery_date = $2;',
        [cakesCount, order.pickup_date]
      );

      await executeSql(
        'UPDATE pickup_slots SET reserved_orders = GREATEST(0, reserved_orders - 1) WHERE id = $1;',
        [order.pickup_slot_id]
      );
    }

    await executeSql("UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [order.id]);
    await executeSql("UPDATE payments SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1;", [order.id]);

    await executeSql(
      `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, actor_role, details)
       VALUES ('order', $1, 'ORDER_CANCELLED', $2, $3, $4);`,
      [order.id, actorUserId || 'customer', actorRole, JSON.stringify({ orderReference })]
    );

    await executeSql('COMMIT;');
    return { success: true, status: 'CANCELLED' };
  } catch (err) {
    await executeSql('ROLLBACK;');
    throw err;
  }
}
