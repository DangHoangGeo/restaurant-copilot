-- Migration 042: Monthly Finance Close and Tax-Ready Reporting (Phase 6)
--
-- Adds a monthly_finance_snapshots table that stores a frozen finance summary
-- for each branch per calendar month.
--
-- Design invariants:
--   - All snapshots are scoped by restaurant_id (branch boundary).
--   - Totals are sourced from approved/finalized operational data:
--       revenue    — orders with status = 'completed'
--       labor      — attendance_daily_summaries with status = 'approved'
--       purchasing — purchase_orders (not cancelled) + expenses (Phase 5 tables)
--   - Snapshot status: 'draft' (live recompute allowed) | 'closed' (frozen, read-only).
--   - Closing a month is an owner-only action and is captured via closed_by.
--   - discount_total is stored as 0 until discount tracking is implemented in Phase 7.
--   - RLS follows the same pattern as purchasing: owner/manager can read and write.

-- ──────────────────────────────────────────────────────────
-- 1. monthly_finance_snapshots
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_finance_snapshots (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Period
  year                  SMALLINT    NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  month                 SMALLINT    NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- Revenue (from completed orders)
  revenue_total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  order_count           INTEGER       NOT NULL DEFAULT 0,
  discount_total        NUMERIC(14,2) NOT NULL DEFAULT 0, -- Phase 7 placeholder

  -- Labor (from approved attendance_daily_summaries)
  approved_labor_hours  NUMERIC(10,2) NOT NULL DEFAULT 0,
  labor_entry_count     INTEGER       NOT NULL DEFAULT 0,

  -- Purchasing (from purchase_orders + expenses — Phase 5)
  purchasing_total      NUMERIC(14,2) NOT NULL DEFAULT 0,
  expense_total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  combined_cost_total   NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Gross profit estimate (revenue − purchasing − expenses; labor hours only, no rate yet)
  gross_profit_estimate NUMERIC(14,2) GENERATED ALWAYS AS (revenue_total - combined_cost_total) STORED,

  -- Currency for all monetary fields (branch-level, defaults to JPY)
  currency              TEXT        NOT NULL DEFAULT 'JPY',

  -- Close workflow
  snapshot_status       TEXT        NOT NULL DEFAULT 'draft'
                          CHECK (snapshot_status IN ('draft', 'closed')),
  closed_at             TIMESTAMPTZ,
  closed_by             UUID        REFERENCES auth.users(id),

  -- Optional notes for accountant handoff
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One snapshot per branch per month
  UNIQUE (restaurant_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_finance_snapshots_restaurant_period
  ON monthly_finance_snapshots (restaurant_id, year DESC, month DESC);

-- ──────────────────────────────────────────────────────────
-- 2. Row-Level Security
-- ──────────────────────────────────────────────────────────
ALTER TABLE monthly_finance_snapshots ENABLE ROW LEVEL SECURITY;

-- Owners and managers can read their branch snapshots
CREATE POLICY "finance_snapshots_read"
  ON monthly_finance_snapshots FOR SELECT
  USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

-- Owners and managers can insert/update snapshots (service layer enforces role check)
CREATE POLICY "finance_snapshots_write"
  ON monthly_finance_snapshots FOR INSERT
  WITH CHECK (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "finance_snapshots_update"
  ON monthly_finance_snapshots FOR UPDATE
  USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );
