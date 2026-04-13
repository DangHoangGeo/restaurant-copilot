// Finance domain service layer — Phase 6 Monthly Finance Close.
// Route handlers call these functions, not the queries module directly.
//
// Key invariants:
//  - Revenue uses only completed orders (status = 'completed').
//  - Labor uses only approved attendance summaries (status = 'approved').
//  - Purchasing excludes cancelled purchase orders.
//  - A closed snapshot is immutable — callers must not re-close an already closed month.
//  - restaurant_id always comes from the authenticated session, never from the request body.

import {
  getSnapshot,
  listSnapshots,
  upsertSnapshot,
  computeRevenue,
  computeLaborHours,
  computePurchasing,
  buildLiveSummary,
  getBranchIdsForOrg,
  getClosedSnapshotsForBranches,
} from './queries';
import { getJapanLocalDate } from '@/lib/server/attendance/service';
import type {
  MonthlyFinanceReport,
  MonthlyFinanceSnapshot,
  LiveMonthlySummary,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return Japan-local today's YYYY-MM-DD for the given month boundaries. */
function monthBoundaries(year: number, month: number): { fromDate: string; toDate: string } {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    fromDate: `${year}-${mm}-01`,
    toDate:   `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Parse YYYY-MM-DD into { year, month }. Falls back to current Japan-local month. */
export function parseYearMonth(
  yearStr: string | null,
  monthStr: string | null
): { year: number; month: number } {
  const today = getJapanLocalDate();
  const [defaultYear, defaultMonth] = today.split('-').map(Number);

  const year  = yearStr  ? parseInt(yearStr,  10) : defaultYear;
  const month = monthStr ? parseInt(monthStr, 10) : defaultMonth;

  if (isNaN(year) || isNaN(month) || year < 2020 || year > 2100 || month < 1 || month > 12) {
    throw Object.assign(new Error('Invalid year or month'), { status: 400 });
  }
  return { year, month };
}

// ─────────────────────────────────────────────────────────────────────────────
// Live compute
// ─────────────────────────────────────────────────────────────────────────────

async function computeLiveSummary(
  restaurantId: string,
  year: number,
  month: number,
  currency: string
): Promise<LiveMonthlySummary> {
  const { fromDate, toDate } = monthBoundaries(year, month);

  const [revenue, labor, purchasing] = await Promise.all([
    computeRevenue(restaurantId, fromDate, toDate),
    computeLaborHours(restaurantId, fromDate, toDate),
    computePurchasing(restaurantId, fromDate, toDate, currency),
  ]);

  return buildLiveSummary({
    year,
    month,
    currency,
    ...revenue,
    ...labor,
    ...purchasing,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the finance report for a given branch + month.
 * If a closed snapshot exists, return it verbatim (kind = 'snapshot').
 * Otherwise compute live from operational tables (kind = 'live').
 */
export async function getMonthlyReport(
  restaurantId: string,
  year: number,
  month: number,
  currency: string
): Promise<MonthlyFinanceReport> {
  const existing = await getSnapshot(restaurantId, year, month);

  if (existing && existing.snapshot_status === 'closed') {
    return { kind: 'snapshot', data: existing };
  }

  const live = await computeLiveSummary(restaurantId, year, month, currency);
  return { kind: 'live', data: live };
}

/**
 * Close (freeze) a month.
 * Recomputes live totals, writes them into a closed snapshot, and returns it.
 * Throws 409 if the month is already closed.
 */
export async function closeMonth(params: {
  restaurantId: string;
  year: number;
  month: number;
  currency: string;
  closedBy: string;
  notes?: string | null;
}): Promise<MonthlyFinanceSnapshot> {
  const { restaurantId, year, month, currency, closedBy, notes } = params;

  const existing = await getSnapshot(restaurantId, year, month);
  if (existing?.snapshot_status === 'closed') {
    throw Object.assign(
      new Error('This month is already closed. Reopen is not supported.'),
      { status: 409 }
    );
  }

  const live = await computeLiveSummary(restaurantId, year, month, currency);

  return upsertSnapshot(restaurantId, {
    year,
    month,
    currency,
    revenue_total:        live.revenue_total,
    order_count:          live.order_count,
    discount_total:       live.discount_total,
    approved_labor_hours: live.approved_labor_hours,
    labor_entry_count:    live.labor_entry_count,
    purchasing_total:     live.purchasing_total,
    expense_total:        live.expense_total,
    combined_cost_total:  live.combined_cost_total,
    snapshot_status:      'closed',
    notes:                notes ?? null,
    closed_by:            closedBy,
    closed_at:            new Date().toISOString(),
  });
}

/**
 * List the last N months of snapshots for a branch (closed or draft).
 */
export async function listMonthlySnapshots(
  restaurantId: string,
  limit = 12
): Promise<MonthlyFinanceSnapshot[]> {
  return listSnapshots(restaurantId, limit);
}

/**
 * Org-level monthly rollup: aggregate closed snapshots across all branches
 * in the organization. Branches without a closed snapshot for that month
 * are excluded from totals (noted in result metadata).
 */
export async function getOrgMonthlyRollup(params: {
  organizationId: string;
  year: number;
  month: number;
}): Promise<{
  year: number;
  month: number;
  branch_count: number;
  branches_with_snapshot: number;
  revenue_total: number;
  approved_labor_hours: number;
  combined_cost_total: number;
  gross_profit_estimate: number;
  snapshots: MonthlyFinanceSnapshot[];
}> {
  const { organizationId, year, month } = params;

  const branchIds = await getBranchIdsForOrg(organizationId);
  const snapshots = await getClosedSnapshotsForBranches(branchIds, year, month);

  const revenue_total        = snapshots.reduce((s, r) => s + r.revenue_total, 0);
  const approved_labor_hours = snapshots.reduce((s, r) => s + r.approved_labor_hours, 0);
  const combined_cost_total  = snapshots.reduce((s, r) => s + r.combined_cost_total, 0);
  const gross_profit_estimate = revenue_total - combined_cost_total;

  return {
    year,
    month,
    branch_count: branchIds.length,
    branches_with_snapshot: snapshots.length,
    revenue_total,
    approved_labor_hours: parseFloat(approved_labor_hours.toFixed(2)),
    combined_cost_total,
    gross_profit_estimate,
    snapshots,
  };
}

/**
 * Build a CSV string for a single monthly report (live or closed snapshot).
 * Suitable for accountant or tax-prep handoff.
 */
export function buildExportCsv(
  report: MonthlyFinanceReport,
  restaurantName: string
): string {
  const d = report.kind === 'snapshot' ? report.data : report.data;
  const status = report.kind === 'snapshot' ? report.data.snapshot_status : 'live';

  const fmt = (n: number) => n.toFixed(2);

  const rows: string[][] = [
    ['Monthly Finance Report'],
    ['Branch', restaurantName],
    ['Period', `${d.year}-${String(d.month).padStart(2, '0')}`],
    ['Status', status],
    ['Currency', d.currency],
    [],
    ['Category', 'Amount', 'Count / Hours'],
    ['Revenue (completed orders)', fmt(d.revenue_total), String(d.order_count)],
    ['Discounts', fmt(d.discount_total), ''],
    ['Net Revenue', fmt(d.revenue_total - d.discount_total), ''],
    [],
    ['Approved Labor Hours', fmt(d.approved_labor_hours), String(d.labor_entry_count)],
    [],
    ['Purchase Orders', fmt(d.purchasing_total), ''],
    ['Other Expenses', fmt(d.expense_total), ''],
    ['Total Costs', fmt(d.combined_cost_total), ''],
    [],
    ['Gross Profit Estimate', fmt(d.gross_profit_estimate), ''],
    [],
    ['Generated at', new Date().toISOString(), ''],
  ];

  if (report.kind === 'snapshot' && report.data.notes) {
    rows.push(['Notes', report.data.notes, '']);
  }

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
