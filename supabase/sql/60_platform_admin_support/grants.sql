-- 60_platform_admin_support/grants.sql
-- Platform RPCs are explicitly callable only by authenticated admin contexts or internal jobs.

\echo '60_platform_admin_support/grants.sql'

GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_internal_operator() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_admin_permissions(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.queue_email_notification(text, text, text, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_platform_action(text, text, uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_restaurant_summary(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_restaurant(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.suspend_restaurant(uuid, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unsuspend_restaurant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_support_ticket_summary(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_restaurant_application(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_sla_breaches() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_escalate_tickets() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sla_performance(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_daily_usage_snapshot(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_all_usage_snapshots(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_usage_trends(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_usage_summary(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_usage_trends(date, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_overview_summary(date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_overview_trends(date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_top_seller_for_day(uuid, text) TO authenticated, service_role;
