import { NextResponse } from 'next/server';
import { executeSql } from '@/db';
import { createPendingOrder } from '@/server/services/order-service';
import { getSessionUser } from '@/server/auth';

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    const body = await req.json();

    const result = await createPendingOrder({
      userId: sessionUser?.id || undefined,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      pickupDate: body.pickupDate,
      pickupSlotId: body.pickupSlotId,
      items: body.items,
      notes: body.notes,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('Order creation error:', err.message);
    const message = err.message || 'Failed to create order';

    if (message.startsWith('MINIMUM_LEAD_TIME_VIOLATION')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.startsWith('MESSAGE_TOO_LONG')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.startsWith('DAILY_CAPACITY_EXCEEDED') || message.startsWith('SLOT_CAPACITY_EXCEEDED')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.startsWith('DATE_CLOSED') || message.startsWith('DATE_UNAVAILABLE')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    const url = new URL(req.url);
    const queryEmail = url.searchParams.get('email');

    let query = `
      SELECT o.id, o.order_reference, o.customer_name, o.customer_email, o.customer_phone,
             o.pickup_date, o.status, o.subtotal_cents, o.message_fee_cents, o.total_cents,
             o.hold_expires_at, o.qr_code_data, o.created_at,
             ps.start_time, ps.end_time,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
      FROM orders o
      JOIN pickup_slots ps ON o.pickup_slot_id = ps.id
    `;
    const params: any[] = [];

    if (sessionUser && sessionUser.role === 'customer') {
      query += ` WHERE o.user_id = $1 OR o.customer_email = $2 ORDER BY o.created_at DESC;`;
      params.push(sessionUser.id, sessionUser.email);
    } else if (queryEmail) {
      query += ` WHERE o.customer_email = $1 ORDER BY o.created_at DESC;`;
      params.push(queryEmail.toLowerCase().trim());
    } else if (sessionUser && sessionUser.role === 'baker') {
      query += ` ORDER BY o.pickup_date DESC, o.created_at DESC LIMIT 50;`;
    } else {
      return NextResponse.json({ orders: [] });
    }

    const res = await executeSql(query, params);
    return NextResponse.json({ orders: res.rows });
  } catch (err: any) {
    console.error('Fetch orders error:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
