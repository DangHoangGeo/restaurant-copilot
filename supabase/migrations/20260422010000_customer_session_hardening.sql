-- Harden customer session and item append flows without changing the canonical branch model.
-- Adds a single-active-session-per-table guard and a transactional append RPC for customer ordering.

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_single_active_session_per_table
ON public.orders USING btree (restaurant_id, table_id)
WHERE (status = ANY (ARRAY['new'::text, 'serving'::text]));

CREATE OR REPLACE FUNCTION public.append_items_to_order_session(p_restaurant_id uuid, p_session_id uuid, p_items jsonb)
 RETURNS TABLE(order_id uuid, total_amount numeric, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_item jsonb;
  v_menu_item_id uuid;
  v_menu_item_size_id uuid;
  v_quantity integer;
  v_notes text;
  v_topping_ids uuid[];
  v_base_price numeric(12,2);
  v_toppings_total numeric(12,2);
  v_unit_price numeric(12,2);
  v_topping_count integer;
  v_order_increment numeric(12,2) := 0;
  v_today_weekday integer := CASE
    WHEN EXTRACT(DOW FROM now()) = 0 THEN 7
    ELSE EXTRACT(DOW FROM now())::integer
  END;
  v_updated_at timestamptz := now();
BEGIN
  IF NOT public.can_access_restaurant_context(p_restaurant_id) THEN
    RAISE EXCEPTION 'Not authorized for restaurant %', p_restaurant_id;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'order_items must be a non-empty JSON array';
  END IF;

  SELECT id, total_amount, status
  INTO v_order
  FROM orders
  WHERE restaurant_id = p_restaurant_id
    AND session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order session not found';
  END IF;

  IF v_order.status NOT IN ('new', 'serving') THEN
    RAISE EXCEPTION 'Order session is not active';
  END IF;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;
    v_menu_item_size_id := NULLIF(v_item ->> 'menu_item_size_id', '')::uuid;
    v_quantity := COALESCE((v_item ->> 'quantity')::integer, 0);
    v_notes := NULLIF(v_item ->> 'notes', '');

    SELECT COALESCE(array_agg(value::uuid), ARRAY[]::uuid[])
    INTO v_topping_ids
    FROM jsonb_array_elements_text(COALESCE(v_item -> 'topping_ids', '[]'::jsonb));

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'quantity must be positive for all items';
    END IF;

    SELECT mi.price
    INTO v_base_price
    FROM menu_items mi
    WHERE mi.id = v_menu_item_id
      AND mi.restaurant_id = p_restaurant_id
      AND mi.available = true
      AND v_today_weekday = ANY (mi.weekday_visibility);

    IF v_base_price IS NULL THEN
      RAISE EXCEPTION 'menu item % is unavailable or does not belong to restaurant %', v_menu_item_id, p_restaurant_id;
    END IF;

    IF v_menu_item_size_id IS NOT NULL THEN
      SELECT mis.price
      INTO v_base_price
      FROM menu_item_sizes mis
      WHERE mis.id = v_menu_item_size_id
        AND mis.menu_item_id = v_menu_item_id
        AND mis.restaurant_id = p_restaurant_id;

      IF v_base_price IS NULL THEN
        RAISE EXCEPTION 'menu item size % is invalid for menu item %', v_menu_item_size_id, v_menu_item_id;
      END IF;
    END IF;

    IF cardinality(v_topping_ids) > 0 THEN
      SELECT COALESCE(SUM(t.price), 0), COUNT(*)
      INTO v_toppings_total, v_topping_count
      FROM toppings t
      WHERE t.restaurant_id = p_restaurant_id
        AND t.menu_item_id = v_menu_item_id
        AND t.id = ANY (v_topping_ids);

      IF v_topping_count <> cardinality(v_topping_ids) THEN
        RAISE EXCEPTION 'One or more toppings are invalid for menu item %', v_menu_item_id;
      END IF;
    ELSE
      v_toppings_total := 0;
    END IF;

    v_unit_price := COALESCE(v_base_price, 0) + COALESCE(v_toppings_total, 0);
    v_order_increment := v_order_increment + (v_unit_price * v_quantity);

    INSERT INTO order_items (
      id,
      restaurant_id,
      order_id,
      menu_item_id,
      menu_item_size_id,
      quantity,
      notes,
      status,
      topping_ids,
      price_at_order,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_restaurant_id,
      v_order.id,
      v_menu_item_id,
      v_menu_item_size_id,
      v_quantity,
      v_notes,
      'new',
      COALESCE(v_topping_ids, ARRAY[]::uuid[]),
      v_unit_price,
      v_updated_at,
      v_updated_at
    );
  END LOOP;

  UPDATE orders
  SET total_amount = COALESCE(total_amount, 0) + v_order_increment,
      status = 'serving',
      updated_at = v_updated_at
  WHERE id = v_order.id
  RETURNING orders.total_amount
  INTO total_amount;

  order_id := v_order.id;
  updated_at := v_updated_at;
  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.append_items_to_order_session(uuid, uuid, jsonb) TO service_role;
