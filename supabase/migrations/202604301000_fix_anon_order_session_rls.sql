-- Purpose: bind anonymous order mutations to the active customer order session.
-- Rollout assumptions:
-- - Customer-facing server routes already use service-role RPCs for active order writes.
-- - Direct anon REST callers must provide x-session-id when mutating their own session.
-- Verification:
-- - An anon request with only restaurant context cannot update another session's order.
-- - An anon request with matching restaurant and session context can update its own order.

CREATE OR REPLACE FUNCTION public.get_request_session_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  headers jsonb;
  raw_session_id text;
BEGIN
  BEGIN
    headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  EXCEPTION
    WHEN others THEN
      headers := NULL;
  END;

  raw_session_id := COALESCE(
    headers ->> 'x-session-id',
    NULLIF(current_setting('app.current_session_id', true), '')
  );

  IF raw_session_id IS NULL OR btrim(raw_session_id) = '' THEN
    RETURN NULL;
  END IF;

  RETURN raw_session_id::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.get_request_session_id() IS
  'Resolve the customer order session id bound to the current anonymous or public request context';

GRANT EXECUTE ON FUNCTION public.get_request_session_id() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anonymous can UPDATE orders" ON public.orders;
DROP POLICY IF EXISTS "Anonymous can UPDATE own session orders" ON public.orders;

CREATE POLICY "Anonymous can UPDATE own session orders" ON public.orders
  FOR UPDATE TO anon
  USING (
    restaurant_id = public.get_request_restaurant_id()
    AND session_id = public.get_request_session_id()
  )
  WITH CHECK (
    restaurant_id = public.get_request_restaurant_id()
    AND session_id = public.get_request_session_id()
  );

DROP POLICY IF EXISTS "Anonymous can UPDATE order_items" ON public.order_items;
DROP POLICY IF EXISTS "Anonymous can UPDATE own session order_items" ON public.order_items;

CREATE POLICY "Anonymous can UPDATE own session order_items" ON public.order_items
  FOR UPDATE TO anon
  USING (
    restaurant_id = public.get_request_restaurant_id()
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.restaurant_id = public.get_request_restaurant_id()
        AND o.session_id = public.get_request_session_id()
    )
  )
  WITH CHECK (
    restaurant_id = public.get_request_restaurant_id()
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.restaurant_id = public.get_request_restaurant_id()
        AND o.session_id = public.get_request_session_id()
    )
  );
