-- Purpose: restrict anonymous order reads to the active customer order session.
-- Rollout assumptions:
-- - Customer order detail APIs already require restaurant_id and session_id.
-- - Direct anon REST callers must provide x-session-id to read session-owned orders.
-- Verification:
-- - An anon request cannot list all orders for a restaurant.
-- - An anon request with matching restaurant and session context sees only that session.

DROP POLICY IF EXISTS "Anonymous can SELECT orders" ON public.orders;
DROP POLICY IF EXISTS "Anonymous can SELECT own session orders" ON public.orders;

CREATE POLICY "Anonymous can SELECT own session orders" ON public.orders
  FOR SELECT TO anon
  USING (
    restaurant_id = public.get_request_restaurant_id()
    AND session_id = public.get_request_session_id()
  );

DROP POLICY IF EXISTS "Anonymous can SELECT order_items" ON public.order_items;
DROP POLICY IF EXISTS "Anonymous can SELECT own session order_items" ON public.order_items;

CREATE POLICY "Anonymous can SELECT own session order_items" ON public.order_items
  FOR SELECT TO anon
  USING (
    restaurant_id = public.get_request_restaurant_id()
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.restaurant_id = public.get_request_restaurant_id()
        AND o.session_id = public.get_request_session_id()
    )
  );
