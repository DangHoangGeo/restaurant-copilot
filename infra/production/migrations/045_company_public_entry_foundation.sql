-- Migration: 044_company_public_entry_foundation
-- Adds the public company host identifier and explicit branch public code.
-- This keeps legacy branch subdomains working while introducing a simpler
-- company-host + branch/table QR model.

ALTER TABLE owner_organizations
  ADD COLUMN IF NOT EXISTS public_subdomain text;

UPDATE owner_organizations
SET public_subdomain = slug
WHERE public_subdomain IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_organizations_public_subdomain_unique
  ON owner_organizations (public_subdomain);

COMMENT ON COLUMN owner_organizations.public_subdomain
  IS 'Canonical public company host identifier used for customer entry and company-level routing.';

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS branch_code text;

UPDATE restaurants
SET branch_code = subdomain
WHERE branch_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_branch_code_unique
  ON restaurants (branch_code);

COMMENT ON COLUMN restaurants.branch_code
  IS 'Explicit public branch identifier used on company-host customer URLs and QR entry.';
