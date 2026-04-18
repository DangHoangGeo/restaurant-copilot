-- Migration 048: Branch role pay rates
--
-- Founder control needs a simple, auditable way to turn approved attendance
-- hours into payroll estimates without coupling wage logic into route handlers.
-- Rates stay branch-scoped so each restaurant can pay different levels.

CREATE TABLE IF NOT EXISTS restaurant_role_pay_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  job_title text NOT NULL CHECK (job_title IN ('manager', 'chef', 'server', 'cashier')),
  hourly_rate numeric(10,2) NOT NULL CHECK (hourly_rate >= 0),
  currency text NOT NULL DEFAULT 'JPY',
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, job_title)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_role_pay_rates_restaurant
  ON restaurant_role_pay_rates (restaurant_id);

ALTER TABLE restaurant_role_pay_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_pay_rates_read"
  ON restaurant_role_pay_rates FOR SELECT
  USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1
      FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "role_pay_rates_write"
  ON restaurant_role_pay_rates FOR INSERT
  WITH CHECK (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1
      FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "role_pay_rates_update"
  ON restaurant_role_pay_rates FOR UPDATE
  USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1
      FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1
      FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );
