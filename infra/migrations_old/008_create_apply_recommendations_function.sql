CREATE OR REPLACE FUNCTION apply_recommendations(p_restaurant_id uuid)
RETURNS json -- Changed to json to return { success: true }
LANGUAGE plpgsql
AS $$
DECLARE
    featured_category_id uuid;
    top_seller_record record; -- To loop through results of get_top_sellers_7days
BEGIN
    -- Start a transaction
    -- In Supabase functions, the entire function body is already within a transaction.

    -- 1. Find or create "Featured" category
    SELECT id INTO featured_category_id
    FROM categories
    WHERE restaurant_id = p_restaurant_id AND name_en = 'Featured'; -- Assuming 'name_en' for fixed name

    IF featured_category_id IS NULL THEN
        INSERT INTO categories (restaurant_id, name_en, name_ja, name_vi, is_default) -- Added other required name fields and is_default
        VALUES (p_restaurant_id, 'Featured', 'おすすめ', 'Nổi bật', false) -- Example localized names, assuming is_default is false for non-system categories
        RETURNING id INTO featured_category_id;
    END IF;

    -- 2. Delete existing items in "Featured" category
    DELETE FROM menu_items
    WHERE restaurant_id = p_restaurant_id AND category_id = featured_category_id;

    -- 3. Fetch top 3 sellers
    -- The get_top_sellers_7days function returns menu_item_id, name, total_sold
    -- We need to join back to menu_items to get all details for copying.

    FOR top_seller_record IN
        WITH top_sellers AS (
            SELECT ts.menu_item_id
            FROM get_top_sellers_7days(p_restaurant_id, 3) ts
        )
        SELECT
            orig_mi.name_ja,
            orig_mi.name_en,
            orig_mi.name_vi,
            orig_mi.description_ja,
            orig_mi.description_en,
            orig_mi.description_vi,
            orig_mi.price,
            orig_mi.tags,
            orig_mi.image_url,
            orig_mi.item_type, -- Added item_type
            orig_mi.sort_order -- Added sort_order, though it might need adjustment for featured items
            -- Add any other relevant fields from menu_items table that need to be copied
        FROM menu_items orig_mi
        JOIN top_sellers ts ON orig_mi.id = ts.menu_item_id
    LOOP
        -- 4. Copy top sellers into "Featured" category
        INSERT INTO menu_items (
            restaurant_id,
            category_id,
            name_ja,
            name_en,
            name_vi,
            description_ja,
            description_en,
            description_vi,
            price,
            tags,
            image_url,
            available,
            weekday_visibility,
            item_type, -- Added item_type
            sort_order -- Added sort_order
            -- Ensure all necessary columns are included
        )
        VALUES (
            p_restaurant_id,
            featured_category_id,
            top_seller_record.name_ja,
            top_seller_record.name_en,
            top_seller_record.name_vi,
            top_seller_record.description_ja,
            top_seller_record.description_en,
            top_seller_record.description_vi,
            top_seller_record.price,
            top_seller_record.tags,
            top_seller_record.image_url,
            true,                       -- available
            ARRAY[1,2,3,4,5,6,7],       -- weekday_visibility
            top_seller_record.item_type, -- item_type
            0 -- sort_order for featured, could be based on ranking from top_sellers
            -- Ensure values match columns
        );
    END LOOP;

    RETURN json_build_object('success', true);

EXCEPTION
    WHEN others THEN
        -- Log error or handle as needed
        -- For now, re-raise the exception if not handled specifically
        -- RLS will prevent unauthorized access
        RAISE;
        -- Or return json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissions:
-- Grant execute permission to the relevant role, e.g., 'authenticated' or a specific service role
-- This depends on how you manage security for RPCs.
-- For example, if called by authenticated users directly:
-- GRANT EXECUTE ON FUNCTION apply_recommendations(uuid) TO authenticated;
-- If called via an edge function using a service_role key, it might not need explicit grants here
-- if the service_role has inherent permissions.
-- For now, assuming RLS and appropriate client (service or user) will handle this.
-- The function itself should be secure due to p_restaurant_id usage in every query.
