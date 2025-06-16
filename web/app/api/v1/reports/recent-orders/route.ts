import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent orders from the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentOrders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        created_at,
        tables(name)
      `)
      .eq('restaurant_id', user.restaurantId)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    // Format the data
    const formattedOrders = recentOrders?.map(order => ({
      id: order.id,
      table: order.tables[0]?.name || 'Unknown',
      amount: order.total_amount,
      status: order.status,
      time: new Date(order.created_at).toLocaleTimeString()
    })) || [];

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
