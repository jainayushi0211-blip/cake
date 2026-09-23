import { NextResponse } from 'next/server';
import { executeSql } from '@/db';
import { getSessionUser } from '@/server/auth';

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'baker') {
      return NextResponse.json({ error: 'FORBIDDEN: Baker access required' }, { status: 403 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');

    let query = `
      SELECT o.id, o.order_reference, o.customer_name, o.customer_email, o.customer_phone,
             o.pickup_date, o.status, o.subtotal_cents, o.message_fee_cents, o.total_cents,
             o.hold_expires_at, o.qr_code_data, o.notes, o.created_at,
             ps.start_time, ps.end_time,
             p.status as payment_status
      FROM orders o
      JOIN pickup_slots ps ON o.pickup_slot_id = ps.id
      LEFT JOIN payments p ON p.order_id = o.id
    `;
    const params: any[] = [];

    if (dateParam) {
      query += ` WHERE o.pickup_date = $1 ORDER BY ps.start_time ASC, o.created_at ASC;`;
      params.push(dateParam);
    } else {
      query += ` ORDER BY o.pickup_date ASC, ps.start_time ASC LIMIT 100;`;
    }

    const ordersRes = await executeSql(query, params);

    // Fetch items for these orders
    const orderIds = ordersRes.rows.map((o) => o.id);
    let itemsByOrderId: Record<string, any[]> = {};

    if (orderIds.length > 0) {
      const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(',');
      const itemsRes = await executeSql(
        `SELECT oi.order_id, oi.quantity, oi.unit_price_cents,
                pr.name as product_name,
                oc.custom_message, oc.message_fee_cents,
                so.name as size_name, fo.name as flavour_name
         FROM order_items oi
         JOIN products pr ON oi.product_id = pr.id
         LEFT JOIN order_customisations oc ON oc.order_item_id = oi.id
         LEFT JOIN product_options so ON oc.size_option_id = so.id
         LEFT JOIN product_options fo ON oc.flavour_option_id = fo.id
         WHERE oi.order_id IN (${placeholders});`,
        orderIds
      );

      for (const item of itemsRes.rows) {
        if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
        itemsByOrderId[item.order_id].push(item);
      }
    }

    const enrichedOrders = ordersRes.rows.map((o) => ({
      ...o,
      items: itemsByOrderId[o.id] || [],
    }));

    return NextResponse.json({ orders: enrichedOrders });
  } catch (err: any) {
    console.error('Baker orders error:', err);
    return NextResponse.json({ error: 'Failed to fetch baker orders' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'baker') {
      return NextResponse.json({ error: 'FORBIDDEN: Baker access required' }, { status: 403 });
    }

    const { orderReference, newStatus } = await req.json();

    const allowedStatuses = ['PENDING', 'CONFIRMED', 'BAKING', 'READY', 'COLLECTED', 'CANCELLED'];
    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const orderRes = await executeSql(
      'SELECT id, status FROM orders WHERE order_reference = $1;',
      [orderReference]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderRes.rows[0];

    await executeSql(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;',
      [newStatus, order.id]
    );

    // If marked collected, log audit
    await executeSql(
      `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, actor_role, details)
       VALUES ('order', $1, 'STATUS_UPDATE', $2, 'baker', $3);`,
      [order.id, sessionUser.id, JSON.stringify({ from: order.status, to: newStatus })]
    );

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: any) {
    console.error('Baker status update error:', err);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
