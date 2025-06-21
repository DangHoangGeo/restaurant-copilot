-- 07_add_onboarded_flag.sql
-- Add onboarded flag to restaurants table for owner onboarding flow

-- Add onboarded flag to restaurants table (default false)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_onboarded ON restaurants(onboarded);

-- Add comment for documentation
COMMENT ON COLUMN restaurants.onboarded IS 'Flag indicating whether the restaurant owner has completed the onboarding flow';
