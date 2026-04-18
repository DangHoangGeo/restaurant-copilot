-- Migration: 045_organization_shared_menu_foundation
-- Adds an owner-level shared menu workspace for organization-controlled menu
-- drafting without changing branch-owned live menus.

CREATE TABLE IF NOT EXISTS organization_menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES owner_organizations(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ja text,
  name_vi text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_menu_categories_org_position
  ON organization_menu_categories (organization_id, position);

CREATE TABLE IF NOT EXISTS organization_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES owner_organizations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES organization_menu_categories(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ja text,
  name_vi text,
  description_en text,
  description_ja text,
  description_vi text,
  price numeric(12, 2) NOT NULL DEFAULT 0,
  image_url text,
  available boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_menu_items_org_category_position
  ON organization_menu_items (organization_id, category_id, position);

COMMENT ON TABLE organization_menu_categories
  IS 'Organization-level shared menu categories for founder-owned reusable menu planning.';

COMMENT ON TABLE organization_menu_items
  IS 'Organization-level shared menu items. Branch menus remain independent until copied or applied separately.';
