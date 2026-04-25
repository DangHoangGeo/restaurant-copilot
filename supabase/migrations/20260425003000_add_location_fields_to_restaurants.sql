-- Add structured location fields to restaurants for public discovery filtering.
-- These fields allow filtering by province/district and enable map-based search.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS province   TEXT,
  ADD COLUMN IF NOT EXISTS district   TEXT,
  ADD COLUMN IF NOT EXISTS city       TEXT,
  ADD COLUMN IF NOT EXISTS latitude   NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude  NUMERIC(10, 7);

COMMENT ON COLUMN public.restaurants.province  IS 'Province or state (e.g., Ho Chi Minh City, Tokyo)';
COMMENT ON COLUMN public.restaurants.district  IS 'District or ward (e.g., Shibuya, District 1)';
COMMENT ON COLUMN public.restaurants.city      IS 'City or township within the province';
COMMENT ON COLUMN public.restaurants.latitude  IS 'GPS latitude for map-based proximity search';
COMMENT ON COLUMN public.restaurants.longitude IS 'GPS longitude for map-based proximity search';

-- Index for fast province/district filter queries in the public discovery endpoint.
CREATE INDEX IF NOT EXISTS idx_restaurants_province ON public.restaurants (province) WHERE province IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_district ON public.restaurants (district) WHERE district IS NOT NULL;
