import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface RecentOrdersResponse {
  id: string;
  customerName: string;
  itemsCount: number;
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'canceled';
  createdAt: Date;
}

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restaurantId = user.restaurantId;

    // Fetch recent orders with optimized query
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id, 
        table_id, 
        total_amount, 
        status, 
        created_at,
        tables (name),
        order_items (quantity)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(10); // Get last 10 orders for dashboard

    if (ordersError) throw ordersError;

    const recentOrders: RecentOrdersResponse[] = orders?.map(order => {
      // Calculate items count from order_items
      const itemsCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      
      // Generate customer name
      const tableName = Array.isArray(order.tables) && order.tables.length > 0 
        ? order.tables[0]?.name 
        : null;
      const customerName = tableName 
        ? `Table ${tableName}` 
        : `Order ${order.id.substring(0, 6)}`;

      return {
        id: order.id,
        customerName,
        itemsCount,
        totalAmount: order.total_amount || 0,
        status: order.status as RecentOrdersResponse['status'],
        createdAt: new Date(order.created_at),
      };
    }) || [];

    return NextResponse.json(recentOrders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent orders' }, 
      { status: 500 }
    );
  }
}
