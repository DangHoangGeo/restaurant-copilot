-- Migration: Create RPC function for completing restaurant onboarding
-- This function handles the transactional completion of onboarding with all data updates

-- First, add the hero content fields to restaurants table if they don't exist
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_title_en text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_title_ja text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_title_vi text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_subtitle_en text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_subtitle_ja text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_subtitle_vi text;
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

  -- Execute the restaurant update
  EXECUTE format(
    'UPDATE restaurants SET %s, updated_at = NOW() WHERE id = $1',
    (
      SELECT string_agg(format('%I = ($2->>%L)::%s', key, key, 
        CASE 
          WHEN key = 'onboarded' THEN 'boolean'
          ELSE 'text'
        END
      ), ', ')
      FROM jsonb_object_keys(update_data) AS key
    )
  ) USING p_restaurant_id, update_data;

  -- Handle owner photo separately if provided (store in restaurants table)
  IF p_owner_photo_url IS NOT NULL THEN
    -- Update restaurants table with owner photo
    UPDATE restaurants 
    SET owner_photo_url = p_owner_photo_url, updated_at = NOW()
    WHERE id = p_restaurant_id;
  END IF;

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
