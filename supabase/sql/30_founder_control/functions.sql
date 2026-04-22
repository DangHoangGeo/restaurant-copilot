-- 30_founder_control/functions.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '30_founder_control/functions.sql'

CREATE OR REPLACE FUNCTION public.is_org_member(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members om
    WHERE  om.organization_id = p_organization_id
    AND    om.user_id          = auth.uid()
    AND    om.is_active        = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_founder(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members om
    WHERE  om.organization_id = p_organization_id
    AND    om.user_id          = auth.uid()
    AND    om.is_active        = true
    AND    om.role             = 'founder_full_control'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_member_for_restaurant(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members   om
    JOIN   organization_restaurants orr ON orr.organization_id = om.organization_id
    WHERE  orr.restaurant_id = p_restaurant_id
    AND    om.user_id         = auth.uid()
    AND    om.is_active       = true
    AND (
      om.shop_scope = 'all_shops'
      OR EXISTS (
        SELECT 1
        FROM   organization_member_shop_scopes s
        WHERE  s.member_id     = om.id
        AND    s.restaurant_id = p_restaurant_id
      )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_authenticated_restaurant_override_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  request_headers jsonb;
  requested_restaurant_id uuid;
  fallback_restaurant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  request_headers := COALESCE(
    NULLIF(current_setting('request.headers', true), ''),
    '{}'
  )::jsonb;

  BEGIN
    requested_restaurant_id := NULLIF(
      request_headers ->> 'x-soder-active-restaurant-id',
      ''
    )::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NULL;
  END;

  IF requested_restaurant_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'restaurant_id', '')::uuid,
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'restaurant_id', '')::uuid,
    (
      SELECT restaurant_id
      FROM users
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
  INTO fallback_restaurant_id;

  IF requested_restaurant_id = fallback_restaurant_id THEN
    RETURN requested_restaurant_id;
  END IF;

  IF public.is_org_member_for_restaurant(requested_restaurant_id) THEN
    RETURN requested_restaurant_id;
  END IF;

  RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.get_authenticated_restaurant_override_id() IS 'Resolve a validated authenticated branch override from request headers for multi-branch mobile and control-plane clients';

CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    public.get_authenticated_restaurant_override_id(),
    NULLIF(auth.jwt() ->> 'restaurant_id', '')::uuid,
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'restaurant_id', '')::uuid,
    (
      SELECT restaurant_id
      FROM users
      WHERE id = auth.uid()
      LIMIT 1
    )
  );
$function$;

COMMENT ON FUNCTION public.get_user_restaurant_id() IS 'Resolve the authenticated user''s effective branch restaurant id from a validated request override, JWT claims, or the users table fallback';

CREATE OR REPLACE FUNCTION public.organization_member_has_branch_operations_access(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members om
    JOIN   organization_restaurants orr ON orr.organization_id = om.organization_id
    WHERE  orr.restaurant_id = p_restaurant_id
    AND    om.user_id         = auth.uid()
    AND    om.is_active       = true
    AND    om.role = ANY (
      ARRAY[
        'founder_full_control'::text,
        'founder_operations'::text,
        'branch_general_manager'::text
      ]
    )
    AND (
      om.shop_scope = 'all_shops'
      OR EXISTS (
        SELECT 1
        FROM   organization_member_shop_scopes s
        WHERE  s.member_id     = om.id
        AND    s.restaurant_id = p_restaurant_id
      )
    )
  );
$function$;

COMMENT ON FUNCTION public.organization_member_has_branch_operations_access(p_restaurant_id uuid) IS 'Allow organization roles that can run day-to-day branch operations to act within an assigned restaurant';

CREATE OR REPLACE FUNCTION public.user_has_restaurant_service_access(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.user_has_restaurant_role(
           p_restaurant_id,
           ARRAY['owner'::text, 'manager'::text, 'server'::text]
         )
      OR public.organization_member_has_branch_operations_access(p_restaurant_id);
$function$;

COMMENT ON FUNCTION public.user_has_restaurant_service_access(p_restaurant_id uuid) IS 'Allow branch staff or authorized organization operators to manage in-service order flows within a restaurant';

CREATE OR REPLACE FUNCTION public.get_accessible_branches_for_current_user()
 RETURNS TABLE(
   id uuid,
   name text,
   subdomain text,
   branch_code text,
   timezone text,
   currency text,
   address text,
   phone text,
   email text,
   website text,
   payment_methods text[],
   tax_rate numeric,
   company_public_subdomain text,
   created_at timestamp with time zone,
   updated_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH org_access AS (
    SELECT
      r.id,
      r.name,
      r.subdomain,
      r.branch_code,
      r.timezone,
      r.currency,
      r.address,
      r.phone,
      r.email,
      r.website,
      r.payment_methods,
      NULL::numeric AS tax_rate,
      oo.public_subdomain AS company_public_subdomain,
      r.created_at,
      r.updated_at
    FROM   organization_members om
    JOIN   organization_restaurants orr ON orr.organization_id = om.organization_id
    JOIN   restaurants r ON r.id = orr.restaurant_id
    LEFT JOIN owner_organizations oo ON oo.id = orr.organization_id
    WHERE  om.user_id   = auth.uid()
    AND    om.is_active = true
    AND (
      om.shop_scope = 'all_shops'
      OR EXISTS (
        SELECT 1
        FROM   organization_member_shop_scopes s
        WHERE  s.member_id     = om.id
        AND    s.restaurant_id = r.id
      )
    )
  ),
  direct_access AS (
    SELECT
      r.id,
      r.name,
      r.subdomain,
      r.branch_code,
      r.timezone,
      r.currency,
      r.address,
      r.phone,
      r.email,
      r.website,
      r.payment_methods,
      NULL::numeric AS tax_rate,
      oo.public_subdomain AS company_public_subdomain,
      r.created_at,
      r.updated_at
    FROM   restaurants r
    LEFT JOIN organization_restaurants orr ON orr.restaurant_id = r.id
    LEFT JOIN owner_organizations oo ON oo.id = orr.organization_id
    WHERE  r.id = COALESCE(
      NULLIF(auth.jwt() ->> 'restaurant_id', '')::uuid,
      NULLIF(auth.jwt() -> 'app_metadata' ->> 'restaurant_id', '')::uuid,
      (
        SELECT restaurant_id
        FROM users
        WHERE id = auth.uid()
        LIMIT 1
      )
    )
  ),
  all_access AS (
    SELECT * FROM org_access
    UNION ALL
    SELECT * FROM direct_access
  ),
  deduplicated_access AS (
    SELECT DISTINCT ON (id)
      id,
      name,
      subdomain,
      branch_code,
      timezone,
      currency,
      address,
      phone,
      email,
      website,
      payment_methods,
      tax_rate,
      company_public_subdomain,
      created_at,
      updated_at
    FROM all_access
    ORDER BY id, company_public_subdomain NULLS LAST
  )
  SELECT
    deduplicated_access.id,
    deduplicated_access.name,
    deduplicated_access.subdomain,
    deduplicated_access.branch_code,
    deduplicated_access.timezone,
    deduplicated_access.currency,
    deduplicated_access.address,
    deduplicated_access.phone,
    deduplicated_access.email,
    deduplicated_access.website,
    deduplicated_access.payment_methods,
    deduplicated_access.tax_rate,
    deduplicated_access.company_public_subdomain,
    deduplicated_access.created_at,
    deduplicated_access.updated_at
  FROM deduplicated_access
  ORDER BY lower(COALESCE(deduplicated_access.name, deduplicated_access.subdomain)), deduplicated_access.id;
$function$;

COMMENT ON FUNCTION public.get_accessible_branches_for_current_user() IS 'Return the branch records the authenticated user can operate directly or through organization membership';

CREATE OR REPLACE FUNCTION public.request_can_access_restaurant(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(public.get_request_restaurant_id() = p_restaurant_id, false)
      OR COALESCE(public.get_user_restaurant_id() = p_restaurant_id, false)
      OR public.is_org_member_for_restaurant(p_restaurant_id);
$function$;

COMMENT ON FUNCTION public.request_can_access_restaurant(p_restaurant_id uuid) IS 'Check whether the current anonymous, branch-authenticated, or organization-authenticated request can act on a restaurant';

CREATE OR REPLACE FUNCTION public.can_access_restaurant_context(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_service_role()
      OR public.request_can_access_restaurant(p_restaurant_id);
$function$;

COMMENT ON FUNCTION public.can_access_restaurant_context(p_restaurant_id uuid) IS 'Allow trusted internal callers or current request actors to operate within a restaurant context';

CREATE OR REPLACE FUNCTION public.get_organization_branch_overview(p_restaurant_ids uuid[], p_target_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(restaurant_id uuid, today_revenue numeric, open_orders_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(array_length(p_restaurant_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  IF NOT public.is_service_role() THEN
    IF EXISTS (
      SELECT 1
      FROM unnest(p_restaurant_ids) AS requested_restaurant(restaurant_id)
      WHERE NOT public.is_org_member_for_restaurant(requested_restaurant.restaurant_id)
    ) THEN
      RAISE EXCEPTION 'Not authorized to access one or more branches';
    END IF;
  END IF;

  RETURN QUERY
  WITH requested_restaurants AS (
    SELECT unnest(p_restaurant_ids) AS restaurant_id
  ),
  daily_sales AS (
    SELECT
      orders.restaurant_id,
      COALESCE(SUM(orders.total_amount), 0)::numeric AS today_revenue
    FROM public.orders
    WHERE orders.restaurant_id = ANY (p_restaurant_ids)
      AND orders.status = 'completed'
      AND orders.created_at >= p_target_date::timestamp with time zone
      AND orders.created_at < (p_target_date + 1)::timestamp with time zone
    GROUP BY orders.restaurant_id
  ),
  open_orders AS (
    SELECT
      orders.restaurant_id,
      COUNT(*)::bigint AS open_orders_count
    FROM public.orders
    WHERE orders.restaurant_id = ANY (p_restaurant_ids)
      AND orders.status NOT IN ('completed', 'canceled')
    GROUP BY orders.restaurant_id
  )
  SELECT
    requested_restaurants.restaurant_id,
    COALESCE(daily_sales.today_revenue, 0)::numeric AS today_revenue,
    COALESCE(open_orders.open_orders_count, 0)::bigint AS open_orders_count
  FROM requested_restaurants
  LEFT JOIN daily_sales
    ON daily_sales.restaurant_id = requested_restaurants.restaurant_id
  LEFT JOIN open_orders
    ON open_orders.restaurant_id = requested_restaurants.restaurant_id
  ORDER BY requested_restaurants.restaurant_id;
END;
$function$;

COMMENT ON FUNCTION public.get_organization_branch_overview(p_restaurant_ids uuid[], p_target_date date) IS 'Return branch-level daily revenue and open-order counts for an authorized organization scope';

CREATE OR REPLACE FUNCTION public.complete_restaurant_onboarding(p_restaurant_id uuid, p_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_hero_title_en text DEFAULT NULL::text, p_hero_title_ja text DEFAULT NULL::text, p_hero_title_vi text DEFAULT NULL::text, p_hero_subtitle_en text DEFAULT NULL::text, p_hero_subtitle_ja text DEFAULT NULL::text, p_hero_subtitle_vi text DEFAULT NULL::text, p_owner_story_en text DEFAULT NULL::text, p_owner_story_ja text DEFAULT NULL::text, p_owner_story_vi text DEFAULT NULL::text, p_logo_url text DEFAULT NULL::text, p_owner_photo_url text DEFAULT NULL::text, p_gallery_images text[] DEFAULT NULL::text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  update_data jsonb := '{}';
  gallery_record record;
  existing_gallery_count integer := 0;
BEGIN
  IF NOT public.request_can_access_restaurant(p_restaurant_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authorized to onboard this restaurant'
    );
  END IF;

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
$function$;

COMMENT ON FUNCTION public.complete_restaurant_onboarding(p_restaurant_id uuid, p_name text, p_phone text, p_email text, p_address text, p_website text, p_hero_title_en text, p_hero_title_ja text, p_hero_title_vi text, p_hero_subtitle_en text, p_hero_subtitle_ja text, p_hero_subtitle_vi text, p_owner_story_en text, p_owner_story_ja text, p_owner_story_vi text, p_logo_url text, p_owner_photo_url text, p_gallery_images text[]) IS 'Completes restaurant onboarding by updating restaurant data, owner photo, and gallery images in a single transaction';
