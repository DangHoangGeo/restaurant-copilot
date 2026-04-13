// Finance domain — TypeScript types for Phase 6 Monthly Finance Close.

export type SnapshotStatus = 'draft' | 'closed';

/** A persisted monthly finance snapshot row. */
export interface MonthlyFinanceSnapshot {
  id: string;
  restaurant_id: string;
  year: number;
  month: number;

  // Revenue
  revenue_total: number;
  order_count: number;
  discount_total: number;

  // Labor (hours only — no hourly rate in current schema)
  approved_labor_hours: number;
  labor_entry_count: number;

  // Purchasing
  purchasing_total: number;
  expense_total: number;
  combined_cost_total: number;

  // Computed by DB
  gross_profit_estimate: number;

  currency: string;
  snapshot_status: SnapshotStatus;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Live-computed summary for a month (not yet persisted). */
export interface LiveMonthlySummary {
  year: number;
  month: number;
  currency: string;

  // Revenue
  revenue_total: number;
  order_count: number;
  discount_total: number;

  // Labor
  approved_labor_hours: number;
  labor_entry_count: number;

  // Purchasing
  purchasing_total: number;
  expense_total: number;
  combined_cost_total: number;

  // Derived
  gross_profit_estimate: number;
}

/** Combined response — either a closed snapshot or a live-computed summary. */
export type MonthlyFinanceReport =
  | { kind: 'snapshot'; data: MonthlyFinanceSnapshot }
  | { kind: 'live'; data: LiveMonthlySummary };

/** Payload for creating or updating a snapshot (used by close action). */
export interface UpsertSnapshotInput {
  year: number;
  month: number;
  currency: string;
  revenue_total: number;
  order_count: number;
  discount_total: number;
  approved_labor_hours: number;
  labor_entry_count: number;
  purchasing_total: number;
  expense_total: number;
  combined_cost_total: number;
  snapshot_status: SnapshotStatus;
  notes?: string | null;
  closed_by?: string | null;
  closed_at?: string | null;
}
