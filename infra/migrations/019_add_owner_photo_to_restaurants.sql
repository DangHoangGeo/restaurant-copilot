-- Add owner_photo_url column to restaurants table for onboarding
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_photo_url text;

-- Add comment for documentation
COMMENT ON COLUMN restaurants.owner_photo_url IS 'URL for the restaurant owner photo, used in homepage about section';
