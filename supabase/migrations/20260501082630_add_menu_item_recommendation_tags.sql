-- Add owner-managed recommendation tags and kitchen/bar station metadata.
-- Rollout assumptions:
-- - Existing branch menu_items already have tags, so this migration adds comments
--   and a station field without changing customer ordering semantics.
-- - Organization shared items receive tags and station defaults so inheritance can
--   copy the same metadata into branch-resolved menu rows.
-- Verification:
-- - Insert/update shared and branch menu items with prep_station in food/drink/other.
-- - Load customer menu and branch orders after migration.

ALTER TABLE public.organization_menu_items
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS prep_station text DEFAULT 'food'::text NOT NULL;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS prep_station text DEFAULT 'food'::text NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.organization_menu_items
    ADD CONSTRAINT organization_menu_items_prep_station_check
    CHECK (prep_station = ANY (ARRAY['food'::text, 'drink'::text, 'other'::text]));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.menu_items
    ADD CONSTRAINT menu_items_prep_station_check
    CHECK (prep_station = ANY (ARRAY['food'::text, 'drink'::text, 'other'::text]));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.organization_menu_items.tags IS 'Owner-managed shared tags copied into branch menu items for recommendations and menu grouping.';
COMMENT ON COLUMN public.organization_menu_items.prep_station IS 'Default station classification copied into branch menu items for food/drink order screens.';
COMMENT ON COLUMN public.menu_items.tags IS 'Owner-managed tags for customer recommendations, menu grouping, and operational filtering.';
COMMENT ON COLUMN public.menu_items.prep_station IS 'Operational station classification used by branch kitchen/bar order screens.';
