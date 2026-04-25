import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTimezoneOffset } from "@/lib/server/dashboard/dates";
import {
  expenseCategoryValues,
  purchaseCategoryValues,
} from "@/lib/server/purchasing/schemas";

export interface BranchFinanceRecentSale {
  id: string;
  created_at: string;
  total_amount: number;
  item_count: number;
  table_name: string | null;
}

export interface BranchFinanceRecentExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
}

export interface BranchFinanceRecentPurchase {
  id: string;
  category: string;
  supplier_name: string | null;
  status: string;
  order_date: string;
  total_amount: number;
  currency: string;
  is_paid: boolean;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
}

export interface BranchFinanceCategorySpend {
  category: string;
  amount: number;
}

export interface BranchFinanceDetailData {
  recentSales: BranchFinanceRecentSale[];
  recentExpenses: BranchFinanceRecentExpense[];
  recentPurchases: BranchFinanceRecentPurchase[];
  expenseCategorySpend: BranchFinanceCategorySpend[];
  purchaseCategorySpend: BranchFinanceCategorySpend[];
}

function monthBoundaries(
  year: number,
  month: number,
): { fromDate: string; toDate: string } {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    fromDate: `${year}-${mm}-01`,
    toDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

async function loadCreatorMap(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", userIds);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const label = row.name ?? row.email ?? null;
    if (label) {
      map.set(row.id as string, label);
    }
  }
  return map;
}

export async function getBranchFinanceDetail(params: {
  branchId: string;
  year: number;
  month: number;
  timezone?: string | null;
}): Promise<BranchFinanceDetailData> {
  const { branchId, year, month, timezone } = params;
  const { fromDate, toDate } = monthBoundaries(year, month);
  const timezoneOffset = getTimezoneOffset(timezone ?? "Asia/Tokyo");

  const [salesResult, expensesResult, purchasesResult] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select(
        "id, total_amount, created_at, tables(name), order_items(quantity)",
      )
      .eq("restaurant_id", branchId)
      .eq("status", "completed")
      .gte("created_at", `${fromDate}T00:00:00${timezoneOffset}`)
      .lte("created_at", `${toDate}T23:59:59.999${timezoneOffset}`)
      .order("created_at", { ascending: false })
      .limit(20),

    supabaseAdmin
      .from("expenses")
      .select("*")
      .eq("restaurant_id", branchId)
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),

    supabaseAdmin
      .from("purchase_orders")
      .select("*")
      .eq("restaurant_id", branchId)
      .neq("status", "cancelled")
      .gte("order_date", fromDate)
      .lte("order_date", toDate)
      .order("order_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (salesResult.error)
    throw new Error(
      `getBranchFinanceDetail sales: ${salesResult.error.message}`,
    );
  if (expensesResult.error)
    throw new Error(
      `getBranchFinanceDetail expenses: ${expensesResult.error.message}`,
    );
  if (purchasesResult.error)
    throw new Error(
      `getBranchFinanceDetail purchases: ${purchasesResult.error.message}`,
    );

  const creatorIds = [
    ...(expensesResult.data ?? []).map((row) => row.created_by).filter(Boolean),
    ...(purchasesResult.data ?? [])
      .map((row) => row.created_by)
      .filter(Boolean),
  ] as string[];
  const creatorMap = await loadCreatorMap(Array.from(new Set(creatorIds)));

  const recentSales: BranchFinanceRecentSale[] = (salesResult.data ?? []).map(
    (row) => {
      const tables = Array.isArray(row.tables) ? row.tables[0] : row.tables;
      const itemCount = (row.order_items ?? []).reduce(
        (sum: number, item: { quantity?: number | null }) =>
          sum + (item.quantity ?? 0),
        0,
      );

      return {
        id: row.id as string,
        created_at: row.created_at as string,
        total_amount: (row.total_amount as number | null) ?? 0,
        item_count: itemCount,
        table_name: (tables?.name as string | null) ?? null,
      };
    },
  );

  const expenseCategorySpend = expenseCategoryValues.map((category) => ({
    category,
    amount: (expensesResult.data ?? [])
      .filter((row) => row.category === category)
      .reduce((sum, row) => sum + ((row.amount as number | null) ?? 0), 0),
  }));

  const purchaseCategorySpend = purchaseCategoryValues.map((category) => ({
    category,
    amount: (purchasesResult.data ?? [])
      .filter((row) => row.category === category)
      .reduce(
        (sum, row) => sum + ((row.total_amount as number | null) ?? 0),
        0,
      ),
  }));

  const recentExpenses: BranchFinanceRecentExpense[] = (
    expensesResult.data ?? []
  ).map((row) => ({
    id: row.id as string,
    category: row.category as string,
    description: row.description as string,
    amount: (row.amount as number | null) ?? 0,
    currency: (row.currency as string | null) ?? "JPY",
    expense_date: row.expense_date as string,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    created_by: (row.created_by as string | null) ?? null,
    created_by_name:
      ((row.created_by as string | null) &&
        creatorMap.get(row.created_by as string)) ??
      null,
  }));

  const recentPurchases: BranchFinanceRecentPurchase[] = (
    purchasesResult.data ?? []
  ).map((row) => ({
    id: row.id as string,
    category: row.category as string,
    supplier_name: (row.supplier_name as string | null) ?? null,
    status: row.status as string,
    order_date: row.order_date as string,
    total_amount: (row.total_amount as number | null) ?? 0,
    currency: (row.currency as string | null) ?? "JPY",
    is_paid: Boolean(row.is_paid),
    created_at: row.created_at as string,
    created_by: (row.created_by as string | null) ?? null,
    created_by_name:
      ((row.created_by as string | null) &&
        creatorMap.get(row.created_by as string)) ??
      null,
  }));

  return {
    recentSales,
    recentExpenses,
    recentPurchases,
    expenseCategorySpend,
    purchaseCategorySpend,
  };
}
