import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { createApiSuccess, handleApiError } from '@/lib/server/apiError';
import { randomUUID } from 'crypto';

// Type for table relationship
interface TableRelation {
  name?: string;
}

export interface AggregateDashboardData {
  metrics: {
    todaySales: number;
    activeOrdersCount: number;
    topSellerToday: { name: string; metricValue: string } | null;
    lowStockItemsCount: number;
  };
  recentOrders: Array<{
    id: string;
    customerName: string;
    itemsCount: number;
    totalAmount: number;
    status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'serving' | 'completed' | 'cancelled';
    createdAt: string;
  }>;
  popularItems: Array<{
    id: string;
    name: string;
    totalOrdered: number;
    revenue: number;
  }>;
  salesOverTime: Array<{
    date: string;
    sales: number;
  }>;
  lowStockItems: Array<{
    id: string;
    name: string;
    currentStock: number;
    threshold: number;
    stockLevel: 'critical' | 'low';
  }>;
}

export async function GET() {
  const requestId = randomUUID();
  let user: Awaited<ReturnType<typeof getUserFromRequest>> | null = null;
  
  try {
    user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantId = user.restaurantId;
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Execute all data fetches in parallel for better performance
    const [
      salesData,
      activeOrdersResult,
      recentOrdersData,
      popularItemsData,
      salesOverTimeData,
      lowStockData,
      topSellerData
    ] = await Promise.allSettled([
      // 1. Today's sales
      supabaseAdmin
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`)
        .eq('status', 'completed'),

      // 2. Active orders count
      supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .not('status', 'in', '("completed", "cancelled")'),

      // 3. Recent orders (last 10)
      supabaseAdmin
        .from('orders')
        .select(`
          id,
          table_id,
          total_amount,
          status,
          created_at,
          guest_count,
          tables (
            name
          ),
          order_items (
            quantity
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(10),

      // 4. Popular items (last 7 days)
      supabaseAdmin
        .from('order_items')
        .select(`
          menu_item_id,
          quantity,
          price_at_order,
          menu_items (
            name_en,
            name_ja,
            name_vi
          ),
          orders!inner (
            created_at,
            restaurant_id,
            status
          )
        `)
        .eq('orders.restaurant_id', restaurantId)
        .eq('orders.status', 'completed')
        .gte('orders.created_at', `${sevenDaysAgo}T00:00:00.000Z`)
        .lte('orders.created_at', `${today}T23:59:59.999Z`)
        .limit(100),

      // 5. Sales over time (last 7 days)
      supabaseAdmin
        .from('orders')
        .select('total_amount, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'completed')
        .gte('created_at', `${sevenDaysAgo}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`)
        .order('created_at', { ascending: true }),

      // 6. Low stock items (if enabled)
      FEATURE_FLAGS.lowStockAlerts
        ? supabaseAdmin
            .from('inventory_items')
            .select('id, name, stock_level, threshold')
            .eq('restaurant_id', restaurantId)
        : Promise.resolve({ data: [], error: null }),

      // 7. Top seller today
      supabaseAdmin
        .from('order_items')
        .select(`
          quantity,
          menu_items!inner (id, name_en, name_ja, name_vi),
          orders!inner (created_at, restaurant_id)
        `)
        .eq('orders.restaurant_id', restaurantId)
        .gte('orders.created_at', `${today}T00:00:00.000Z`)
        .lte('orders.created_at', `${today}T23:59:59.999Z`)
        .limit(50)
    ]);

    // Process results
    const todaySales = salesData.status === 'fulfilled' && salesData.value.data
      ? salesData.value.data.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      : 0;

    const activeOrdersCount = activeOrdersResult.status === 'fulfilled'
      ? activeOrdersResult.value.count || 0
      : 0;

    // Process recent orders
    const recentOrders = recentOrdersData.status === 'fulfilled' && recentOrdersData.value.data
      ? recentOrdersData.value.data.map(order => ({
          id: order.id,
          customerName: (order.tables as unknown as TableRelation)?.name ? `Table ${(order.tables as unknown as TableRelation).name}` : `Table ${order.table_id}`,
          itemsCount: order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          totalAmount: order.total_amount,
          status: order.status,
          createdAt: order.created_at,
        }))
      : [];

    // Process popular items
    const popularItems = popularItemsData.status === 'fulfilled' && popularItemsData.value.data
      ? (() => {
          const itemStats: Record<string, {
            id: string;
            name: string;
            totalOrdered: number;
            revenue: number;
          }> = {};

          popularItemsData.value.data.forEach(item => {
            if (item.menu_items) {
              const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
              const id = item.menu_item_id;
              const name = menuItem.name_en || menuItem.name_ja || menuItem.name_vi || 'Unknown Item';

              if (!itemStats[id]) {
                itemStats[id] = { id, name, totalOrdered: 0, revenue: 0 };
              }
              
              itemStats[id].totalOrdered += item.quantity;
              itemStats[id].revenue += (item.price_at_order || 0) * item.quantity;
            }
          });

          return Object.values(itemStats)
            .sort((a, b) => b.totalOrdered - a.totalOrdered)
            .slice(0, 5);
        })()
      : [];

    // Process sales over time
    const salesOverTime = salesOverTimeData.status === 'fulfilled' && salesOverTimeData.value.data
      ? (() => {
          const dailySales: Record<string, number> = {};
          
          // Initialize all 7 days with 0
          for (let i = 6; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            dailySales[dateStr] = 0;
          }

          // Aggregate sales by date
          salesOverTimeData.value.data.forEach(order => {
            const date = new Date(order.created_at).toISOString().split('T')[0];
            if (dailySales.hasOwnProperty(date)) {
              dailySales[date] += order.total_amount || 0;
            }
          });

          return Object.entries(dailySales).map(([date, sales]) => ({
            date,
            sales,
          }));
        })()
      : [];

    // Process low stock items
    const lowStockItems = lowStockData.status === 'fulfilled' && lowStockData.value.data
      ? lowStockData.value.data
          .filter(item => item.stock_level <= (item.threshold || 5))
          .map(item => ({
            id: item.id,
            name: item.name,
            currentStock: item.stock_level,
            threshold: item.threshold || 5,
            stockLevel: item.stock_level <= Math.floor((item.threshold || 5) / 2) 
              ? 'critical' as const
              : 'low' as const,
          }))
          .slice(0, 5)
      : [];

    // Process top seller today
    let topSellerToday: { name: string; metricValue: string } | null = null;
    if (topSellerData.status === 'fulfilled' && topSellerData.value.data && topSellerData.value.data.length > 0) {
      const itemCounts: Record<string, { name: string; count: number }> = {};
      
      topSellerData.value.data.forEach(item => {
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

    if (!topSellerToday) {
      topSellerToday = { name: 'No sales today', metricValue: '' };
    }

    const aggregateData: AggregateDashboardData = {
      metrics: {
        todaySales,
        activeOrdersCount,
        topSellerToday,
        lowStockItemsCount: lowStockItems.length,
      },
      recentOrders,
      popularItems,
      salesOverTime,
      lowStockItems,
    };

    return NextResponse.json(
      createApiSuccess(aggregateData, requestId),
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=60', // Cache for 1 minute
        },
      }
    );

  } catch (error) {
    return await handleApiError(
      error,
      'dashboard-aggregate',
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}