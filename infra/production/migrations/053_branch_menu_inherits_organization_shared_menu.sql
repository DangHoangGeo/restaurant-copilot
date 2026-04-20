-- Migration: 053_branch_menu_inherits_organization_shared_menu
-- Adds explicit source tracking so organization shared menu content can be
-- materialized into branch menus without breaking branch-local items.

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS organization_menu_category_id uuid
  REFERENCES organization_menu_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_restaurant_org_menu_category
  ON categories (restaurant_id, organization_menu_category_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_restaurant_org_menu_category
  ON categories (restaurant_id, organization_menu_category_id)
  WHERE organization_menu_category_id IS NOT NULL;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS organization_menu_item_id uuid
  REFERENCES organization_menu_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_org_menu_item
  ON menu_items (restaurant_id, organization_menu_item_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_restaurant_org_menu_item
  ON menu_items (restaurant_id, organization_menu_item_id)
  WHERE organization_menu_item_id IS NOT NULL;

COMMENT ON COLUMN categories.organization_menu_category_id
  IS 'When present, this branch category is inherited from an organization shared menu category.';

COMMENT ON COLUMN menu_items.organization_menu_item_id
  IS 'When present, this branch menu item is inherited from an organization shared menu item.';

INSERT INTO categories (
  restaurant_id,
  organization_menu_category_id,
  name_en,
  name_ja,
  name_vi,
  position
)
SELECT
  organization_links.restaurant_id,
  org_categories.id,
  org_categories.name_en,
  org_categories.name_ja,
  org_categories.name_vi,
  org_categories.position
FROM organization_restaurants AS organization_links
JOIN organization_menu_categories AS org_categories
  ON org_categories.organization_id = organization_links.organization_id
LEFT JOIN categories AS existing_categories
  ON existing_categories.restaurant_id = organization_links.restaurant_id
 AND existing_categories.organization_menu_category_id = org_categories.id
WHERE existing_categories.id IS NULL;

INSERT INTO menu_items (
  restaurant_id,
  category_id,
  organization_menu_item_id,
  name_en,
  name_ja,
  name_vi,
  description_en,
  description_ja,
  description_vi,
  price,
  image_url,
  available,
  weekday_visibility,
  position
)
SELECT
  organization_links.restaurant_id,
  inherited_categories.id,
  org_items.id,
  org_items.name_en,
  org_items.name_ja,
  org_items.name_vi,
  org_items.description_en,
  org_items.description_ja,
  org_items.description_vi,
  org_items.price,
  org_items.image_url,
  org_items.available,
  ARRAY[1, 2, 3, 4, 5, 6, 7],
  org_items.position
FROM organization_restaurants AS organization_links
JOIN organization_menu_items AS org_items
  ON org_items.organization_id = organization_links.organization_id
JOIN categories AS inherited_categories
  ON inherited_categories.restaurant_id = organization_links.restaurant_id
 AND inherited_categories.organization_menu_category_id = org_items.category_id
LEFT JOIN menu_items AS existing_items
  ON existing_items.restaurant_id = organization_links.restaurant_id
 AND existing_items.organization_menu_item_id = org_items.id
WHERE existing_items.id IS NULL;
