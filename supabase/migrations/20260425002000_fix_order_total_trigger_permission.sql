-- Fix mobile staff order item inserts failing during total recalculation.
--
-- Purpose:
-- Authenticated branch staff can insert order_items through RLS, but the
-- AFTER trigger public.update_order_total() called public.calculate_order_total(uuid),
-- whose EXECUTE grant is intentionally limited to service_role. Run the trigger
-- wrapper as SECURITY DEFINER instead of granting the helper RPC broadly.
--
-- Rollout assumptions:
-- - No data rewrite is needed.
-- - Existing trigger wiring remains unchanged.
-- - public.calculate_order_total(uuid) remains a trusted helper, not a direct
--   authenticated browser/mobile RPC surface.
--
-- Verification:
-- - Insert or update an order_items row as an authenticated branch staff user;
--   orders.total_amount should recalculate without permission denied.

CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_total numeric;
BEGIN
  SELECT public.calculate_order_total(COALESCE(NEW.order_id, OLD.order_id))
  INTO new_total;

  UPDATE public.orders
  SET total_amount = new_total,
      updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;
