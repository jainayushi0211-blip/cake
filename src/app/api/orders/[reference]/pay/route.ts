import { NextResponse } from 'next/server';
import { confirmPayment } from '@/server/services/order-service';

export async function POST(req: Request, { params }: { params: { reference: string } }) {
  try {
    const { reference } = params;
    const body = await req.json().catch(() => ({}));
    const idempotencyKey = body.idempotencyKey || `pay_key_${reference}_${Date.now()}`;
    const providerPaymentId = body.providerPaymentId || `sim_pay_${Date.now()}`;

    const result = await confirmPayment({
      orderReference: reference,
      idempotencyKey,
      providerPaymentId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Payment confirmation error:', err.message);
    const msg = err.message || 'Payment processing failed';
    if (msg.includes('ORDER_CANNOT_BE_CONFIRMED')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
