import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { createApiSuccess, handleApiError } from '@/lib/server/apiError';
import { randomUUID } from 'crypto';
import {
  mapInventoryRowsToLowStockItems,
  type DashboardLowStockItem,
  type InventoryLowStockRow,
} from '@/lib/server/dashboard/low-stock';
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  bucketToLocalDate,
  getLocalDateRange,
  getLocalDateString,
  getLocalDayRange,
} from '@/lib/server/dashboard/dates';

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
  lowStockItems: DashboardLowStockItem[];
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

    // Dashboard numbers are bucketed by the restaurant's local day, not UTC,
    // so a JST shop that closes at 23:30 doesn't lose the last 9 hours of sales
    // to the next day. Phase 0 defaults to Asia/Tokyo; later phases will read
    // the per-branch timezone from the restaurants table.
    const { data: restaurantRow } = await supabaseAdmin
      .from('restaurants')
      .select('timezone')
      .eq('id', restaurantId)
      .maybeSingle();
    const timezone: string = restaurantRow?.timezone ?? DEFAULT_RESTAURANT_TIMEZONE;
    const today = getLocalDateString(timezone);
    const todayRange = getLocalDayRange(today, timezone);
    const last7Dates = getLocalDateRange(today, 7);
    const weekRange = {
      start: getLocalDayRange(last7Dates[0], timezone).start,
      end: todayRange.end,
    };

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
      // 1. Today's sales (restaurant-local day)
      supabaseAdmin
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', todayRange.start)
        .lte('created_at', todayRange.end)
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

      // 5. Sales over time (last 7 local days)
      supabaseAdmin
        .from('orders')
        .select('total_amount, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'completed')
        .gte('created_at', weekRange.start)
        .lte('created_at', weekRange.end)
        .order('created_at', { ascending: true }),

      // 6. Low stock items (if enabled)
      // inventory_items has no name column; join menu_items to get localised names.
      // Skip rows with null stock_level / threshold to keep the payload tight —
      // mapInventoryRowsToLowStockItems would filter them anyway.
      FEATURE_FLAGS.lowStockAlerts
        ? supabaseAdmin
            .from('inventory_items')
            .select('id, stock_level, threshold, menu_items!inner(name_ja, name_en, name_vi, price, categories(name_en, name_ja, name_vi))')
            .eq('restaurant_id', restaurantId)
            .not('stock_level', 'is', null)
            .not('threshold', 'is', null)
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

    // Process sales over time, bucketed into the restaurant's local days.
    const salesOverTime = salesOverTimeData.status === 'fulfilled' && salesOverTimeData.value.data
      ? (() => {
          const dailySales: Record<string, number> = {};

          // Seed every local day in the window with 0 so the chart renders even
          // when a day has no sales.
          for (const d of last7Dates) {
            dailySales[d] = 0;
          }

          salesOverTimeData.value.data.forEach(order => {
            const localDay = bucketToLocalDate(order.created_at, timezone);
            if (Object.prototype.hasOwnProperty.call(dailySales, localDay)) {
              dailySales[localDay] += order.total_amount || 0;
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
      ? mapInventoryRowsToLowStockItems(lowStockData.value.data as InventoryLowStockRow[]).slice(0, 5)
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
