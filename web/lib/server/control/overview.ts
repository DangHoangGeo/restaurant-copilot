import { listOrganizationEmployees } from '@/lib/server/organizations/queries';
import { listOrganizationBranches } from '@/lib/server/organizations/queries';
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  getLocalDateString,
  getLocalDayRange,
  getLocalDateRange,
  bucketToLocalDate,
  getTimezoneOffset,
} from '@/lib/server/dashboard/dates';
import {
  getMonthlyRollupForBranches,
  parseYearMonth,
} from '@/lib/server/finance/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FounderControlBranchOverview {
  restaurant_id: string;
  name: string;
  subdomain: string;
  today_revenue: number;
  open_orders_count: number;
  employee_count: number;
  has_closed_snapshot: boolean;
  monthly_revenue: number;
  monthly_gross_profit: number;
  monthly_spending: number;
}

export interface DailyRevenuPoint {
  date: string;   // YYYY-MM-DD local
  revenue: number;
  orders: number;
}

export interface MonthlyTrendPoint {
  label: string;  // "Jan", "Feb", … (short month label)
  yearMonth: string; // "2026/01" — used as tooltip label
  revenue: number;
  gross_profit: number;
  order_count: number;
}

export interface TopMenuItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface BranchRevenuePoint {
  name: string;
  revenue: number;
  gross_profit: number;
}

export interface FounderControlOverviewData {
  branches: FounderControlBranchOverview[];
  total_today_revenue: number;
  total_open_orders: number;
  total_employees: number;
  total_month_spending: number;
  branches_with_employees: number;
  branches_with_open_orders: number;
  current_month: {
    year: number;
    month: number;
    branch_count: number;
    branches_with_snapshot: number;
    branches_missing_snapshot: number;
    revenue_total: number;
    discount_total: number;
    approved_labor_hours: number;
    combined_cost_total: number;
    gross_profit_estimate: number;
  };
  attention: {
    branches_missing_snapshot: number;
    branches_without_employees: number;
    branches_with_open_orders: number;
  };
  // Chart data
  daily_revenue_30d: DailyRevenuPoint[];
  monthly_trend_6m: MonthlyTrendPoint[];
  top_items_30d: TopMenuItem[];
  branch_revenue: BranchRevenuePoint[]; // current-month revenue per branch (closed only)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Return the last `n` months as { year, month } pairs, newest last. */
function lastNMonths(n: number): { year: number; month: number }[] {
  const now = new Date();
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main function
// ─────────────────────────────────────────────────────────────────────────────

interface FounderControlOverviewParams {
  organizationId: string;
  accessibleRestaurantIds: string[];
  timezone?: string | null;
}

export async function getFounderControlOverview({
  organizationId,
  accessibleRestaurantIds,
  timezone,
}: FounderControlOverviewParams): Promise<FounderControlOverviewData> {
  const allBranches = await listOrganizationBranches(organizationId);
  const accessibleIds = new Set(accessibleRestaurantIds);
  const branches = allBranches.filter((branch) => accessibleIds.has(branch.id));

  const { year, month } = parseYearMonth(null, null);

  const empty: FounderControlOverviewData = {
    branches: [],
    total_today_revenue: 0,
    total_open_orders: 0,
    total_employees: 0,
    total_month_spending: 0,
    branches_with_employees: 0,
    branches_with_open_orders: 0,
    current_month: {
      year, month,
      branch_count: 0,
      branches_with_snapshot: 0,
      branches_missing_snapshot: 0,
      revenue_total: 0,
      discount_total: 0,
      approved_labor_hours: 0,
      combined_cost_total: 0,
      gross_profit_estimate: 0,
    },
    attention: { branches_missing_snapshot: 0, branches_without_employees: 0, branches_with_open_orders: 0 },
    daily_revenue_30d: [],
    monthly_trend_6m: [],
    top_items_30d: [],
    branch_revenue: [],
  };

  if (branches.length === 0) return empty;

  const tz = timezone ?? DEFAULT_RESTAURANT_TIMEZONE;
  const branchIds = branches.map((b) => b.id);
  const localToday = getLocalDateString(tz);
  const dayRange = getLocalDayRange(localToday, tz);
  const mm = String(month).padStart(2, '0');
  const fromDate = `${year}-${mm}-01`;
  const toDate = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

  // 30-day window for daily chart and top items
  const dates30 = getLocalDateRange(localToday, 30);
  const rangeStart30 = dates30[0];
  const rangeEnd30 = localToday;
  const timezoneOffset = getTimezoneOffset(tz);

  // ── Fetch in parallel ───────────────────────────────────────────────────────
  const [
    salesResult,
    openOrdersResult,
    employees,
    monthlyRollup,
    purchaseOrdersResult,
    expensesResult,
    orders30dResult,
    snapshots6mResult,
  ] = await Promise.all([
    // Today's completed orders
    supabaseAdmin
      .from('orders')
      .select('restaurant_id, total_amount')
      .in('restaurant_id', branchIds)
      .eq('status', 'completed')
      .gte('created_at', dayRange.start)
      .lte('created_at', dayRange.end),

    // Currently open orders
    supabaseAdmin
      .from('orders')
      .select('restaurant_id')
      .in('restaurant_id', branchIds)
      .not('status', 'in', '("completed","canceled")'),

    listOrganizationEmployees(branchIds),

    getMonthlyRollupForBranches({ branchIds, year, month }),

    supabaseAdmin
      .from('purchase_orders')
      .select('restaurant_id, total_amount')
      .in('restaurant_id', branchIds)
      .neq('status', 'cancelled')
      .gte('order_date', fromDate)
      .lte('order_date', toDate),

    supabaseAdmin
      .from('expenses')
      .select('restaurant_id, amount')
      .in('restaurant_id', branchIds)
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate),

    // Last 30 days of completed orders (for daily chart + top items)
    supabaseAdmin
      .from('orders')
      .select('id, restaurant_id, total_amount, created_at')
      .in('restaurant_id', branchIds)
      .eq('status', 'completed')
      .gte('created_at', `${rangeStart30}T00:00:00${timezoneOffset}`)
      .lte('created_at', `${rangeEnd30}T23:59:59.999${timezoneOffset}`),

    // Last 6 months of closed snapshots for monthly trend
    supabaseAdmin
      .from('monthly_finance_snapshots')
      .select('restaurant_id, year, month, revenue_total, gross_profit_estimate, order_count')
      .in('restaurant_id', branchIds)
      .eq('snapshot_status', 'closed')
      .gte('year', lastNMonths(6)[0].year)
      .order('year', { ascending: true })
      .order('month', { ascending: true }),
  ]);

  // ── Today aggregates ────────────────────────────────────────────────────────
  const revenueByBranch = new Map<string, number>();
  for (const order of salesResult.data ?? []) {
    revenueByBranch.set(order.restaurant_id,
      (revenueByBranch.get(order.restaurant_id) ?? 0) + (order.total_amount ?? 0));
  }

  const openOrdersByBranch = new Map<string, number>();
  for (const order of openOrdersResult.data ?? []) {
    openOrdersByBranch.set(order.restaurant_id,
      (openOrdersByBranch.get(order.restaurant_id) ?? 0) + 1);
  }

  const employeeCountByBranch = new Map<string, number>();
  for (const emp of employees) {
    employeeCountByBranch.set(emp.restaurant_id,
      (employeeCountByBranch.get(emp.restaurant_id) ?? 0) + 1);
  }

  const snapshotByBranch = new Map(
    monthlyRollup.snapshots.map((s) => [s.restaurant_id, s])
  );
  const spendingByBranch = new Map<string, number>();

  for (const order of purchaseOrdersResult.data ?? []) {
    spendingByBranch.set(
      order.restaurant_id,
      (spendingByBranch.get(order.restaurant_id) ?? 0) + (order.total_amount ?? 0)
    );
  }

  for (const expense of expensesResult.data ?? []) {
    spendingByBranch.set(
      expense.restaurant_id,
      (spendingByBranch.get(expense.restaurant_id) ?? 0) + (expense.amount ?? 0)
    );
  }

  const branchOverviews: FounderControlBranchOverview[] = branches.map((branch) => {
    const snapshot = snapshotByBranch.get(branch.id);
    return {
      restaurant_id: branch.id,
      name: branch.name,
      subdomain: branch.subdomain,
      today_revenue: revenueByBranch.get(branch.id) ?? 0,
      open_orders_count: openOrdersByBranch.get(branch.id) ?? 0,
      employee_count: employeeCountByBranch.get(branch.id) ?? 0,
      has_closed_snapshot: Boolean(snapshot),
      monthly_revenue: snapshot?.revenue_total ?? 0,
      monthly_gross_profit: snapshot?.gross_profit_estimate ?? 0,
      monthly_spending: spendingByBranch.get(branch.id) ?? 0,
    };
  });

  const branches_with_open_orders = branchOverviews.filter((b) => b.open_orders_count > 0).length;
  const branches_with_employees = branchOverviews.filter((b) => b.employee_count > 0).length;
  const branches_missing_snapshot = monthlyRollup.branch_count - monthlyRollup.branches_with_snapshot;
  const branches_without_employees = branchOverviews.length - branches_with_employees;
  const total_month_spending = branchOverviews.reduce(
    (sum, branch) => sum + branch.monthly_spending,
    0
  );

  // ── Daily revenue chart (last 30 days) ─────────────────────────────────────
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (const date of dates30) dailyMap.set(date, { revenue: 0, orders: 0 });

  const orders30 = orders30dResult.data ?? [];
  for (const order of orders30) {
    const localDate = bucketToLocalDate(order.created_at as string, tz);
    const bucket = dailyMap.get(localDate);
    if (bucket) {
      bucket.revenue += order.total_amount ?? 0;
      bucket.orders += 1;
    }
  }
  const daily_revenue_30d: DailyRevenuPoint[] = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    ...v,
  }));

  // ── Monthly trend chart (last 6 months) ────────────────────────────────────
  const months6 = lastNMonths(6);
  const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;

  // Aggregate closed snapshots per month across all branches
  const monthlyMap = new Map<string, { revenue: number; gross_profit: number; order_count: number }>();
  for (const m of months6) monthlyMap.set(monthKey(m.year, m.month), { revenue: 0, gross_profit: 0, order_count: 0 });

  for (const snapshot of (snapshots6mResult.data ?? []) as Array<{ year: number; month: number; revenue_total: number; gross_profit_estimate: number; order_count: number }>) {
    const key = monthKey(snapshot.year, snapshot.month);
    const bucket = monthlyMap.get(key);
    if (bucket) {
      bucket.revenue += snapshot.revenue_total ?? 0;
      bucket.gross_profit += snapshot.gross_profit_estimate ?? 0;
      bucket.order_count += snapshot.order_count ?? 0;
    }
  }

  const monthly_trend_6m: MonthlyTrendPoint[] = months6.map(({ year: y, month: m }) => {
    const key = monthKey(y, m);
    const bucket = monthlyMap.get(key) ?? { revenue: 0, gross_profit: 0, order_count: 0 };
    return {
      label: SHORT_MONTHS[m - 1],
      yearMonth: `${y}/${String(m).padStart(2, '0')}`,
      ...bucket,
    };
  });

  // ── Top menu items (last 30 days) ───────────────────────────────────────────
  let top_items_30d: TopMenuItem[] = [];
  const orderIds = orders30.map((o) => o.id as string);

  if (orderIds.length > 0) {
    const { data: itemRows } = await supabaseAdmin
      .from('order_items')
      .select('name, quantity, price')
      .in('order_id', orderIds);

    const itemMap = new Map<string, { quantity: number; revenue: number }>();
    for (const row of (itemRows ?? []) as Array<{ name: string; quantity: number; price: number }>) {
      const existing = itemMap.get(row.name) ?? { quantity: 0, revenue: 0 };
      itemMap.set(row.name, {
        quantity: existing.quantity + (row.quantity ?? 1),
        revenue: existing.revenue + (row.price ?? 0) * (row.quantity ?? 1),
      });
    }
    top_items_30d = Array.from(itemMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }

  // ── Branch revenue comparison (current month closed snapshots) ──────────────
  const branch_revenue: BranchRevenuePoint[] = branchOverviews
    .filter((b) => b.has_closed_snapshot)
    .map((b) => ({ name: b.name, revenue: b.monthly_revenue, gross_profit: b.monthly_gross_profit }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    branches: branchOverviews,
    total_today_revenue: branchOverviews.reduce((s, b) => s + b.today_revenue, 0),
    total_open_orders: branchOverviews.reduce((s, b) => s + b.open_orders_count, 0),
    total_employees: employees.length,
    total_month_spending,
    branches_with_employees,
    branches_with_open_orders,
    current_month: {
      year, month,
      branch_count: monthlyRollup.branch_count,
      branches_with_snapshot: monthlyRollup.branches_with_snapshot,
      branches_missing_snapshot,
      revenue_total: monthlyRollup.revenue_total,
      discount_total: monthlyRollup.discount_total,
      approved_labor_hours: monthlyRollup.approved_labor_hours,
      combined_cost_total: monthlyRollup.combined_cost_total,
      gross_profit_estimate: monthlyRollup.gross_profit_estimate,
    },
    attention: { branches_missing_snapshot, branches_without_employees, branches_with_open_orders },
    daily_revenue_30d,
    monthly_trend_6m,
    top_items_30d,
    branch_revenue,
  };
}
