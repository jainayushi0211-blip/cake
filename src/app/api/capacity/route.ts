import { NextResponse } from 'next/server';
import { executeSql } from '@/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    // Fetch next 14 days
    const capRes = await executeSql(
      `SELECT id, bakery_date, max_cakes, reserved_cakes, is_closed 
       FROM daily_capacity 
       WHERE bakery_date >= CURRENT_DATE 
       ORDER BY bakery_date ASC 
       LIMIT 14;`
    );

    const slotsRes = await executeSql(
      `SELECT id, bakery_date, start_time, end_time, max_orders, reserved_orders 
       FROM pickup_slots 
       WHERE bakery_date >= CURRENT_DATE 
       ORDER BY bakery_date, start_time ASC;`
    );

    // Group slots by bakery_date
    const slotsByDate: Record<string, any[]> = {};
    for (const s of slotsRes.rows) {
      // Normalize date string (YYYY-MM-DD)
      const d = typeof s.bakery_date === 'string' 
        ? s.bakery_date.split('T')[0] 
        : new Date(s.bakery_date).toISOString().split('T')[0];

      if (!slotsByDate[d]) slotsByDate[d] = [];
      const remainingOrders = Math.max(0, s.max_orders - s.reserved_orders);
      slotsByDate[d].push({
        id: s.id,
        startTime: s.start_time,
        endTime: s.end_time,
        maxOrders: s.max_orders,
        reservedOrders: s.reserved_orders,
        remainingOrders,
        isAvailable: remainingOrders > 0,
      });
    }

    const days = capRes.rows.map((row) => {
      const dateStr = typeof row.bakery_date === 'string'
        ? row.bakery_date.split('T')[0]
        : new Date(row.bakery_date).toISOString().split('T')[0];

      const targetPickup = new Date(`${dateStr}T10:00:00Z`);
      const hoursUntilPickup = (targetPickup.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isLeadTimeMet = hoursUntilPickup >= 48;

      const remainingCakes = Math.max(0, row.max_cakes - row.reserved_cakes);
      const isAvailable = !row.is_closed && remainingCakes > 0 && isLeadTimeMet;

      return {
        id: row.id,
        bakeryDate: dateStr,
        maxCakes: row.max_cakes,
        reservedCakes: row.reserved_cakes,
        remainingCakes,
        isClosed: row.is_closed,
        isLeadTimeMet,
        isAvailable,
        slots: slotsByDate[dateStr] || [],
      };
    });

    return NextResponse.json({ days });
  } catch (err: any) {
    console.error('Capacity fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch capacity' }, { status: 500 });
  }
}
