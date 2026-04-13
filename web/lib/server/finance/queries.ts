// Finance domain — raw database queries for Phase 6.
// Route handlers call service functions; avoid calling these directly from routes.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { MonthlyFinanceSnapshot, UpsertSnapshotInput, LiveMonthlySummary } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getSnapshot(
  restaurantId: string,
  year: number,
  month: number
): Promise<MonthlyFinanceSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from('monthly_finance_snapshots')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) throw new Error(`getSnapshot: ${error.message}`);
  return data as MonthlyFinanceSnapshot | null;
}

export async function listSnapshots(
  restaurantId: string,
  limit = 12
): Promise<MonthlyFinanceSnapshot[]> {
  const { data, error } = await supabaseAdmin
    .from('monthly_finance_snapshots')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`listSnapshots: ${error.message}`);
  return (data ?? []) as MonthlyFinanceSnapshot[];
}

export async function upsertSnapshot(
  restaurantId: string,
  input: UpsertSnapshotInput
): Promise<MonthlyFinanceSnapshot> {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('monthly_finance_snapshots')
    .upsert(
      {
        restaurant_id: restaurantId,
        year: input.year,
        month: input.month,
        currency: input.currency,
        revenue_total: input.revenue_total,
        order_count: input.order_count,
        discount_total: input.discount_total,
        approved_labor_hours: input.approved_labor_hours,
        labor_entry_count: input.labor_entry_count,
        purchasing_total: input.purchasing_total,
        expense_total: input.expense_total,
        combined_cost_total: input.combined_cost_total,
        snapshot_status: input.snapshot_status,
        notes: input.notes ?? null,
        closed_by: input.closed_by ?? null,
        closed_at: input.closed_at ?? null,
        updated_at: now,
      },
      { onConflict: 'restaurant_id,year,month' }
    )
    .select('*')
    .single();

  if (error) throw new Error(`upsertSnapshot: ${error.message}`);
  return data as MonthlyFinanceSnapshot;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live aggregates — compute fresh from operational tables
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute revenue for a calendar month from completed orders.
 * Uses created_at for order date (Japan-local range passed by service layer).
 */
export async function computeRevenue(
  restaurantId: string,
  fromDate: string, // YYYY-MM-DD
  toDate: string    // YYYY-MM-DD
): Promise<{ revenue_total: number; order_count: number }> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('total_amount')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'completed')
    .gte('created_at', `${fromDate}T00:00:00+09:00`)
    .lte('created_at', `${toDate}T23:59:59+09:00`);

  if (error) throw new Error(`computeRevenue: ${error.message}`);

  const rows = (data ?? []) as Array<{ total_amount: number | null }>;
  const revenue_total = rows.reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
  return { revenue_total, order_count: rows.length };
}

/**
 * Compute approved labor hours from attendance_daily_summaries.
 * Only sums summaries with status = 'approved' and total_hours not null.
 */
export async function computeLaborHours(
  restaurantId: string,
  fromDate: string, // YYYY-MM-DD
  toDate: string    // YYYY-MM-DD
): Promise<{ approved_labor_hours: number; labor_entry_count: number }> {
  const { data, error } = await supabaseAdmin
    .from('attendance_daily_summaries')
    .select('total_hours')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'approved')
    .gte('work_date', fromDate)
    .lte('work_date', toDate)
    .not('total_hours', 'is', null);

  if (error) throw new Error(`computeLaborHours: ${error.message}`);

  const rows = (data ?? []) as Array<{ total_hours: number | null }>;
  const approved_labor_hours = rows.reduce((sum, r) => sum + (r.total_hours ?? 0), 0);
  return {
    approved_labor_hours: parseFloat(approved_labor_hours.toFixed(2)),
    labor_entry_count: rows.length,
  };
}

/**
 * Compute purchasing totals from purchase_orders + expenses (Phase 5 tables).
 * Excludes cancelled purchase orders.
 */
export async function computePurchasing(
  restaurantId: string,
  fromDate: string,
  toDate: string,
  currency: string
): Promise<{ purchasing_total: number; expense_total: number; combined_cost_total: number }> {
  const [ordersResult, expensesResult] = await Promise.all([
    supabaseAdmin
      .from('purchase_orders')
      .select('total_amount')
      .eq('restaurant_id', restaurantId)
      .eq('currency', currency)
      .neq('status', 'cancelled')
      .gte('order_date', fromDate)
      .lte('order_date', toDate),
    supabaseAdmin
      .from('expenses')
      .select('amount')
      .eq('restaurant_id', restaurantId)
      .eq('currency', currency)
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate),
  ]);

  if (ordersResult.error) throw new Error(`computePurchasing orders: ${ordersResult.error.message}`);
  if (expensesResult.error) throw new Error(`computePurchasing expenses: ${expensesResult.error.message}`);

  const purchasing_total = (ordersResult.data ?? []).reduce(
    (sum, r: { total_amount: number | null }) => sum + (r.total_amount ?? 0),
    0
  );
  const expense_total = (expensesResult.data ?? []).reduce(
    (sum, r: { amount: number | null }) => sum + (r.amount ?? 0),
    0
  );

  return {
    purchasing_total,
    expense_total,
    combined_cost_total: purchasing_total + expense_total,
  };
}

/**
 * Fetch all branch restaurant IDs that belong to an organization.
 * Used for org-level rollup.
 */
export async function getBranchIdsForOrg(organizationId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('organization_restaurants')
    .select('restaurant_id')
    .eq('organization_id', organizationId);

  if (error) throw new Error(`getBranchIdsForOrg: ${error.message}`);
  return (data ?? []).map((r: { restaurant_id: string }) => r.restaurant_id);
}

/**
 * Get the most recent closed snapshot for each of the given restaurant IDs.
 * Used for org-level rollup display.
 */
export async function getClosedSnapshotsForBranches(
  restaurantIds: string[],
  year: number,
  month: number
): Promise<MonthlyFinanceSnapshot[]> {
  if (restaurantIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('monthly_finance_snapshots')
    .select('*')
    .in('restaurant_id', restaurantIds)
    .eq('year', year)
    .eq('month', month)
    .eq('snapshot_status', 'closed');

  if (error) throw new Error(`getClosedSnapshotsForBranches: ${error.message}`);
  return (data ?? []) as MonthlyFinanceSnapshot[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function buildLiveSummary(params: {
  year: number;
  month: number;
  currency: string;
  revenue_total: number;
  order_count: number;
  approved_labor_hours: number;
  labor_entry_count: number;
  purchasing_total: number;
  expense_total: number;
  combined_cost_total: number;
}): LiveMonthlySummary {
  return {
    ...params,
    discount_total: 0,
    gross_profit_estimate: params.revenue_total - params.combined_cost_total,
  };
}
