-- Migration: 051_organization_billing_and_receipts
-- Adds requested billing cycle to organization signup state and a receipt ledger
-- for subscription billing periods.

ALTER TABLE owner_organizations
  ADD COLUMN IF NOT EXISTS requested_billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (requested_billing_cycle IN ('monthly', 'yearly'));

COMMENT ON COLUMN owner_organizations.requested_billing_cycle
  IS 'Billing cycle selected during signup before the organization is approved.';

CREATE TABLE IF NOT EXISTS subscription_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES owner_organizations(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric(10, 2) NOT NULL,
  total numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'void')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_subscription_receipts_organization_id
  ON subscription_receipts (organization_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_receipts_restaurant_id
  ON subscription_receipts (restaurant_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_receipts_subscription_id
  ON subscription_receipts (subscription_id, period_start DESC);

ALTER TABLE subscription_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_receipts_restaurant_read ON subscription_receipts
  FOR SELECT
  USING (restaurant_id = (auth.jwt()->>'restaurant_id')::UUID);

CREATE POLICY subscription_receipts_platform_admin_read ON subscription_receipts
  FOR SELECT
  USING (is_platform_admin());

CREATE POLICY subscription_receipts_platform_admin_insert ON subscription_receipts
  FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY subscription_receipts_platform_admin_update ON subscription_receipts
  FOR UPDATE
  USING (is_platform_admin());

CREATE OR REPLACE FUNCTION update_subscription_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_receipts_updated_at ON subscription_receipts;

CREATE TRIGGER subscription_receipts_updated_at
  BEFORE UPDATE ON subscription_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_receipts_updated_at();

COMMENT ON TABLE subscription_receipts
  IS 'Issued billing receipts for tenant subscription periods.';
