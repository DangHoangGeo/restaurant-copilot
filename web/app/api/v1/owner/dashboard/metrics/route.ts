import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { FEATURE_FLAGS } from '@/config/feature-flags';

export interface DashboardMetrics {
  todaySales: number;
  activeOrdersCount: number;
  topSellerToday: { name: string; metricValue: string } | null;
  lowStockItemsCount: number;
}

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];
    const restaurantId = user.restaurantId;

    // 1. Today's Total Sales
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
      .eq('status', 'completed');

    if (salesError) throw salesError;
    const todaySales = salesData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    // 2. Active Orders Count
    const { count: activeOrdersCount, error: activeOrdersError } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("completed", "canceled")');
    
    if (activeOrdersError) throw activeOrdersError;

    // 3. Top-Selling Item Today (using RPC function if available, otherwise fallback)
    let topSellerToday: { name: string; metricValue: string } | null = null;
    try {
      const { data: topSellerData, error: topSellerError } = await supabaseAdmin
        .rpc('get_top_sellers_7days', { 
          restaurant_id_input: restaurantId,
          days_input: 1  // Just today
        });

      if (!topSellerError && topSellerData && topSellerData.length > 0) {
        const topItem = topSellerData[0];
        topSellerToday = { 
          name: topItem.item_name, 
          metricValue: `${topItem.total_sold} sold` 
        };
      }
    } catch (error) {
      // Fallback to manual calculation if RPC doesn't exist
      console.warn('RPC function not available, using fallback calculation:', error);
      const { data: topSellerRaw, error: topSellerError } = await supabaseAdmin
        .from('order_items')
        .select(`
          quantity,
          menu_items!inner (id, name_en, name_ja, name_vi),
          orders!inner (created_at, restaurant_id)
        `)
        .eq('orders.restaurant_id', restaurantId)
        .gte('orders.created_at', `${today}T00:00:00.000Z`)
        .lte('orders.created_at', `${today}T23:59:59.999Z`)
        .limit(50);

      if (!topSellerError && topSellerRaw && topSellerRaw.length > 0) {
        // Group by menu item and sum quantities
        const itemCounts: Record<string, { name: string; count: number }> = {};
        topSellerRaw.forEach(item => {
          if (item.menu_items) {
            const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
            const id = menuItem.id;
            const name = menuItem.name_en || menuItem.name_ja || menuItem.name_vi || 'Unknown Item';
            
            if (!itemCounts[id]) {
              itemCounts[id] = { name, count: 0 };
            }
            itemCounts[id].count += item.quantity;
          }
        });

        const sortedItems = Object.values(itemCounts).sort((a, b) => b.count - a.count);
        if (sortedItems.length > 0) {
          const topItem = sortedItems[0];
          topSellerToday = { 
            name: topItem.name, 
            metricValue: `${topItem.count} sold` 
          };
        }
      }
    }

    // If no top seller found, provide default
    if (!topSellerToday) {
      topSellerToday = { name: 'No sales today', metricValue: '' };
    }

    // 4. Low-Stock Alerts
    let lowStockItemsCount = 0;
    if (FEATURE_FLAGS.lowStockAlerts) {
      try {
        const { data: lowStockData, error: lowStockError } = await supabaseAdmin
          .from('inventory_items')
          .select('id, stock_level, threshold')
          .eq('restaurant_id', restaurantId);
        
        if (!lowStockError && lowStockData) {
          lowStockItemsCount = lowStockData.filter(item => 
            item.stock_level <= (item.threshold || 5)
          ).length;
        }
      } catch (error) {
        // If inventory table doesn't exist, keep count as 0
        console.warn('Inventory table not available for low stock alerts:', error);
      }
    }
    
    const metrics: DashboardMetrics = {
      todaySales,
      activeOrdersCount: activeOrdersCount || 0,
      topSellerToday,
      lowStockItemsCount,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' }, 
      { status: 500 }
    );
  }
}
