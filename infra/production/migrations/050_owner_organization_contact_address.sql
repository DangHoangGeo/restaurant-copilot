-- Migration: 050_owner_organization_contact_address
-- Adds a shared organization address used as the default for founder setup
-- and future branch creation flows.

ALTER TABLE owner_organizations
  ADD COLUMN IF NOT EXISTS address text;

COMMENT ON COLUMN owner_organizations.address
  IS 'Primary company address used as the default contact/location baseline for new branches.';

WITH first_branch_address AS (
  SELECT DISTINCT ON (orr.organization_id)
    orr.organization_id,
    r.address
  FROM organization_restaurants orr
  JOIN restaurants r ON r.id = orr.restaurant_id
  WHERE r.address IS NOT NULL
  ORDER BY orr.organization_id, orr.added_at ASC
)
UPDATE owner_organizations org
SET address = first_branch_address.address
FROM first_branch_address
WHERE org.id = first_branch_address.organization_id
  AND org.address IS NULL;
