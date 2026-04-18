import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/lib/logger';
import { checkAuthorization } from '@/lib/server/rolePermissions';
import {
  mapInventoryRowsToLowStockItems,
  type InventoryLowStockRow,
} from '@/lib/server/dashboard/low-stock';
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  getLocalDateString,
  getLocalDayRange,
} from '@/lib/server/dashboard/dates';

export async function GET() {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check authorization for reports SELECT
  const authError = checkAuthorization(user, 'analytics', 'SELECT');
  if (authError) return authError;

  try {

    // Resolve the branch's local day so "today's sales" reflects the restaurant's
    // wall clock instead of UTC. Phase 0 defaults to Asia/Tokyo if a branch has
    // no timezone set yet.
    const { data: restaurantRow } = await supabaseAdmin
      .from('restaurants')
      .select('timezone')
      .eq('id', user.restaurantId)
      .maybeSingle();
    const timezone: string = restaurantRow?.timezone ?? DEFAULT_RESTAURANT_TIMEZONE;
    const today = getLocalDateString(timezone);
    const todayRange = getLocalDayRange(today, timezone);

    // Fetch dashboard metrics
    const [todaySalesResult, ordersCountResult, topSellerResult, lowStockResult] = await Promise.all([
      // Today's sales (restaurant-local day)
      supabaseAdmin
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', user.restaurantId)
        .gte('created_at', todayRange.start)
        .lte('created_at', todayRange.end)
        .eq('status', 'completed'),

      // Active orders count
      supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('restaurant_id', user.restaurantId)
        .neq('status', 'completed'),

      // Top seller this week
      supabaseAdmin.rpc('get_top_sellers_7days', {
        p_restaurant_id: user.restaurantId,
        p_limit: 1,
      }),

      // Low stock items count
      supabaseAdmin
        .from('inventory_items')
        .select('id, stock_level, threshold, menu_items!inner(name_en, name_ja, name_vi, categories!inner(name_en, name_ja, name_vi))')
        .eq('restaurant_id', user.restaurantId)
        .not('stock_level', 'is', null)
        .not('threshold', 'is', null)
    ]);

    // Calculate today's total sales
    const todaySales = todaySalesResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    // Get active orders count
    const activeOrdersCount = ordersCountResult.count || 0;

    // Calculate top seller
    let topSeller = null;
    if (topSellerResult.data && topSellerResult.data.length > 0) {
      const topItem = topSellerResult.data[0];
      topSeller = {
        name: topItem.name_en || topItem.name_ja || topItem.name_vi || 'Unknown Item',
        metricValue: `${topItem.total_sold} sold`
      };
    }

    const lowStockItemsCount = lowStockResult.data
      ? mapInventoryRowsToLowStockItems(lowStockResult.data as InventoryLowStockRow[]).length
      : 0;

    const metrics = {
      todaySales,
      activeOrdersCount,
      topSellerToday: topSeller,
      lowStockItemsCount
    };

    return NextResponse.json(metrics);
  } catch (error) {
    await logger.error('reports-api-get', 'Error fetching reports data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      restaurantId: user?.restaurantId
    }, user?.restaurantId, user?.userId);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
