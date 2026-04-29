-- 10_branch_core/grants.sql
-- Keep branch operational RPCs behind trusted server routes by default.

\echo '10_branch_core/grants.sql'

GRANT EXECUTE ON FUNCTION public.get_top_sellers_7days(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_recommendations(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_session_by_code(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_order_session_info(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_order_session_passcode(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_item_to_order(uuid, uuid, integer, text, uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_order_item_status(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_order_total(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_employee_bank_account(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_employee_bank_account(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_sales_analytics(uuid, date) TO service_role;
REVOKE ALL ON FUNCTION public.get_order_partition_health(date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_monthly_order_partitions(date, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_partition_health(date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_monthly_order_partitions(date, integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.refresh_analytics_snapshot(uuid, date) TO authenticated, service_role;
