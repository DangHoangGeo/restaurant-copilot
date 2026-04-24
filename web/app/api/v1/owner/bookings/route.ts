import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden: managers and owners only' }, { status: 403 });
  }

  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('restaurant_id', user.restaurantId)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ message: 'Error fetching bookings', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error('API Error in GET bookings:', error);
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
