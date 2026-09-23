import { NextResponse } from 'next/server';
import { releaseExpiredHolds } from '@/server/services/order-service';

function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'cakecart_cron_super_secret_2026';
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED: Invalid CRON_SECRET' }, { status: 401 });
  }

  try {
    const result = await releaseExpiredHolds();
    return NextResponse.json({ success: true, releasedCount: result.releasedCount });
  } catch (err: any) {
    console.error('Expired hold cleanup error:', err);
    return NextResponse.json({ error: 'Failed to release expired holds' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
