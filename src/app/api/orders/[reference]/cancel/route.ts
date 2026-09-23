import { NextResponse } from 'next/server';
import { cancelOrder } from '@/server/services/order-service';
import { getSessionUser } from '@/server/auth';

export async function POST(req: Request, { params }: { params: { reference: string } }) {
  try {
    const { reference } = params;
    const sessionUser = await getSessionUser();

    const actorRole = sessionUser?.role === 'baker' ? 'baker' : 'customer';

    const result = await cancelOrder({
      orderReference: reference,
      actorUserId: sessionUser?.id,
      actorRole,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Cancellation error:', err.message);
    const msg = err.message || 'Failed to cancel order';

    if (msg.startsWith('CANCEL_CUTOFF_EXCEEDED')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg.startsWith('FORBIDDEN')) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.startsWith('ORDER_NOT_FOUND')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
