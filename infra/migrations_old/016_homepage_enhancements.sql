-- 016_homepage_enhancements.sql
-- Database enhancements for new restaurant homepage functionality

-- Add photo_url to users table for owner avatars
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url text;

-- Add owner story fields to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_story_en text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_story_ja text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_story_vi text;

-- Create gallery table for restaurant images
CREATE TABLE IF NOT EXISTS restaurant_gallery_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  alt_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_hero boolean NOT NULL DEFAULT false, -- Mark images suitable for hero section
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for gallery table
CREATE INDEX IF NOT EXISTS idx_gallery_restaurant_id ON restaurant_gallery_images(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_gallery_sort_order ON restaurant_gallery_images(restaurant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_hero ON restaurant_gallery_images(restaurant_id, is_hero);

-- Enable RLS for gallery table
ALTER TABLE restaurant_gallery_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurant_gallery_images
CREATE POLICY "Anonymous can view gallery images"
  ON restaurant_gallery_images
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

CREATE POLICY "Tenant can manage gallery images"
  ON restaurant_gallery_images
  FOR ALL
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Add signature dish flag to menu_items table for homepage highlights
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_signature boolean NOT NULL DEFAULT false;

-- Add index for signature dishes
CREATE INDEX IF NOT EXISTS idx_menu_items_signature ON menu_items(restaurant_id, is_signature) WHERE is_signature = true;

-- Add additional fields to restaurants table for better homepage content
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tagline_en text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tagline_ja text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tagline_vi text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_rating numeric CHECK (google_rating >= 0 AND google_rating <= 5);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_review_count integer DEFAULT 0;


-- Add secondary color for better theming
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS secondary_color text;

-- Create function to get homepage data efficiently
CREATE OR REPLACE FUNCTION get_restaurant_homepage_data(restaurant_subdomain text)
RETURNS json AS $$
DECLARE
  restaurant_data json;
  owners_data json;
  gallery_data json;
  signature_dishes_data json;
  result json;
BEGIN
  -- Get restaurant basic info
  SELECT to_json(r.*) INTO restaurant_data
  FROM restaurants r
  WHERE r.subdomain = restaurant_subdomain;
  
  IF restaurant_data IS NULL THEN
    RETURN json_build_object('error', 'Restaurant not found');
  END IF;
  
  -- Get owners (users with role='owner')
  SELECT json_agg(
    json_build_object(
      'id', u.id,
      'name', u.name,
      'email', u.email,
      'photo_url', u.photo_url
    )
  ) INTO owners_data
  FROM users u
  WHERE u.restaurant_id = (restaurant_data->>'id')::uuid
    AND u.role = 'owner';
  
  -- Get gallery images
  SELECT json_agg(
    json_build_object(
      'id', g.id,
      'image_url', g.image_url,
      'caption', g.caption,
      'alt_text', g.alt_text,
      'sort_order', g.sort_order,
      'is_hero', g.is_hero
    ) ORDER BY g.sort_order
  ) INTO gallery_data
  FROM restaurant_gallery_images g
  WHERE g.restaurant_id = (restaurant_data->>'id')::uuid;
  
  -- Get signature dishes
  SELECT json_agg(
    json_build_object(
      'id', m.id,
      'name_en', m.name_en,
      'name_ja', m.name_ja,
      'name_vi', m.name_vi,
      'description_en', m.description_en,
      'description_ja', m.description_ja,
      'description_vi', m.description_vi,
      'price', m.price,
      'image_url', m.image_url,
      'category_name_en', c.name_en,
      'category_name_ja', c.name_ja,
      'category_name_vi', c.name_vi
    ) ORDER BY m.position
  ) INTO signature_dishes_data
  FROM menu_items m
  JOIN categories c ON m.category_id = c.id
  WHERE m.restaurant_id = (restaurant_data->>'id')::uuid
    AND m.is_signature = true
    AND m.available = true;
  
  -- Build final result
  result := json_build_object(
    'restaurant', restaurant_data,
    'owners', COALESCE(owners_data, '[]'::json),
    'gallery', COALESCE(gallery_data, '[]'::json),
    'signature_dishes', COALESCE(signature_dishes_data, '[]'::json)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_restaurant_homepage_data(text) TO anon;
GRANT EXECUTE ON FUNCTION get_restaurant_homepage_data(text) TO authenticated;
