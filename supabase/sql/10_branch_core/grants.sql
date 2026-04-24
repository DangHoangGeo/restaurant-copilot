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
GRANT EXECUTE ON FUNCTION public.get_daily_sales_analytics(uuid, date) TO service_role;
