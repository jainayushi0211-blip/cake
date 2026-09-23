import { NextResponse } from 'next/server';
import { executeSql } from '@/db';

export async function GET(req: Request, { params }: { params: { reference: string } }) {
  try {
    const { reference } = params;

    const orderRes = await executeSql(
      `SELECT o.id, o.order_reference, o.user_id, o.customer_name, o.customer_email, o.customer_phone,
              o.pickup_date, o.pickup_slot_id, o.status, o.subtotal_cents, o.message_fee_cents, o.total_cents,
              o.hold_expires_at, o.qr_code_data, o.notes, o.created_at,
              ps.start_time, ps.end_time,
              p.status as payment_status, p.idempotency_key, p.payment_provider
       FROM orders o
       JOIN pickup_slots ps ON o.pickup_slot_id = ps.id
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.order_reference = $1;`,
      [reference]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderRes.rows[0];

    // Fetch items with customisations
    const itemsRes = await executeSql(
      `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price_cents, oi.total_price_cents,
              pr.name as product_name, pr.image_url,
              oc.custom_message, oc.message_fee_cents, oc.reference_image_url,
              so.name as size_name,
              fo.name as flavour_name
       FROM order_items oi
       JOIN products pr ON oi.product_id = pr.id
       LEFT JOIN order_customisations oc ON oc.order_item_id = oi.id
       LEFT JOIN product_options so ON oc.size_option_id = so.id
       LEFT JOIN product_options fo ON oc.flavour_option_id = fo.id
       WHERE oi.order_id = $1;`,
      [order.id]
    );

    return NextResponse.json({
      order: {
        ...order,
        items: itemsRes.rows,
      },
    });
  } catch (err: any) {
    console.error('Order detail fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
  }
}
