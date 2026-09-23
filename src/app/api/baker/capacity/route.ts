import { NextResponse } from 'next/server';
import { executeSql } from '@/db';
import { getSessionUser } from '@/server/auth';

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'baker') {
      return NextResponse.json({ error: 'FORBIDDEN: Baker access required' }, { status: 403 });
    }

    const { bakeryDate, maxCakes, isClosed, slotUpdates } = await req.json();

    if (!bakeryDate) {
      return NextResponse.json({ error: 'bakeryDate is required' }, { status: 400 });
    }

    // 1. Update or Insert daily_capacity
    if (maxCakes !== undefined || isClosed !== undefined) {
      const existing = await executeSql('SELECT id, max_cakes, is_closed FROM daily_capacity WHERE bakery_date = $1;', [bakeryDate]);
      if (existing.rows.length > 0) {
        const newMax = maxCakes !== undefined ? maxCakes : existing.rows[0].max_cakes;
        const newClosed = isClosed !== undefined ? isClosed : existing.rows[0].is_closed;

        await executeSql(
          'UPDATE daily_capacity SET max_cakes = $1, is_closed = $2 WHERE bakery_date = $3;',
          [newMax, newClosed, bakeryDate]
        );
      } else {
        await executeSql(
          'INSERT INTO daily_capacity (bakery_date, max_cakes, is_closed) VALUES ($1, $2, $3);',
          [bakeryDate, maxCakes || 12, isClosed || false]
        );
      }
    }

    // 2. Update slots if provided
    if (slotUpdates && Array.isArray(slotUpdates)) {
      for (const slot of slotUpdates) {
        if (slot.slotId && slot.maxOrders !== undefined) {
          await executeSql(
            'UPDATE pickup_slots SET max_orders = $1 WHERE id = $2;',
            [slot.maxOrders, slot.slotId]
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Baker capacity error:', err);
    return NextResponse.json({ error: 'Failed to update capacity settings' }, { status: 500 });
  }
}
