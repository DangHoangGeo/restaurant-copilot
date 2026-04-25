ALTER TABLE public.organization_menu_categories
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
