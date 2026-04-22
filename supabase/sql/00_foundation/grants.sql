-- 00_foundation/grants.sql
-- Explicit execute permissions for canonical helper functions.

\echo '00_foundation/grants.sql'

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_request_restaurant_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_restaurant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_service_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_restaurant_role(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_restaurant_service_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_current_restaurant_id_for_session(uuid) TO anon, authenticated, service_role;
