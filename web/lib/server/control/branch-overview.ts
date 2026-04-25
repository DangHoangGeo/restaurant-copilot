// Per-branch overview data for the branch detail dashboard.
// Fetches today's revenue, open orders, employee count, and month close status
// for a single branch.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  bucketToLocalDate,
  DEFAULT_RESTAURANT_TIMEZONE,
  getLocalDateRange,
  getLocalDateString,
  getLocalDayRange,
  getTimezoneOffset,
} from "@/lib/server/dashboard/dates";
import {
  getMonthlyRollupForBranches,
  parseYearMonth,
} from "@/lib/server/finance/service";
import { listOrganizationEmployees } from "@/lib/server/organizations/queries";

export interface BranchTopItem {
  item_name: string;
  quantity: number;
  revenue: number;
}

export interface BranchRevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface BranchOverviewData {
  today_revenue: number;
  today_order_count: number;
  open_orders_count: number;
  employee_count: number;
  month: {
    year: number;
    month: number;
    has_closed_snapshot: boolean;
    revenue_total: number;
    gross_profit: number;
    spending_total: number;
  };
  sales_last_14d: BranchRevenuePoint[];
  top_items_30d: BranchTopItem[];
}

export async function getBranchOverview(
  restaurantId: string,
  timezone?: string | null,
  locale?: string | null,
): Promise<BranchOverviewData> {
  const tz = timezone ?? DEFAULT_RESTAURANT_TIMEZONE;
  const localToday = getLocalDateString(tz);
  const dayRange = getLocalDayRange(localToday, tz);
  const dates14 = getLocalDateRange(localToday, 14);
  const dates30 = getLocalDateRange(localToday, 30);
  const rangeStart14 = dates14[0];
  const rangeStart30 = dates30[0];
  const timezoneOffset = getTimezoneOffset(tz);
  const { year, month } = parseYearMonth(null, null);
  const mm = String(month).padStart(2, "0");
  const fromDate = `${year}-${mm}-01`;
  const toDate = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

  const [
    todaySalesResult,
    openOrdersResult,
    employees,
    monthlyRollup,
    purchaseOrdersResult,
    expensesResult,
    monthOrdersResult,
    orders14dResult,
    orders30dResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id, total_amount")
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed")
      .gte("created_at", dayRange.start)
      .lte("created_at", dayRange.end),

    supabaseAdmin
      .from("orders")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .not("status", "in", '("completed","canceled")'),

    listOrganizationEmployees([restaurantId]),

    getMonthlyRollupForBranches({ branchIds: [restaurantId], year, month }),

    supabaseAdmin
      .from("purchase_orders")
      .select("total_amount")
      .eq("restaurant_id", restaurantId)
      .neq("status", "cancelled")
      .gte("order_date", fromDate)
      .lte("order_date", toDate),

    supabaseAdmin
      .from("expenses")
      .select("amount")
      .eq("restaurant_id", restaurantId)
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate),

    supabaseAdmin
      .from("orders")
      .select("id, total_amount")
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed")
      .gte("created_at", `${fromDate}T00:00:00${timezoneOffset}`)
      .lte("created_at", `${toDate}T23:59:59.999${timezoneOffset}`),

    supabaseAdmin
      .from("orders")
      .select("id, total_amount, created_at")
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed")
      .gte("created_at", `${rangeStart14}T00:00:00${timezoneOffset}`)
      .lte("created_at", `${localToday}T23:59:59.999${timezoneOffset}`),

    supabaseAdmin
      .from("orders")
      .select("id, total_amount, created_at")
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed")
      .gte("created_at", `${rangeStart30}T00:00:00${timezoneOffset}`)
      .lte("created_at", `${localToday}T23:59:59.999${timezoneOffset}`),
  ]);

  const today_revenue = (todaySalesResult.data ?? []).reduce(
    (sum, order) => sum + Number(order.total_amount ?? 0),
    0,
  );
  const today_order_count = todaySalesResult.data?.length ?? 0;
  const open_orders_count = openOrdersResult.data?.length ?? 0;
  const employee_count = employees.length;
  const snapshot = monthlyRollup.snapshots[0] ?? null;
  const spending_total =
    (purchaseOrdersResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.total_amount ?? 0),
      0,
    ) +
    (expensesResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
  const live_month_revenue = (monthOrdersResult.data ?? []).reduce(
    (sum, order) => sum + Number(order.total_amount ?? 0),
    0,
  );

  const salesMap = new Map<string, { revenue: number; orders: number }>();
  for (const date of dates14) {
    salesMap.set(date, { revenue: 0, orders: 0 });
  }

  for (const order of orders14dResult.data ?? []) {
    const localDate = bucketToLocalDate(order.created_at as string, tz);
    const bucket = salesMap.get(localDate);
    if (!bucket) continue;
    bucket.revenue += Number(order.total_amount ?? 0);
    bucket.orders += 1;
  }

  const sales_last_14d: BranchRevenuePoint[] = Array.from(
    salesMap.entries(),
  ).map(([date, value]) => ({
    date,
    ...value,
  }));

  const orderIds30d = (orders30dResult.data ?? []).map((order) => order.id);
  let top_items_30d: BranchTopItem[] = [];

  if (orderIds30d.length > 0) {
    const topItemsResult = await supabaseAdmin
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
      .eq("restaurant_id", restaurantId)
      .in("order_id", orderIds30d)
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
      { item_name: string; quantity: number; revenue: number }
    >();
    for (const row of (topItemsResult.data ?? []) as OrderItemTopRow[]) {
      const menuItem = Array.isArray(row.menu_items)
        ? row.menu_items[0]
        : row.menu_items;
      const itemId = row.menu_item_id ?? menuItem?.id;
      if (!itemId || !menuItem) continue;
      const existing = itemMap.get(itemId) ?? {
        item_name: getLocalizedMenuName(menuItem),
        quantity: 0,
        revenue: 0,
      };
      const quantity = row.quantity ?? 1;
      const price =
        typeof row.price_at_order === "string"
          ? Number(row.price_at_order)
          : (row.price_at_order ?? 0);
      itemMap.set(itemId, {
        item_name: existing.item_name,
        quantity: existing.quantity + quantity,
        revenue: existing.revenue + price * quantity,
      });
    }
    top_items_30d = Array.from(itemMap.values())
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
      revenue_total: live_month_revenue,
      gross_profit: live_month_revenue - spending_total,
      spending_total,
    },
    sales_last_14d,
    top_items_30d,
  };
}
