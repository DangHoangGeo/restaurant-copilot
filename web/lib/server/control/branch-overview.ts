// Per-branch overview data for the branch detail dashboard.
// Fetches today's revenue, open orders, employee count, and month close status
// for a single branch.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  getLocalDateString,
  getLocalDayRange,
} from '@/lib/server/dashboard/dates';
import { getMonthlyRollupForBranches, parseYearMonth } from '@/lib/server/finance/service';
import { listOrganizationEmployees } from '@/lib/server/organizations/queries';

export interface BranchTopItem {
  item_name: string;
  quantity: number;
  revenue: number;
}

export interface BranchOverviewData {
  today_revenue: number;
  today_order_count: number;
  open_orders_count: number;
  employee_count: number;
  month: { year: number; month: number; has_closed_snapshot: boolean; revenue_total: number; gross_profit: number };
  top_items: BranchTopItem[];
}

export async function getBranchOverview(
  restaurantId: string,
  timezone?: string | null
): Promise<BranchOverviewData> {
  const tz = timezone ?? DEFAULT_RESTAURANT_TIMEZONE;
  const localToday = getLocalDateString(tz);
  const dayRange = getLocalDayRange(localToday, tz);
  const { year, month } = parseYearMonth(null, null);

  const [todaySalesResult, openOrdersResult, employees, monthlyRollup] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, total_amount')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'completed')
      .gte('created_at', dayRange.start)
      .lte('created_at', dayRange.end),

    supabaseAdmin
      .from('orders')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("completed","canceled")'),

    listOrganizationEmployees([restaurantId]),

    getMonthlyRollupForBranches({ branchIds: [restaurantId], year, month }),
  ]);

  const today_revenue = (todaySalesResult.data ?? []).reduce(
    (sum, o) => sum + (o.total_amount ?? 0),
    0
  );
  const today_order_count = todaySalesResult.data?.length ?? 0;
  const open_orders_count = openOrdersResult.data?.length ?? 0;
  const employee_count = employees.length;
  const snapshot = monthlyRollup.snapshots[0] ?? null;

  // Fetch top items using the order IDs we already have
  const todayOrderIds = (todaySalesResult.data ?? []).map((o) => o.id);
  let top_items: BranchTopItem[] = [];

  if (todayOrderIds.length > 0) {
    const topItemsResult = await supabaseAdmin
      .from('order_items')
      .select('name, quantity, price')
      .in('order_id', todayOrderIds);

    const itemMap = new Map<string, { quantity: number; revenue: number }>();
    for (const row of topItemsResult.data ?? []) {
      const existing = itemMap.get(row.name) ?? { quantity: 0, revenue: 0 };
      itemMap.set(row.name, {
        quantity: existing.quantity + (row.quantity ?? 1),
        revenue: existing.revenue + (row.price ?? 0) * (row.quantity ?? 1),
      });
    }
    top_items = Array.from(itemMap.entries())
      .map(([item_name, stats]) => ({ item_name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }

  return {
    today_revenue,
    today_order_count,
    open_orders_count,
    employee_count,
    month: {
      year,
      month,
      has_closed_snapshot: Boolean(snapshot),
      revenue_total: snapshot?.revenue_total ?? 0,
      gross_profit: snapshot?.gross_profit_estimate ?? 0,
    },
    top_items,
  };
}
