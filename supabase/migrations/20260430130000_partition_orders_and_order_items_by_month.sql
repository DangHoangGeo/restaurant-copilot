-- Phase 2.1 development rollout: monthly partition orders and order_items.
--
-- This migration is intentionally invasive. It is appropriate while there is no
-- real production ordering data. It preserves existing rows when possible, but
-- it does not preserve the old single-column order FK contract because Postgres
-- partitioned parent unique keys must include the partition key.

BEGIN;

DROP FUNCTION IF EXISTS public.get_active_orders_with_details(uuid);

ALTER TABLE IF EXISTS public.feedback
  DROP CONSTRAINT IF EXISTS feedback_order_id_fkey,
  ADD COLUMN IF NOT EXISTS order_created_at timestamp with time zone;

ALTER TABLE IF EXISTS public.order_discounts
  DROP CONSTRAINT IF EXISTS order_discounts_order_id_fkey,
  ADD COLUMN IF NOT EXISTS order_created_at timestamp with time zone;

ALTER TABLE IF EXISTS public.order_items
  DROP CONSTRAINT IF EXISTS order_items_order_id_fkey,
  DROP CONSTRAINT IF EXISTS order_items_pkey,
  ADD COLUMN IF NOT EXISTS order_created_at timestamp with time zone;

ALTER TABLE IF EXISTS public.orders
  DROP CONSTRAINT IF EXISTS orders_pkey,
  DROP CONSTRAINT IF EXISTS orders_session_id_key;

UPDATE public.order_items oi
SET order_created_at = o.created_at
FROM public.orders o
WHERE oi.order_id = o.id
  AND oi.order_created_at IS NULL;

UPDATE public.feedback f
SET order_created_at = o.created_at
FROM public.orders o
WHERE f.order_id = o.id
  AND f.order_created_at IS NULL;

UPDATE public.order_discounts od
SET order_created_at = o.created_at
FROM public.orders o
WHERE od.order_id = o.id
  AND od.order_created_at IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.order_items
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN order_created_at SET NOT NULL;

ALTER TABLE public.feedback
  ALTER COLUMN order_created_at SET NOT NULL;

ALTER TABLE public.order_discounts
  ALTER COLUMN order_created_at SET NOT NULL;

ALTER TABLE public.orders RENAME TO orders_unpartitioned_for_partition_rollout;
ALTER TABLE public.order_items RENAME TO order_items_unpartitioned_for_partition_rollout;

CREATE TABLE public.orders (
  LIKE public.orders_unpartitioned_for_partition_rollout
  INCLUDING DEFAULTS
  INCLUDING CONSTRAINTS
  INCLUDING STORAGE
  INCLUDING COMMENTS
) PARTITION BY RANGE (created_at);

CREATE TABLE public.order_items (
  LIKE public.order_items_unpartitioned_for_partition_rollout
  INCLUDING DEFAULTS
  INCLUDING CONSTRAINTS
  INCLUDING STORAGE
  INCLUDING COMMENTS
) PARTITION BY RANGE (created_at);

DO $$
DECLARE
  min_month date;
  end_month date;
  month_start date;
  month_end date;
  orders_partition text;
  order_items_partition text;
BEGIN
  SELECT date_trunc(
    'month',
    LEAST(
      COALESCE((SELECT MIN(created_at) FROM public.orders_unpartitioned_for_partition_rollout), now()),
      COALESCE((SELECT MIN(created_at) FROM public.order_items_unpartitioned_for_partition_rollout), now()),
      now()
    )
  )::date
  INTO min_month;

  end_month := (date_trunc('month', now()) + INTERVAL '4 months')::date;
  month_start := min_month;

  WHILE month_start < end_month LOOP
    month_end := (month_start + INTERVAL '1 month')::date;
    orders_partition := 'orders_' || to_char(month_start, 'YYYY_MM');
    order_items_partition := 'order_items_' || to_char(month_start, 'YYYY_MM');

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.orders FOR VALUES FROM (%L) TO (%L)',
      orders_partition,
      month_start::text,
      month_end::text
    );

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.order_items FOR VALUES FROM (%L) TO (%L)',
      order_items_partition,
      month_start::text,
      month_end::text
    );

    month_start := month_end;
  END LOOP;
END;
$$;

INSERT INTO public.orders
SELECT *
FROM public.orders_unpartitioned_for_partition_rollout;

INSERT INTO public.order_items
SELECT *
FROM public.order_items_unpartitioned_for_partition_rollout;

DROP TABLE public.order_items_unpartitioned_for_partition_rollout;
DROP TABLE public.orders_unpartitioned_for_partition_rollout;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_pkey PRIMARY KEY (id, created_at);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_pkey PRIMARY KEY (id, created_at);

CREATE INDEX idx_order_items_menu_item_created ON public.order_items USING btree (menu_item_id, created_at DESC);
CREATE INDEX idx_order_items_menu_item_size ON public.order_items USING btree (menu_item_size_id);
CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);
CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);
CREATE INDEX idx_order_items_order_created_at ON public.order_items USING btree (order_id, order_created_at);
CREATE INDEX idx_order_items_order_status ON public.order_items USING btree (order_id, status);
CREATE INDEX idx_order_items_orders_reporting ON public.order_items USING btree (restaurant_id, created_at DESC);
CREATE INDEX idx_order_items_restaurant_menu_item ON public.order_items USING btree (restaurant_id, menu_item_id);
CREATE INDEX idx_order_items_restaurant_price ON public.order_items USING btree (restaurant_id, price_at_order);
CREATE INDEX idx_order_items_restaurant_status ON public.order_items USING btree (restaurant_id, status);
CREATE INDEX idx_order_items_topping_ids ON public.order_items USING gin (topping_ids);

COMMENT ON INDEX public.idx_order_items_restaurant_menu_item IS 'Optimizes popular items analysis and menu item performance queries';

CREATE INDEX idx_orders_completed_date ON public.orders USING btree (restaurant_id, created_at DESC) WHERE (status = 'completed'::text);
CREATE INDEX idx_orders_id ON public.orders USING btree (id);
CREATE INDEX idx_orders_restaurant_created ON public.orders USING btree (restaurant_id, created_at DESC);
CREATE INDEX idx_orders_restaurant_status ON public.orders USING btree (restaurant_id, status);
CREATE INDEX idx_orders_session_id ON public.orders USING btree (session_id);
CREATE INDEX idx_orders_single_active_session_per_table ON public.orders USING btree (restaurant_id, table_id) WHERE (status = ANY (ARRAY['new'::text, 'serving'::text]));
CREATE INDEX idx_orders_restaurant_status_created ON public.orders USING btree (restaurant_id, status, created_at DESC) WHERE (status = ANY (ARRAY['new'::text, 'confirmed'::text, 'preparing'::text, 'ready'::text, 'serving'::text, 'completed'::text, 'canceled'::text]));

COMMENT ON INDEX public.idx_orders_restaurant_status_created IS 'Optimizes dashboard queries filtering by restaurant, status, and ordering by creation date';

CREATE OR REPLACE FUNCTION public.set_order_created_at_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.order_created_at IS NULL THEN
    SELECT o.created_at
    INTO NEW.order_created_at
    FROM public.orders o
    WHERE o.id = NEW.order_id
      AND o.restaurant_id = NEW.restaurant_id
    ORDER BY o.created_at DESC
    LIMIT 1;
  END IF;

  IF NEW.order_created_at IS NULL THEN
    RAISE EXCEPTION 'Order % was not found for restaurant %', NEW.order_id, NEW.restaurant_id
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.set_order_created_at_from_order() IS 'Fills composite partition foreign-key column order_created_at from the referenced order before insert/update.';

ALTER TABLE ONLY public.feedback
  ADD CONSTRAINT feedback_order_id_fkey FOREIGN KEY (order_id, order_created_at) REFERENCES public.orders(id, created_at) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_discounts
  ADD CONSTRAINT order_discounts_order_id_fkey FOREIGN KEY (order_id, order_created_at) REFERENCES public.orders(id, created_at) ON DELETE CASCADE;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  ADD CONSTRAINT order_items_menu_item_size_id_fkey FOREIGN KEY (menu_item_size_id) REFERENCES public.menu_item_sizes(id),
  ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id, order_created_at) REFERENCES public.orders(id, created_at) ON DELETE CASCADE,
  ADD CONSTRAINT order_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ADD CONSTRAINT orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE;

CREATE TRIGGER trg_orders_audit AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_changes();
CREATE TRIGGER trg_feedback_order_created_at BEFORE INSERT OR UPDATE OF order_id, restaurant_id, order_created_at ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.set_order_created_at_from_order();
CREATE TRIGGER trg_order_discounts_order_created_at BEFORE INSERT OR UPDATE OF order_id, restaurant_id, order_created_at ON public.order_discounts FOR EACH ROW EXECUTE FUNCTION public.set_order_created_at_from_order();
CREATE TRIGGER trg_order_items_order_created_at BEFORE INSERT OR UPDATE OF order_id, restaurant_id, order_created_at ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_order_created_at_from_order();
CREATE TRIGGER trg_update_order_total AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_total();
CREATE TRIGGER trigger_update_order_status_on_item_change AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_status_on_item_change();
CREATE TRIGGER trigger_update_order_total_amount AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_total_amount();
CREATE TRIGGER trigger_update_table_status_on_order_change AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_table_status_on_order_change();

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous can INSERT order_items" ON public.order_items FOR INSERT TO anon WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));
CREATE POLICY "Anonymous can INSERT orders" ON public.orders FOR INSERT TO anon WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));
CREATE POLICY "Anonymous can SELECT own session order_items" ON public.order_items FOR SELECT TO anon USING (((restaurant_id = public.get_request_restaurant_id()) AND (EXISTS ( SELECT 1 FROM public.orders o WHERE ((o.id = order_items.order_id) AND (o.created_at = order_items.order_created_at) AND (o.restaurant_id = public.get_request_restaurant_id()) AND (o.session_id = public.get_request_session_id()))))));
CREATE POLICY "Anonymous can SELECT own session orders" ON public.orders FOR SELECT TO anon USING (((restaurant_id = public.get_request_restaurant_id()) AND (session_id = public.get_request_session_id())));
CREATE POLICY "Anonymous can UPDATE own session order_items" ON public.order_items FOR UPDATE TO anon USING (((restaurant_id = public.get_request_restaurant_id()) AND (EXISTS ( SELECT 1 FROM public.orders o WHERE ((o.id = order_items.order_id) AND (o.created_at = order_items.order_created_at) AND (o.restaurant_id = public.get_request_restaurant_id()) AND (o.session_id = public.get_request_session_id())))))) WITH CHECK (((restaurant_id = public.get_request_restaurant_id()) AND (EXISTS ( SELECT 1 FROM public.orders o WHERE ((o.id = order_items.order_id) AND (o.created_at = order_items.order_created_at) AND (o.restaurant_id = public.get_request_restaurant_id()) AND (o.session_id = public.get_request_session_id()))))));
CREATE POLICY "Anonymous can UPDATE own session orders" ON public.orders FOR UPDATE TO anon USING (((restaurant_id = public.get_request_restaurant_id()) AND (session_id = public.get_request_session_id()))) WITH CHECK (((restaurant_id = public.get_request_restaurant_id()) AND (session_id = public.get_request_session_id())));
CREATE POLICY "Authenticated users can SELECT order_items" ON public.order_items FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));
CREATE POLICY "Authenticated users can SELECT orders" ON public.orders FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));
CREATE POLICY "Staff can DELETE order_items" ON public.order_items FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));
CREATE POLICY "Staff can DELETE orders" ON public.orders FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));
CREATE POLICY "Staff can INSERT order_items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));
CREATE POLICY "Staff can INSERT orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));
CREATE POLICY "Staff can UPDATE order_items" ON public.order_items FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));
CREATE POLICY "Staff can UPDATE orders" ON public.orders FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));
CREATE POLICY order_items_platform_admin_read ON public.order_items FOR SELECT USING (public.is_platform_admin());
CREATE POLICY orders_platform_admin_read ON public.orders FOR SELECT USING (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.get_active_orders_with_details(p_restaurant_id uuid)
 RETURNS SETOF orders
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT *
    FROM orders
    WHERE orders.restaurant_id = p_restaurant_id
      AND orders.status NOT IN ('completed', 'canceled', 'draft')
    ORDER BY orders.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_active_orders_with_details(uuid) TO service_role;

COMMIT;
