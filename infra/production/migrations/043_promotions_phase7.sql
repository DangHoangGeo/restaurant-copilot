-- Migration 043: Promotions and Discount Codes (Phase 7)
--
-- Adds branch-scoped promotion/discount-code system:
--   promotions      — promotion definitions (code, type, validity, limits)
--   order_discounts — audit trail linking promotions to orders
--
-- Also updates monthly_finance_snapshots.gross_profit_estimate to subtract
-- discount_total so closed-month reports reflect real net profit.
--
-- Design invariants:
--   - All tables are scoped by restaurant_id (branch boundary).
--   - RLS mirrors the purchasing pattern: owner/manager can manage; service
--     layer writes order_discounts via supabaseAdmin.
--   - discount_type: 'percentage' | 'flat'; discount_value is raw (pct or ¥).
--   - order_discounts feeds monthly_finance_snapshots.discount_total via the
--     Phase 6 finance live-compute path (no change to snapshot schema needed).
--   - gross_profit_estimate on monthly_finance_snapshots is updated to include
--     discount_total so closed snapshots show correct net profit.

-- ──────────────────────────────────────────────────────────
-- 1. promotions
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Promo code (branch-unique, stored uppercase)
  code                TEXT          NOT NULL,
  description         TEXT,

  -- Discount definition
  discount_type       TEXT          NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value      NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),

  -- Optional ordering constraints
  min_order_amount    NUMERIC(12,2),
  -- Cap for percentage discounts (NULL = uncapped)
  max_discount_amount NUMERIC(12,2),

  -- Validity window (NULL = no restriction on that side)
  valid_from          DATE,
  valid_until         DATE,

  -- Usage tracking
  usage_limit         INTEGER,                          -- NULL = unlimited
  usage_count         INTEGER       NOT NULL DEFAULT 0,

  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,

  created_by          UUID          REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (restaurant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_promotions_restaurant_id ON promotions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_promotions_code          ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_is_active     ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_valid_until   ON promotions(valid_until);

-- ──────────────────────────────────────────────────────────
-- 2. order_discounts — audit trail per order
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_discounts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id            UUID          NOT NULL REFERENCES orders(id)       ON DELETE CASCADE,
  -- promotion_id nullable in case the promotion row is later deleted
  promotion_id        UUID          REFERENCES promotions(id)            ON DELETE SET NULL,

  -- Denormalized code + type so the audit trail survives promotion changes/deletion
  promotion_code      TEXT          NOT NULL,
  discount_type       TEXT          NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value      NUMERIC(10,2) NOT NULL,
  discount_amount     NUMERIC(12,2) NOT NULL CHECK (discount_amount >= 0),

  currency            TEXT          NOT NULL DEFAULT 'JPY',
  applied_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- Session ID for customer-side traceability
  applied_by_session  TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_discounts_restaurant_id ON order_discounts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_discounts_order_id      ON order_discounts(order_id);
CREATE INDEX IF NOT EXISTS idx_order_discounts_promotion_id  ON order_discounts(promotion_id);
CREATE INDEX IF NOT EXISTS idx_order_discounts_applied_at    ON order_discounts(applied_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_discounts_unique_order
  ON order_discounts(order_id);

-- ──────────────────────────────────────────────────────────
-- 3. updated_at trigger for promotions
--    (set_updated_at() was defined in migration 041)
-- ──────────────────────────────────────────────────────────
CREATE TRIGGER trg_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────
-- 4. Fix gross_profit_estimate on monthly_finance_snapshots
--    to subtract discount_total so closed months show correct
--    net profit once Phase 7 data is present.
-- ──────────────────────────────────────────────────────────
ALTER TABLE monthly_finance_snapshots
  DROP COLUMN IF EXISTS gross_profit_estimate;

ALTER TABLE monthly_finance_snapshots
  ADD COLUMN gross_profit_estimate NUMERIC(14,2)
    GENERATED ALWAYS AS (revenue_total - discount_total - combined_cost_total) STORED;

-- ──────────────────────────────────────────────────────────
-- 5. Row-Level Security
-- ──────────────────────────────────────────────────────────
ALTER TABLE promotions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_discounts ENABLE ROW LEVEL SECURITY;

-- promotions: owner/manager can read; owner/manager can write
CREATE POLICY promotions_select ON promotions
  FOR SELECT USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY promotions_insert ON promotions
  FOR INSERT WITH CHECK (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY promotions_update ON promotions
  FOR UPDATE
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

CREATE POLICY promotions_delete ON promotions
  FOR DELETE USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

-- order_discounts: owner/manager can read (writes go via supabaseAdmin service)
CREATE POLICY order_discounts_select ON order_discounts
  FOR SELECT USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );
