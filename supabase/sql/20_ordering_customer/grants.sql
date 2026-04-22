-- 20_ordering_customer/grants.sql
-- Public restaurant entry stays readable, while write-side ordering RPCs stay server-owned.

\echo '20_ordering_customer/grants.sql'

GRANT EXECUTE ON FUNCTION public.get_active_orders_with_details(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, uuid, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.append_items_to_order_session(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_item_counts_for_categories(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_restaurant_homepage_data(text) TO anon, authenticated, service_role;
