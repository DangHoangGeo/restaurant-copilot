import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';

const statusSchema = z.object({
  status: z.enum(['confirmed', 'canceled']).optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bookingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();
  const { bookingId } = await params;

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID.' }, { status: 401 });
  }

  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden: managers and owners only' }, { status: 403 });
  }

  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const validation = statusSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
  }

  if (!validation.data.status && !validation.data.bookingDate && !validation.data.bookingTime) {
    return NextResponse.json({ error: 'No booking update provided.' }, { status: 400 });
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

    const updatePayload: {
      status?: 'confirmed' | 'canceled';
      booking_date?: string;
      booking_time?: string;
    } = {};

    if (validation.data.status) updatePayload.status = validation.data.status;
    if (validation.data.bookingDate) updatePayload.booking_date = validation.data.bookingDate;
    if (validation.data.bookingTime) updatePayload.booking_time = validation.data.bookingTime;

    const { data, error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .eq('restaurant_id', user.restaurantId)
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
