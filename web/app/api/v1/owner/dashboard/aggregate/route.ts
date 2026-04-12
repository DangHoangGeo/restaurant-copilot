import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { createApiSuccess, handleApiError } from '@/lib/server/apiError';
import { randomUUID } from 'crypto';

export const revalidate = 60; // Revalidate every 60 seconds

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
    status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'serving' | 'completed' | 'canceled';
    createdAt: string;
  }>;
  popularItems: Array<{
    id: string;
    name: string;
    totalOrdered: number;
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
        .not('status', 'in', '("completed", "canceled")'),

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

      // 4. Popular items (last 7 days) - using RPC
      supabaseAdmin.rpc('get_top_sellers_7days', {
        p_restaurant_id: restaurantId,
        p_limit: 5,
      }),

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
      // inventory_items has no name column; join menu_items to get localised names.
      FEATURE_FLAGS.lowStockAlerts
        ? supabaseAdmin
            .from('inventory_items')
            .select('id, stock_level, threshold, menu_items!inner(name_ja, name_en, name_vi)')
            .eq('restaurant_id', restaurantId)
        : Promise.resolve({ data: [], error: null }),

      // 7. Top seller today - using RPC
      supabaseAdmin.rpc('get_top_seller_for_day', {
        p_restaurant_id: restaurantId,
        p_date: today,
      }),
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

    // Process popular items from RPC
    const popularItems = popularItemsData.status === 'fulfilled' && popularItemsData.value.data
      ? popularItemsData.value.data.map((item: { menu_item_id: string; name_en: string; name_ja: string; name_vi: string; total_sold: number; }) => ({
          id: item.menu_item_id,
          name: item.name_en || item.name_ja || item.name_vi || 'Unknown Item',
          totalOrdered: Number(item.total_sold),
      }))
      : [];

    // Process sales over time
    const salesOverTime = salesOverTimeData.status === 'fulfilled' && salesOverTimeData.value.data
      ? (() => {
          const dailySales: Record<string, number> = {};
          
          for (let i = 6; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            dailySales[dateStr] = 0;
          }

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
          .filter(item => item.stock_level < (item.threshold ?? 5))
          .map(item => {
            const mi = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
            const name = (mi as { name_en?: string; name_ja?: string; name_vi?: string } | null)?.name_en
              || (mi as { name_en?: string; name_ja?: string; name_vi?: string } | null)?.name_ja
              || (mi as { name_en?: string; name_ja?: string; name_vi?: string } | null)?.name_vi
              || 'Unknown';
            const threshold = item.threshold ?? 5;
            return {
              id: item.id,
              name,
              currentStock: item.stock_level,
              threshold,
              stockLevel: item.stock_level <= Math.floor(threshold / 2)
                ? 'critical' as const
                : 'low' as const,
            };
          })
          .slice(0, 5)
      : [];

    // Process top seller today from RPC
    let topSellerToday: { name: string; metricValue: string } | null = null;
    if (topSellerData.status === 'fulfilled' && topSellerData.value.data && topSellerData.value.data.length > 0) {
      const topItem = topSellerData.value.data[0];
      topSellerToday = {
        name: topItem.name_en || topItem.name_ja || topItem.name_vi || 'Unknown Item',
        metricValue: `${topItem.total_sold} sold`,
      };
    } else {
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