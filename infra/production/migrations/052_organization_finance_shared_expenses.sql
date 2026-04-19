-- Migration: 052_organization_finance_shared_expenses
-- Adds organization-level shared expense tracking for company finance.

CREATE TABLE IF NOT EXISTS organization_finance_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES owner_organizations(id) ON DELETE CASCADE,
  category        TEXT NOT NULL DEFAULT 'miscellaneous',
  description     TEXT NOT NULL,
  vendor_name     TEXT,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency        TEXT NOT NULL DEFAULT 'JPY',
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url     TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_finance_expenses_org_date
  ON organization_finance_expenses (organization_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_org_finance_expenses_category
  ON organization_finance_expenses (organization_id, category);

ALTER TABLE organization_finance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view organization finance expenses"
  ON organization_finance_expenses FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Org founders can insert organization finance expenses"
  ON organization_finance_expenses FOR INSERT
  WITH CHECK (is_org_founder(organization_id));

CREATE POLICY "Org founders can update organization finance expenses"
  ON organization_finance_expenses FOR UPDATE
  USING (is_org_founder(organization_id))
  WITH CHECK (is_org_founder(organization_id));

CREATE POLICY "Org founders can delete organization finance expenses"
  ON organization_finance_expenses FOR DELETE
  USING (is_org_founder(organization_id));

CREATE TRIGGER trg_org_finance_expenses_updated_at
  BEFORE UPDATE ON organization_finance_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
