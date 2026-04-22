-- 30_founder_control/grants.sql
-- Founder and organization helpers must remain callable from authenticated server contexts.

\echo '30_founder_control/grants.sql'

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_founder(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member_for_restaurant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_authenticated_restaurant_override_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.organization_member_has_branch_operations_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_restaurant_service_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_accessible_branches_for_current_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_can_access_restaurant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_restaurant_context(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_organization_branch_overview(uuid[], date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_restaurant_onboarding(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text[]) TO authenticated, service_role;
