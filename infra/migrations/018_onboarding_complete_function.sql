-- Migration: Create RPC function for completing restaurant onboarding
-- This function handles the transactional completion of onboarding with all data updates

-- First, add the hero content fields to restaurants table if they don't exist
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_title_en text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_title_ja text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_title_vi text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_subtitle_en text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_subtitle_ja text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_subtitle_vi text;

-- Add owner story fields
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_story_en text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_story_ja text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_story_vi text;

-- Add owner photo URL field
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_photo_url text;

-- Create function to complete restaurant onboarding
CREATE OR REPLACE FUNCTION complete_restaurant_onboarding(
  p_restaurant_id uuid,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_hero_title_en text DEFAULT NULL,
  p_hero_title_ja text DEFAULT NULL,
  p_hero_title_vi text DEFAULT NULL,
  p_hero_subtitle_en text DEFAULT NULL,
  p_hero_subtitle_ja text DEFAULT NULL,
  p_hero_subtitle_vi text DEFAULT NULL,
  p_owner_story_en text DEFAULT NULL,
  p_owner_story_ja text DEFAULT NULL,
  p_owner_story_vi text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_owner_photo_url text DEFAULT NULL,
  p_gallery_images text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  update_data jsonb := '{}';
  gallery_record record;
  existing_gallery_count integer := 0;
BEGIN
  -- Check if restaurant exists
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Restaurant not found'
    );
  END IF;

  -- Build update data dynamically
  IF p_name IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('name', p_name);
  END IF;
  
  IF p_phone IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('phone', p_phone);
  END IF;
  
  IF p_email IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('email', p_email);
  END IF;
  
  IF p_address IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('address', p_address);
  END IF;
  
  IF p_website IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('website', p_website);
  END IF;
  
  IF p_logo_url IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('logo_url', p_logo_url);
  END IF;

  -- Add hero content fields
  IF p_hero_title_en IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_title_en', p_hero_title_en);
  END IF;
  
  IF p_hero_title_ja IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_title_ja', p_hero_title_ja);
  END IF;
  
  IF p_hero_title_vi IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_title_vi', p_hero_title_vi);
  END IF;
  
  IF p_hero_subtitle_en IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_subtitle_en', p_hero_subtitle_en);
  END IF;
  
  IF p_hero_subtitle_ja IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_subtitle_ja', p_hero_subtitle_ja);
  END IF;
  
  IF p_hero_subtitle_vi IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_subtitle_vi', p_hero_subtitle_vi);
  END IF;

  -- Add owner story fields
  IF p_owner_story_en IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('owner_story_en', p_owner_story_en);
  END IF;
  
  IF p_owner_story_ja IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('owner_story_ja', p_owner_story_ja);
  END IF;
  
  IF p_owner_story_vi IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('owner_story_vi', p_owner_story_vi);
  END IF;

  -- Always mark as onboarded
  update_data := update_data || jsonb_build_object('onboarded', true);

  -- Execute the restaurant update with explicit field handling
  UPDATE restaurants SET 
    name = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone),
    email = COALESCE(p_email, email),
    address = COALESCE(p_address, address),
    website = COALESCE(p_website, website),
    logo_url = COALESCE(p_logo_url, logo_url),
    hero_title_en = COALESCE(p_hero_title_en, hero_title_en),
    hero_title_ja = COALESCE(p_hero_title_ja, hero_title_ja),
    hero_title_vi = COALESCE(p_hero_title_vi, hero_title_vi),
    hero_subtitle_en = COALESCE(p_hero_subtitle_en, hero_subtitle_en),
    hero_subtitle_ja = COALESCE(p_hero_subtitle_ja, hero_subtitle_ja),
    hero_subtitle_vi = COALESCE(p_hero_subtitle_vi, hero_subtitle_vi),
    owner_story_en = COALESCE(p_owner_story_en, owner_story_en),
    owner_story_ja = COALESCE(p_owner_story_ja, owner_story_ja),
    owner_story_vi = COALESCE(p_owner_story_vi, owner_story_vi),
    owner_photo_url = COALESCE(p_owner_photo_url, owner_photo_url),
    onboarded = true,
    updated_at = NOW()
  WHERE id = p_restaurant_id;

  -- Handle gallery images if provided
  IF p_gallery_images IS NOT NULL AND array_length(p_gallery_images, 1) > 0 THEN
    -- Get current gallery count
    SELECT COUNT(*) INTO existing_gallery_count
    FROM restaurant_gallery_images 
    WHERE restaurant_id = p_restaurant_id;

    -- Insert new gallery images
    FOR i IN 1..array_length(p_gallery_images, 1) LOOP
      INSERT INTO restaurant_gallery_images (
        restaurant_id,
        image_url,
        alt_text,
        sort_order,
        created_at,
        updated_at
      ) VALUES (
        p_restaurant_id,
        p_gallery_images[i],
        'Gallery Image ' || (existing_gallery_count + i),
        existing_gallery_count + i,
        NOW(),
        NOW()
      );
    END LOOP;
  END IF;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'restaurant_id', p_restaurant_id,
    'updated_fields', jsonb_object_keys(update_data)
  );

EXCEPTION
  WHEN others THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_restaurant_onboarding(
  uuid, text, text, text, text, text, text, text, text, text, text, text, 
  text, text, text, text, text, text[]
) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION complete_restaurant_onboarding IS 
'Completes restaurant onboarding by updating restaurant data, owner photo, and gallery images in a single transaction';
