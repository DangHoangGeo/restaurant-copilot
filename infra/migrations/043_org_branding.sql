-- Migration: 043_org_branding
-- Adds shared branding fields to owner_organizations.
-- All branches in an org inherit these defaults unless overridden at the branch level.
--
-- Fields added to owner_organizations:
--   logo_url        - shared organization logo (URL string)
--   brand_color     - shared hex brand color (#RRGGBB)
--   description_en  - organization intro / tagline in English
--   description_ja  - organization intro / tagline in Japanese
--   description_vi  - organization intro / tagline in Vietnamese
--   website         - organization website URL
--   phone           - organization contact phone
--   email           - organization contact email

ALTER TABLE owner_organizations
  ADD COLUMN IF NOT EXISTS logo_url       text,
  ADD COLUMN IF NOT EXISTS brand_color    text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_ja text,
  ADD COLUMN IF NOT EXISTS description_vi text,
  ADD COLUMN IF NOT EXISTS website        text,
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS email          text;

COMMENT ON COLUMN owner_organizations.logo_url
  IS 'Shared organization logo URL — used as the default for all branches.';

COMMENT ON COLUMN owner_organizations.brand_color
  IS 'Shared hex brand color (#RRGGBB) — branches may override at the branch level.';

COMMENT ON COLUMN owner_organizations.description_en
  IS 'English tagline / intro paragraph displayed on customer-facing pages.';

COMMENT ON COLUMN owner_organizations.description_ja
  IS 'Japanese tagline / intro paragraph displayed on customer-facing pages.';

COMMENT ON COLUMN owner_organizations.description_vi
  IS 'Vietnamese tagline / intro paragraph displayed on customer-facing pages.';
