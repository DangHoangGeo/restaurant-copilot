-- 020_restaurant_settings_enhancements.sql
-- Remove contact_info field and add tax field as per upgrade plan

-- Remove contact_info field since we already have phone and email fields
ALTER TABLE restaurants DROP COLUMN IF EXISTS contact_info;

-- Add tax field with default rate of 10% (0.10)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tax numeric NOT NULL DEFAULT 0.10;

-- Add comment for documentation
COMMENT ON COLUMN restaurants.tax IS 'Restaurant tax rate as decimal (0.10 = 10%)';
