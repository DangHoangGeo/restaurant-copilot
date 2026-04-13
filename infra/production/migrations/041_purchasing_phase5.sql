-- Migration 041: Purchasing and Expense Management (Phase 5)
--
-- Adds branch-scoped purchasing and expense tables:
--   suppliers          — supplier directory per branch
--   purchase_orders    — purchase records (invoices, food, equipment)
--   purchase_order_items — line items within an order
--   expenses           — quick/petty cash expense entries
--
-- Design invariants:
--   - All tables are scoped by restaurant_id (branch boundary).
--   - RLS restricts reads/writes to the owning restaurant's authenticated user.
--   - Soft-delete via is_active on suppliers; orders/expenses use a status column.
--   - Receipt attachment URLs are stored as text; actual file upload is handled by Supabase Storage.

-- ──────────────────────────────────────────────────────────
-- 1. suppliers
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  -- e.g. 'food', 'beverage', 'equipment', 'utilities', 'general'
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id ON suppliers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active     ON suppliers(is_active);

-- ──────────────────────────────────────────────────────────
-- 2. purchase_orders
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  -- supplier_name is denormalized so records survive supplier deletion
  supplier_name   TEXT,
  category        TEXT NOT NULL DEFAULT 'general',
  -- e.g. 'food', 'beverage', 'equipment', 'utilities', 'other'
  status          TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'received' | 'cancelled'
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  received_date   DATE,
  total_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'JPY',
  tax_amount      NUMERIC(12, 2),
  notes           TEXT,
  receipt_url     TEXT,
  -- URL to uploaded receipt image in Supabase Storage
  is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_restaurant_id ON purchase_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id   ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date    ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status        ON purchase_orders(status);

-- ──────────────────────────────────────────────────────────
-- 3. purchase_order_items
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  quantity        NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unit            TEXT,
  -- e.g. 'kg', 'pcs', 'box', 'bottle'
  unit_price      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poi_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_restaurant_id     ON purchase_order_items(restaurant_id);

-- ──────────────────────────────────────────────────────────
-- 4. expenses
--    Quick expense entries (petty cash, daily small costs)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category        TEXT NOT NULL DEFAULT 'other',
  -- e.g. 'food', 'transport', 'utilities', 'maintenance', 'other'
  description     TEXT NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'JPY',
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url     TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_restaurant_id ON expenses(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date  ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category      ON expenses(category);

-- ──────────────────────────────────────────────────────────
-- 5. updated_at auto-update triggers
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────
-- 6. Row-Level Security
-- ──────────────────────────────────────────────────────────
ALTER TABLE suppliers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;

-- Helper: resolve restaurant_id for the current authenticated user.
-- Reuses the same pattern as existing tables.
CREATE OR REPLACE FUNCTION get_user_restaurant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT restaurant_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- suppliers
CREATE POLICY suppliers_select ON suppliers
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY suppliers_insert ON suppliers
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());

CREATE POLICY suppliers_update ON suppliers
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK  (restaurant_id = get_user_restaurant_id());

CREATE POLICY suppliers_delete ON suppliers
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- purchase_orders
CREATE POLICY purchase_orders_select ON purchase_orders
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY purchase_orders_insert ON purchase_orders
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());

CREATE POLICY purchase_orders_update ON purchase_orders
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK  (restaurant_id = get_user_restaurant_id());

CREATE POLICY purchase_orders_delete ON purchase_orders
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- purchase_order_items
CREATE POLICY poi_select ON purchase_order_items
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY poi_insert ON purchase_order_items
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());

CREATE POLICY poi_update ON purchase_order_items
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK  (restaurant_id = get_user_restaurant_id());

CREATE POLICY poi_delete ON purchase_order_items
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- expenses
CREATE POLICY expenses_select ON expenses
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY expenses_insert ON expenses
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());

CREATE POLICY expenses_update ON expenses
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK  (restaurant_id = get_user_restaurant_id());

CREATE POLICY expenses_delete ON expenses
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());
