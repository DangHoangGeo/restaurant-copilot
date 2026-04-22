-- 20260422030000_mobile_branch_context_hardening.sql
-- Harden multi-branch mobile access after the canonical Supabase foundation reset.

BEGIN;

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

GRANT EXECUTE ON FUNCTION public.get_authenticated_restaurant_override_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.organization_member_has_branch_operations_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_restaurant_service_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_accessible_branches_for_current_user() TO authenticated, service_role;

DROP POLICY IF EXISTS "Staff can DELETE order_items" ON public.order_items;
CREATE POLICY "Staff can DELETE order_items" ON public.order_items FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

DROP POLICY IF EXISTS "Staff can DELETE orders" ON public.orders;
CREATE POLICY "Staff can DELETE orders" ON public.orders FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

DROP POLICY IF EXISTS "Staff can INSERT order_items" ON public.order_items;
CREATE POLICY "Staff can INSERT order_items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

DROP POLICY IF EXISTS "Staff can INSERT orders" ON public.orders;
CREATE POLICY "Staff can INSERT orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

DROP POLICY IF EXISTS "Staff can UPDATE order_items" ON public.order_items;
CREATE POLICY "Staff can UPDATE order_items" ON public.order_items FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

DROP POLICY IF EXISTS "Staff can UPDATE orders" ON public.orders;
CREATE POLICY "Staff can UPDATE orders" ON public.orders FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

COMMIT;
