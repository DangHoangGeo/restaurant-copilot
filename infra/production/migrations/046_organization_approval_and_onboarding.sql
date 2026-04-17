-- Migration: 046_organization_approval_and_onboarding
-- Adds organization-level approval and onboarding state for the
-- company-first owner signup and control workflow.

ALTER TABLE owner_organizations
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS requested_plan text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN owner_organizations.approval_status
  IS 'Platform approval lifecycle for company signup. Control access is blocked until approved.';

COMMENT ON COLUMN owner_organizations.requested_plan
  IS 'Plan selected during initial signup before payment subscription is implemented.';

COMMENT ON COLUMN owner_organizations.onboarding_completed_at
  IS 'Timestamp marking completion of the first owner setup flow after approval.';
