-- Adds organization shared menu stock and schedule defaults.
-- Rollout: additive columns only; existing shared items default to all weekdays and no stock cap.
-- Verification: load owner shared menu, edit stock/schedule, and sync inherited branch menu items.

ALTER TABLE public.organization_menu_items
  ADD COLUMN IF NOT EXISTS weekday_visibility integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7] NOT NULL,
  ADD COLUMN IF NOT EXISTS stock_level integer;

COMMENT ON COLUMN public.organization_menu_items.weekday_visibility IS 'Default visible weekdays for organization shared menu inheritance. Branch menu items may override after sync.';
COMMENT ON COLUMN public.organization_menu_items.stock_level IS 'Default stock value for organization shared menu inheritance. Branch inventory remains branch-local after sync.';
