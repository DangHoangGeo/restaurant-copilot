import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';

const statusSchema = z.object({ status: z.enum(['confirmed', 'canceled']) });

export async function PATCH(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();
  const bookingId = req.nextUrl.searchParams.get('bookingId') || '';

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID.' }, { status: 401 });
  }

  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const validation = statusSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .eq('restaurant_id', user.restaurantId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status: validation.data.status })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking status:', error);
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  } catch (error) {
    console.error('Unexpected error in update booking API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
