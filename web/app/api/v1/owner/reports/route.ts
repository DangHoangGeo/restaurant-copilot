import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get today's date for filtering
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch dashboard metrics
    const [todaySalesResult, ordersCountResult, topSellerResult, lowStockResult] = await Promise.all([
      // Today's sales
      supabaseAdmin
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', user.restaurantId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .eq('status', 'completed'),

      // Active orders count
      supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('restaurant_id', user.restaurantId)
        .neq('status', 'completed'),

      // Top seller this week
      supabaseAdmin
        .from('order_items')
        .select(`
          quantity,
          menu_items(id, name),
          orders!inner(restaurant_id, created_at)
        `)
        .eq('orders.restaurant_id', user.restaurantId)
        .gte('orders.created_at', `${sevenDaysAgo}T00:00:00`)
        .lte('orders.created_at', `${today}T23:59:59`),

      // Low stock items (placeholder for now)
      supabaseAdmin
        .from('menu_items')
        .select('id, name', { count: 'exact' })
        .eq('restaurant_id', user.restaurantId)
        .limit(5) // Placeholder: assume first 5 items are "low stock"
    ]);

    // Calculate today's total sales
    const todaySales = todaySalesResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    // Get active orders count
    const activeOrdersCount = ordersCountResult.count || 0;

    // Calculate top seller
    let topSeller = null;
    if (topSellerResult.data) {
      const itemSales: Record<string, { name: string; quantity: number }> = {};
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topSellerResult.data.forEach((item: any) => {
        const menuItem = item.menu_items;
        if (menuItem) {
          const key = menuItem.id;
          if (!itemSales[key]) {
            itemSales[key] = { name: menuItem.name, quantity: 0 };
          }
          itemSales[key].quantity += item.quantity;
        }
      });

      const topSellerEntry = Object.entries(itemSales)
        .sort(([,a], [,b]) => b.quantity - a.quantity)[0];
      
      if (topSellerEntry) {
        topSeller = {
          name: topSellerEntry[1].name,
          metricValue: `${topSellerEntry[1].quantity} sold`
        };
      }
    }

    // Low stock count (placeholder)
    const lowStockItemsCount = lowStockResult.count || 0;

    const metrics = {
      todaySales,
      activeOrdersCount,
      topSellerToday: topSeller,
      lowStockItemsCount
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching reports data:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
