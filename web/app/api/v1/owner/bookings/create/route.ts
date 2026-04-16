import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logEvent } from '@/lib/logger';

const ipBuckets: Record<string, { tokens: number; lastRefill: number }> = {};
function rateLimit(ip: string, limit = 10, windowSec = 60) {
  const now = Date.now();
  const entry = ipBuckets[ip] || { tokens: limit, lastRefill: now };
  const timePassed = (now - entry.lastRefill) / 1000;
  entry.tokens = Math.min(limit, entry.tokens + timePassed * (limit / windowSec));
  entry.lastRefill = now;
  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    ipBuckets[ip] = entry;
    return true;
  }
  ipBuckets[ip] = entry;
  return false;
}

const bookingSchema = z.object({
  tableId: z.string().uuid(),
  customerName: z.string().min(1),
  customerContact: z.string().min(1),
  bookingDate: z.string().refine((d) => new Date(d) >= new Date(new Date().toDateString())),
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1),
  preorderItems: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(ip)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  let payload: z.infer<typeof bookingSchema> | null = null;
  try {
    payload = bookingSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('restaurant_id')
      .eq('id', payload.tableId)
      .single();
    if (tableError || !table) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const { data: conflict } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('table_id', payload.tableId)
      .eq('booking_date', payload.bookingDate)
      .eq('booking_time', payload.bookingTime)
      .neq('status', 'canceled')
      .maybeSingle();

    if (conflict) {
      return NextResponse.json({ error: 'Time slot already booked' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        restaurant_id: table.restaurant_id,
        table_id: payload.tableId,
        customer_name: payload.customerName,
        customer_contact: payload.customerContact,
        booking_date: payload.bookingDate,
        booking_time: payload.bookingTime,
        party_size: payload.partySize,
        preorder_items: payload.preorderItems || [],
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      await logEvent({
        restaurantId: table.restaurant_id,
        level: 'ERROR',
        endpoint: '/api/v1/owner/bookings/create',
        message: error.message,
      });
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookingId: data.id });
  } catch (error) {
    console.error('Booking creation error:', error);
    await logEvent({ level: 'ERROR', endpoint: '/api/v1/owner/bookings/create', message: String(error) });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
