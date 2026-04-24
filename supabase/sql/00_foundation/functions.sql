-- 00_foundation/functions.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '00_foundation/functions.sql'

CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
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

COMMENT ON FUNCTION public.get_user_restaurant_id() IS 'Resolve the authenticated user''s effective branch restaurant id from JWT claims or the users table fallback';

CREATE OR REPLACE FUNCTION public.get_request_restaurant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid;
$function$;

COMMENT ON FUNCTION public.get_request_restaurant_id() IS 'Resolve the branch restaurant id bound to the current anonymous or public request context';

CREATE OR REPLACE FUNCTION public.is_service_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(auth.role(), current_setting('request.jwt.claim.role', true), '') = 'service_role';
$function$;

COMMENT ON FUNCTION public.is_service_role() IS 'Identify internal RPC calls executed with the Supabase service role';

CREATE OR REPLACE FUNCTION public.user_has_restaurant_role(p_restaurant_id uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
      AND restaurant_id = p_restaurant_id
      AND role = ANY (p_roles)
  );
$function$;

COMMENT ON FUNCTION public.user_has_restaurant_role(p_restaurant_id uuid, p_roles text[]) IS 'Check whether the authenticated branch user belongs to a restaurant and holds one of the allowed branch roles';

CREATE OR REPLACE FUNCTION public.user_has_restaurant_service_access(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.user_has_restaurant_role(
    p_restaurant_id,
    ARRAY['owner'::text, 'manager'::text, 'server'::text]
  );
$function$;

COMMENT ON FUNCTION public.user_has_restaurant_service_access(p_restaurant_id uuid) IS 'Default branch-staff service access helper, widened later by organization-aware foundation layers when needed';

CREATE OR REPLACE FUNCTION public.set_current_restaurant_id_for_session(restaurant_id_value uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- The 'true' in the third argument of set_config makes the setting local to the current session/transaction.
  PERFORM set_config('app.current_restaurant_id', restaurant_id_value::text, true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
