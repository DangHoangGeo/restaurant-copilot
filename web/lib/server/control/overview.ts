import { listOrganizationEmployees } from "@/lib/server/organizations/queries";
import { listOrganizationBranches } from "@/lib/server/organizations/queries";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  getLocalDateString,
  getLocalDayRange,
  getLocalDateRange,
  bucketToLocalDate,
  getTimezoneOffset,
} from "@/lib/server/dashboard/dates";
import {
  getMonthlyRollupForBranches,
  parseYearMonth,
} from "@/lib/server/finance/service";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  date: string; // YYYY-MM-DD local
  revenue: number;
  expenses: number;
  orders: number;
}

export interface MonthlyTrendPoint {
  label: string; // "Jan", "Feb", … (short month label)
  yearMonth: string; // "2026/01" — used as tooltip label
  revenue: number;
  expenses: number;
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
  expenses: number;
  gross_profit: number;
}

export interface PayrollBranchPoint {
  restaurant_id: string;
  name: string;
  approved_hours: number;
  approved_amount: number;
  projected_month_amount: number;
  missing_rate_count: number;
}

export interface PayrollCashPlan {
  approved_hours: number;
  approved_amount: number;
  projected_month_amount: number;
  remaining_projection_amount: number;
  average_daily_amount: number;
  employees_with_hours: number;
  missing_rate_count: number;
  branch_payroll: PayrollBranchPoint[];
}

export interface FounderControlOverviewData {
  branches: FounderControlBranchOverview[];
  total_today_revenue: number;
  total_open_orders: number;
  total_employees: number;
  total_month_spending: number;
  total_branch_spending: number;
  total_company_shared_expenses: number;
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
    branch_cost_total: number;
    company_shared_expense_total: number;
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
  payroll_current_month: PayrollCashPlan;
  branch_revenue: BranchRevenuePoint[]; // live current-month revenue per branch
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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
  locale?: string | null;
}

export async function getFounderControlOverview({
  organizationId,
  accessibleRestaurantIds,
  timezone,
  locale,
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
    total_branch_spending: 0,
    total_company_shared_expenses: 0,
    branches_with_employees: 0,
    branches_with_open_orders: 0,
    current_month: {
      year,
      month,
      branch_count: 0,
      branches_with_snapshot: 0,
      branches_missing_snapshot: 0,
      revenue_total: 0,
      discount_total: 0,
      approved_labor_hours: 0,
      branch_cost_total: 0,
      company_shared_expense_total: 0,
      combined_cost_total: 0,
      gross_profit_estimate: 0,
    },
    attention: {
      branches_missing_snapshot: 0,
      branches_without_employees: 0,
      branches_with_open_orders: 0,
    },
    daily_revenue_30d: [],
    monthly_trend_6m: [],
    top_items_30d: [],
    payroll_current_month: {
      approved_hours: 0,
      approved_amount: 0,
      projected_month_amount: 0,
      remaining_projection_amount: 0,
      average_daily_amount: 0,
      employees_with_hours: 0,
      missing_rate_count: 0,
      branch_payroll: [],
    },
    branch_revenue: [],
  };

  if (branches.length === 0) return empty;

  const tz = timezone ?? DEFAULT_RESTAURANT_TIMEZONE;
  const branchIds = branches.map((b) => b.id);
  const localToday = getLocalDateString(tz);
  const dayRange = getLocalDayRange(localToday, tz);
  const mm = String(month).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const elapsedDaysForProjection = Math.max(
    1,
    Math.min(Number(localToday.slice(8, 10)) || 1, daysInMonth),
  );
  const fromDate = `${year}-${mm}-01`;
  const toDate = `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`;

  // 30-day window for daily chart and top items
  const dates30 = getLocalDateRange(localToday, 30);
  const rangeStart30 = dates30[0];
  const rangeEnd30 = localToday;
  const timezoneOffset = getTimezoneOffset(tz);
  const months6 = lastNMonths(6);
  const sixMonthStart = `${months6[0].year}-${String(months6[0].month).padStart(2, "0")}-01`;

  // ── Fetch in parallel ───────────────────────────────────────────────────────
  const [
    salesResult,
    openOrdersResult,
    employees,
    monthlyRollup,
    purchaseOrdersResult,
    expensesResult,
    monthOrdersResult,
    orders30dResult,
    purchaseOrders30dResult,
    expenses30dResult,
    companyExpensesResult,
    companyExpenses30dResult,
    companyExpenses6mResult,
    orders6mResult,
    purchaseOrders6mResult,
    expenses6mResult,
    attendanceMonthResult,
    payRatesResult,
  ] = await Promise.all([
    // Today's completed orders
    supabaseAdmin
      .from("orders")
      .select("restaurant_id, total_amount")
      .in("restaurant_id", branchIds)
      .eq("status", "completed")
      .gte("created_at", dayRange.start)
      .lte("created_at", dayRange.end),

    // Currently open orders
    supabaseAdmin
      .from("orders")
      .select("restaurant_id")
      .in("restaurant_id", branchIds)
      .not("status", "in", '("completed","canceled")'),

    listOrganizationEmployees(branchIds),

    getMonthlyRollupForBranches({ branchIds, year, month }),

    supabaseAdmin
      .from("purchase_orders")
      .select("restaurant_id, total_amount")
      .in("restaurant_id", branchIds)
      .neq("status", "cancelled")
      .gte("order_date", fromDate)
      .lte("order_date", toDate),

    supabaseAdmin
      .from("expenses")
      .select("restaurant_id, amount")
      .in("restaurant_id", branchIds)
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate),

    // Current-month completed orders for live month totals and branch leaders.
    supabaseAdmin
      .from("orders")
      .select("restaurant_id, total_amount, created_at")
      .in("restaurant_id", branchIds)
      .eq("status", "completed")
      .gte("created_at", `${fromDate}T00:00:00${timezoneOffset}`)
      .lte("created_at", `${toDate}T23:59:59.999${timezoneOffset}`),

    // Last 30 days of completed orders (for daily chart + top items)
    supabaseAdmin
      .from("orders")
      .select("id, restaurant_id, total_amount, created_at")
      .in("restaurant_id", branchIds)
      .eq("status", "completed")
      .gte("created_at", `${rangeStart30}T00:00:00${timezoneOffset}`)
      .lte("created_at", `${rangeEnd30}T23:59:59.999${timezoneOffset}`),

    supabaseAdmin
      .from("purchase_orders")
      .select("restaurant_id, total_amount, order_date")
      .in("restaurant_id", branchIds)
      .neq("status", "cancelled")
      .gte("order_date", rangeStart30)
      .lte("order_date", rangeEnd30),

    supabaseAdmin
      .from("expenses")
      .select("restaurant_id, amount, expense_date")
      .in("restaurant_id", branchIds)
      .gte("expense_date", rangeStart30)
      .lte("expense_date", rangeEnd30),

    supabaseAdmin
      .from("organization_finance_expenses")
      .select("amount, expense_date")
      .eq("organization_id", organizationId)
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate),

    supabaseAdmin
      .from("organization_finance_expenses")
      .select("amount, expense_date")
      .eq("organization_id", organizationId)
      .gte("expense_date", rangeStart30)
      .lte("expense_date", rangeEnd30),

    supabaseAdmin
      .from("organization_finance_expenses")
      .select("amount, expense_date")
      .eq("organization_id", organizationId)
      .gte("expense_date", sixMonthStart)
      .lte("expense_date", toDate),

    // Live six-month trend for the overview. Month close status is tracked
    // separately; this chart should not disappear while books are still open.
    supabaseAdmin
      .from("orders")
      .select("restaurant_id, total_amount, created_at")
      .in("restaurant_id", branchIds)
      .eq("status", "completed")
      .gte("created_at", `${sixMonthStart}T00:00:00${timezoneOffset}`)
      .lte("created_at", `${toDate}T23:59:59.999${timezoneOffset}`),

    supabaseAdmin
      .from("purchase_orders")
      .select("restaurant_id, total_amount, order_date")
      .in("restaurant_id", branchIds)
      .neq("status", "cancelled")
      .gte("order_date", sixMonthStart)
      .lte("order_date", toDate),

    supabaseAdmin
      .from("expenses")
      .select("restaurant_id, amount, expense_date")
      .in("restaurant_id", branchIds)
      .gte("expense_date", sixMonthStart)
      .lte("expense_date", toDate),

    supabaseAdmin
      .from("attendance_daily_summaries")
      .select("employee_id, restaurant_id, total_hours, status, work_date")
      .in("restaurant_id", branchIds)
      .eq("status", "approved")
      .gte("work_date", fromDate)
      .lte("work_date", toDate),

    supabaseAdmin
      .from("restaurant_role_pay_rates")
      .select("restaurant_id, job_title, hourly_rate, currency")
      .in("restaurant_id", branchIds),
  ]);

  // ── Today aggregates ────────────────────────────────────────────────────────
  const revenueByBranch = new Map<string, number>();
  for (const order of salesResult.data ?? []) {
    revenueByBranch.set(
      order.restaurant_id,
      (revenueByBranch.get(order.restaurant_id) ?? 0) +
        (order.total_amount ?? 0),
    );
  }

  const openOrdersByBranch = new Map<string, number>();
  for (const order of openOrdersResult.data ?? []) {
    openOrdersByBranch.set(
      order.restaurant_id,
      (openOrdersByBranch.get(order.restaurant_id) ?? 0) + 1,
    );
  }

  const employeeCountByBranch = new Map<string, number>();
  for (const emp of employees) {
    employeeCountByBranch.set(
      emp.restaurant_id,
      (employeeCountByBranch.get(emp.restaurant_id) ?? 0) + 1,
    );
  }

  const snapshotByBranch = new Map(
    monthlyRollup.snapshots.map((s) => [s.restaurant_id, s]),
  );
  const spendingByBranch = new Map<string, number>();

  for (const order of purchaseOrdersResult.data ?? []) {
    spendingByBranch.set(
      order.restaurant_id,
      (spendingByBranch.get(order.restaurant_id) ?? 0) +
        (order.total_amount ?? 0),
    );
  }

  for (const expense of expensesResult.data ?? []) {
    spendingByBranch.set(
      expense.restaurant_id,
      (spendingByBranch.get(expense.restaurant_id) ?? 0) +
        (expense.amount ?? 0),
    );
  }

  const monthRevenueByBranch = new Map<string, number>();
  for (const order of monthOrdersResult.data ?? []) {
    monthRevenueByBranch.set(
      order.restaurant_id,
      (monthRevenueByBranch.get(order.restaurant_id) ?? 0) +
        (order.total_amount ?? 0),
    );
  }

  const branchOverviews: FounderControlBranchOverview[] = branches.map(
    (branch) => {
      const snapshot = snapshotByBranch.get(branch.id);
      const monthly_revenue = monthRevenueByBranch.get(branch.id) ?? 0;
      const monthly_spending = spendingByBranch.get(branch.id) ?? 0;
      return {
        restaurant_id: branch.id,
        name: branch.name,
        subdomain: branch.subdomain,
        today_revenue: revenueByBranch.get(branch.id) ?? 0,
        open_orders_count: openOrdersByBranch.get(branch.id) ?? 0,
        employee_count: employeeCountByBranch.get(branch.id) ?? 0,
        has_closed_snapshot: Boolean(snapshot),
        monthly_revenue,
        monthly_gross_profit: monthly_revenue - monthly_spending,
        monthly_spending,
      };
    },
  );

  const branches_with_open_orders = branchOverviews.filter(
    (b) => b.open_orders_count > 0,
  ).length;
  const branches_with_employees = branchOverviews.filter(
    (b) => b.employee_count > 0,
  ).length;
  const branches_missing_snapshot =
    monthlyRollup.branch_count - monthlyRollup.branches_with_snapshot;
  const branches_without_employees =
    branchOverviews.length - branches_with_employees;
  const total_month_spending = branchOverviews.reduce(
    (sum, branch) => sum + branch.monthly_spending,
    0,
  );
  const total_company_shared_expenses = (
    companyExpensesResult.data ?? []
  ).reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const total_combined_month_spending =
    total_month_spending + total_company_shared_expenses;

  // ── Daily revenue chart (last 30 days) ─────────────────────────────────────
  const dailyMap = new Map<
    string,
    { revenue: number; expenses: number; orders: number }
  >();
  for (const date of dates30)
    dailyMap.set(date, { revenue: 0, expenses: 0, orders: 0 });

  const orders30 = orders30dResult.data ?? [];
  for (const order of orders30) {
    const localDate = bucketToLocalDate(order.created_at as string, tz);
    const bucket = dailyMap.get(localDate);
    if (bucket) {
      bucket.revenue += order.total_amount ?? 0;
      bucket.orders += 1;
    }
  }

  for (const order of purchaseOrders30dResult.data ?? []) {
    const bucket = dailyMap.get(order.order_date);
    if (bucket) {
      bucket.expenses += order.total_amount ?? 0;
    }
  }

  for (const expense of expenses30dResult.data ?? []) {
    const bucket = dailyMap.get(expense.expense_date);
    if (bucket) {
      bucket.expenses += Number(expense.amount ?? 0);
    }
  }

  for (const expense of companyExpenses30dResult.data ?? []) {
    const bucket = dailyMap.get(expense.expense_date);
    if (bucket) {
      bucket.expenses += Number(expense.amount ?? 0);
    }
  }

  const daily_revenue_30d: DailyRevenuPoint[] = Array.from(
    dailyMap.entries(),
  ).map(([date, v]) => ({
    date,
    ...v,
  }));

  // ── Monthly trend chart (last 6 months) ────────────────────────────────────
  const monthKey = (y: number, m: number) =>
    `${y}-${String(m).padStart(2, "0")}`;

  // Aggregate live completed revenue and all known costs by month.
  const monthlyMap = new Map<
    string,
    {
      revenue: number;
      expenses: number;
      gross_profit: number;
      order_count: number;
    }
  >();
  for (const m of months6)
    monthlyMap.set(monthKey(m.year, m.month), {
      revenue: 0,
      expenses: 0,
      gross_profit: 0,
      order_count: 0,
    });

  for (const order of orders6mResult.data ?? []) {
    const localDate = bucketToLocalDate(order.created_at as string, tz);
    const [orderYear, orderMonth] = localDate.split("-").map(Number);
    const key = monthKey(orderYear, orderMonth);
    const bucket = monthlyMap.get(key);
    if (bucket) {
      bucket.revenue += Number(order.total_amount ?? 0);
      bucket.gross_profit += Number(order.total_amount ?? 0);
      bucket.order_count += 1;
    }
  }

  for (const order of purchaseOrders6mResult.data ?? []) {
    const [orderYear, orderMonth] = order.order_date.split("-").map(Number);
    const key = monthKey(orderYear, orderMonth);
    const bucket = monthlyMap.get(key);
    if (bucket) {
      const amount = Number(order.total_amount ?? 0);
      bucket.expenses += amount;
      bucket.gross_profit -= amount;
    }
  }

  for (const expense of expenses6mResult.data ?? []) {
    const [expenseYear, expenseMonth] = expense.expense_date
      .split("-")
      .map(Number);
    const key = monthKey(expenseYear, expenseMonth);
    const bucket = monthlyMap.get(key);
    if (bucket) {
      const amount = Number(expense.amount ?? 0);
      bucket.expenses += amount;
      bucket.gross_profit -= amount;
    }
  }

  for (const expense of (companyExpenses6mResult.data ?? []) as Array<{
    amount: number | null;
    expense_date: string;
  }>) {
    const [expenseYear, expenseMonth] = expense.expense_date
      .split("-")
      .map(Number);
    const key = monthKey(expenseYear, expenseMonth);
    const bucket = monthlyMap.get(key);
    if (bucket) {
      const amount = Number(expense.amount ?? 0);
      bucket.expenses += amount;
      bucket.gross_profit -= amount;
    }
  }

  const monthly_trend_6m: MonthlyTrendPoint[] = months6.map(
    ({ year: y, month: m }) => {
      const key = monthKey(y, m);
      const bucket = monthlyMap.get(key) ?? {
        revenue: 0,
        expenses: 0,
        gross_profit: 0,
        order_count: 0,
      };
      return {
        label: SHORT_MONTHS[m - 1],
        yearMonth: `${y}/${String(m).padStart(2, "0")}`,
        ...bucket,
      };
    },
  );

  // ── Top menu items (last 30 days) ───────────────────────────────────────────
  let top_items_30d: TopMenuItem[] = [];
  const orderIds = orders30.map((o) => o.id as string);

  if (orderIds.length > 0) {
    const { data: itemRows } = await supabaseAdmin
      .from("order_items")
      .select(
        `
          menu_item_id,
          quantity,
          price_at_order,
          menu_items!inner (
            id,
            name_en,
            name_ja,
            name_vi
          )
        `,
      )
      .in("restaurant_id", branchIds)
      .in("order_id", orderIds)
      .neq("status", "canceled");

    type MenuItemNameRow = {
      id: string;
      name_en: string | null;
      name_ja: string | null;
      name_vi: string | null;
    };
    type OrderItemTopRow = {
      menu_item_id: string | null;
      quantity: number | null;
      price_at_order: number | string | null;
      menu_items: MenuItemNameRow | MenuItemNameRow[] | null;
    };
    const getLocalizedMenuName = (menuItem: MenuItemNameRow) => {
      const names =
        locale === "ja"
          ? [menuItem.name_ja, menuItem.name_en, menuItem.name_vi]
          : locale === "vi"
            ? [menuItem.name_vi, menuItem.name_en, menuItem.name_ja]
            : [menuItem.name_en, menuItem.name_ja, menuItem.name_vi];
      return names.find((name) => Boolean(name?.trim())) ?? menuItem.id;
    };

    const itemMap = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();
    for (const row of (itemRows ?? []) as OrderItemTopRow[]) {
      const menuItem = Array.isArray(row.menu_items)
        ? row.menu_items[0]
        : row.menu_items;
      const itemId = row.menu_item_id ?? menuItem?.id;
      if (!itemId || !menuItem) continue;
      const existing = itemMap.get(itemId) ?? {
        name: getLocalizedMenuName(menuItem),
        quantity: 0,
        revenue: 0,
      };
      const quantity = row.quantity ?? 1;
      const price =
        typeof row.price_at_order === "string"
          ? Number(row.price_at_order)
          : (row.price_at_order ?? 0);
      itemMap.set(itemId, {
        name: existing.name,
        quantity: existing.quantity + quantity,
        revenue: existing.revenue + price * quantity,
      });
    }
    top_items_30d = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }

  // ── Payroll cash plan (current month) ──────────────────────────────────────
  const employeeById = new Map(
    employees.map((employee) => [employee.employee_id, employee]),
  );
  const branchNameById = new Map(
    branches.map((branch) => [branch.id, branch.name]),
  );
  const payRateByRole = new Map<string, number>();
  for (const row of (payRatesResult.data ?? []) as Array<{
    restaurant_id: string | null;
    job_title: string | null;
    hourly_rate: number | string | null;
  }>) {
    if (!row.restaurant_id || !row.job_title) continue;
    payRateByRole.set(
      `${row.restaurant_id}:${row.job_title}`,
      Number(row.hourly_rate ?? 0),
    );
  }

  const payrollBranchMap = new Map<
    string,
    {
      restaurant_id: string;
      name: string;
      approved_hours: number;
      approved_amount: number;
      missing_rate_keys: Set<string>;
    }
  >();
  const employeesWithApprovedHours = new Set<string>();
  const missingRateKeys = new Set<string>();
  let payrollApprovedHours = 0;
  let payrollApprovedAmount = 0;

  for (const row of (attendanceMonthResult.data ?? []) as Array<{
    employee_id: string | null;
    restaurant_id: string | null;
    total_hours: number | null;
  }>) {
    if (!row.employee_id) continue;
    const employee = employeeById.get(row.employee_id);
    const restaurantId = row.restaurant_id ?? employee?.restaurant_id;
    const jobTitle = employee?.job_title;
    const approvedHours = Number(row.total_hours ?? 0);
    if (!restaurantId || !jobTitle || approvedHours <= 0) continue;

    employeesWithApprovedHours.add(row.employee_id);
    payrollApprovedHours += approvedHours;

    const branchPayroll = payrollBranchMap.get(restaurantId) ?? {
      restaurant_id: restaurantId,
      name: branchNameById.get(restaurantId) ?? employee?.restaurant_name ?? "",
      approved_hours: 0,
      approved_amount: 0,
      missing_rate_keys: new Set<string>(),
    };
    branchPayroll.approved_hours += approvedHours;

    const rateKey = `${restaurantId}:${jobTitle}`;
    const hourlyRate = payRateByRole.get(rateKey);
    if (hourlyRate == null) {
      missingRateKeys.add(rateKey);
      branchPayroll.missing_rate_keys.add(rateKey);
    } else {
      const amount = approvedHours * hourlyRate;
      payrollApprovedAmount += amount;
      branchPayroll.approved_amount += amount;
    }
    payrollBranchMap.set(restaurantId, branchPayroll);
  }

  const payrollProjectedMonthAmount =
    payrollApprovedAmount > 0
      ? (payrollApprovedAmount / elapsedDaysForProjection) * daysInMonth
      : 0;
  const payroll_current_month: PayrollCashPlan = {
    approved_hours: Number(payrollApprovedHours.toFixed(2)),
    approved_amount: Math.round(payrollApprovedAmount),
    projected_month_amount: Math.round(payrollProjectedMonthAmount),
    remaining_projection_amount: Math.max(
      0,
      Math.round(payrollProjectedMonthAmount - payrollApprovedAmount),
    ),
    average_daily_amount: Math.round(
      payrollApprovedAmount / elapsedDaysForProjection,
    ),
    employees_with_hours: employeesWithApprovedHours.size,
    missing_rate_count: missingRateKeys.size,
    branch_payroll: Array.from(payrollBranchMap.values())
      .map((branch) => {
        const projected =
          branch.approved_amount > 0
            ? (branch.approved_amount / elapsedDaysForProjection) * daysInMonth
            : 0;
        return {
          restaurant_id: branch.restaurant_id,
          name: branch.name,
          approved_hours: Number(branch.approved_hours.toFixed(2)),
          approved_amount: Math.round(branch.approved_amount),
          projected_month_amount: Math.round(projected),
          missing_rate_count: branch.missing_rate_keys.size,
        };
      })
      .sort((a, b) => b.projected_month_amount - a.projected_month_amount),
  };

  // ── Branch revenue comparison (live current-month completed orders) ─────────
  const branch_revenue: BranchRevenuePoint[] = branchOverviews
    .map((b) => ({
      name: b.name,
      revenue: b.monthly_revenue,
      expenses: b.monthly_spending,
      gross_profit: b.monthly_gross_profit,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const live_month_revenue_total = branchOverviews.reduce(
    (sum, branch) => sum + branch.monthly_revenue,
    0,
  );
  const live_month_gross_profit_estimate =
    live_month_revenue_total - total_combined_month_spending;

  return {
    branches: branchOverviews,
    total_today_revenue: branchOverviews.reduce(
      (s, b) => s + b.today_revenue,
      0,
    ),
    total_open_orders: branchOverviews.reduce(
      (s, b) => s + b.open_orders_count,
      0,
    ),
    total_employees: employees.length,
    total_month_spending: total_combined_month_spending,
    total_branch_spending: total_month_spending,
    total_company_shared_expenses,
    branches_with_employees,
    branches_with_open_orders,
    current_month: {
      year,
      month,
      branch_count: monthlyRollup.branch_count,
      branches_with_snapshot: monthlyRollup.branches_with_snapshot,
      branches_missing_snapshot,
      revenue_total: live_month_revenue_total,
      discount_total: monthlyRollup.discount_total,
      approved_labor_hours: monthlyRollup.approved_labor_hours,
      branch_cost_total: total_month_spending,
      company_shared_expense_total: total_company_shared_expenses,
      combined_cost_total: total_combined_month_spending,
      gross_profit_estimate: live_month_gross_profit_estimate,
    },
    attention: {
      branches_missing_snapshot,
      branches_without_employees,
      branches_with_open_orders,
    },
    daily_revenue_30d,
    monthly_trend_6m,
    top_items_30d,
    payroll_current_month,
    branch_revenue,
  };
}
