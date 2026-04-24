-- 20_ordering_customer/functions.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '20_ordering_customer/functions.sql'

CREATE OR REPLACE FUNCTION public.get_active_orders_with_details(p_restaurant_id uuid)
 RETURNS SETOF orders
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Return all orders that are not completed, canceled, or draft
    -- The client will handle the relationship data fetching for order items
    RETURN QUERY
    SELECT *
    FROM orders
    WHERE orders.restaurant_id = p_restaurant_id
      AND orders.status NOT IN ('completed', 'canceled', 'draft')
    ORDER BY orders.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_order(p_restaurant_id uuid, p_table_id uuid, p_guest_count integer, p_items jsonb)
 RETURNS TABLE(order_id uuid, total_amount numeric, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_session_id uuid := gen_random_uuid();
  v_created_at timestamptz := now();
  v_item jsonb;
  v_menu_item_id uuid;
  v_menu_item_size_id uuid;
  v_quantity integer;
  v_notes text;
  v_topping_ids uuid[];
  v_base_price numeric(12,2);
  v_toppings_total numeric(12,2);
  v_unit_price numeric(12,2);
  v_order_total numeric(12,2) := 0;
BEGIN
  IF NOT public.can_access_restaurant_context(p_restaurant_id) THEN
    RAISE EXCEPTION 'Not authorized for restaurant %', p_restaurant_id;
  END IF;

  IF p_guest_count IS NULL OR p_guest_count <= 0 THEN
    RAISE EXCEPTION 'guest_count must be positive';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'order_items must be a non-empty JSON array';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM tables
    WHERE id = p_table_id
      AND restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'table does not belong to restaurant';
  END IF;

  INSERT INTO orders (
    id,
    restaurant_id,
    table_id,
    session_id,
    guest_count,
    status,
    total_amount,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    p_restaurant_id,
    p_table_id,
    v_session_id,
    p_guest_count,
    'new',
    0,
    v_created_at,
    v_created_at
  );

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
      AND mi.available = true;

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

    SELECT COALESCE(SUM(t.price), 0)
    INTO v_toppings_total
    FROM toppings t
    WHERE t.restaurant_id = p_restaurant_id
      AND t.menu_item_id = v_menu_item_id
      AND (
        cardinality(v_topping_ids) = 0
        OR t.id = ANY (v_topping_ids)
      );

    v_unit_price := COALESCE(v_base_price, 0) + COALESCE(v_toppings_total, 0);
    v_order_total := v_order_total + (v_unit_price * v_quantity);

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
      v_order_id,
      v_menu_item_id,
      v_menu_item_size_id,
      v_quantity,
      v_notes,
      'new',
      COALESCE(v_topping_ids, ARRAY[]::uuid[]),
      v_unit_price,
      v_created_at,
      v_created_at
    );
  END LOOP;

  UPDATE orders
  SET total_amount = v_order_total,
      updated_at = now()
  WHERE id = v_order_id;

  RETURN QUERY
  SELECT v_order_id, v_order_total, v_created_at;
END;
$function$;

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
  v_new_total numeric(12,2) := 0;
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

  SELECT o.id, o.total_amount, o.status
  INTO v_order
  FROM orders AS o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.session_id = p_session_id
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

  SELECT COALESCE(SUM(oi.price_at_order * oi.quantity), 0)
  INTO v_new_total
  FROM order_items oi
  WHERE oi.order_id = v_order.id
    AND oi.status != 'canceled';

  UPDATE orders AS o
  SET total_amount = v_new_total,
      status = 'serving',
      updated_at = v_updated_at
  WHERE o.id = v_order.id;

  order_id := v_order.id;
  total_amount := v_new_total;
  updated_at := v_updated_at;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_item_counts_for_categories(p_category_ids uuid[])
 RETURNS TABLE(category_id uuid, item_count bigint)
 LANGUAGE sql
AS $function$
    SELECT
        mi.category_id,
        COUNT(mi.id) as item_count
    FROM
        menu_items mi
    WHERE
        mi.category_id = ANY(p_category_ids)
    GROUP BY
        mi.category_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_restaurant_homepage_data(restaurant_subdomain text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  restaurant_data json;
  owners_data json;
  gallery_data json;
  signature_dishes_data json;
  result json;
BEGIN
  -- Get restaurant basic info
  SELECT to_json(r.*) INTO restaurant_data
  FROM restaurants r
  WHERE r.subdomain = restaurant_subdomain;
  
  IF restaurant_data IS NULL THEN
    RETURN json_build_object('error', 'Restaurant not found');
  END IF;
  
  -- Get owners (users with role='owner')
  SELECT json_agg(
    json_build_object(
      'id', u.id,
      'name', u.name,
      'email', u.email,
      'photo_url', u.photo_url
    )
  ) INTO owners_data
  FROM users u
  WHERE u.restaurant_id = (restaurant_data->>'id')::uuid
    AND u.role = 'owner';
  
  -- Get gallery images
  SELECT json_agg(
    json_build_object(
      'id', g.id,
      'image_url', g.image_url,
      'caption', g.caption,
      'alt_text', g.alt_text,
      'sort_order', g.sort_order,
      'is_hero', g.is_hero
    ) ORDER BY g.sort_order
  ) INTO gallery_data
  FROM restaurant_gallery_images g
  WHERE g.restaurant_id = (restaurant_data->>'id')::uuid;
  
  -- Get signature dishes
  SELECT json_agg(
    json_build_object(
      'id', m.id,
      'name_en', m.name_en,
      'name_ja', m.name_ja,
      'name_vi', m.name_vi,
      'description_en', m.description_en,
      'description_ja', m.description_ja,
      'description_vi', m.description_vi,
      'price', m.price,
      'image_url', m.image_url,
      'category_name_en', c.name_en,
      'category_name_ja', c.name_ja,
      'category_name_vi', c.name_vi
    ) ORDER BY m.position
  ) INTO signature_dishes_data
  FROM menu_items m
  JOIN categories c ON m.category_id = c.id
  WHERE m.restaurant_id = (restaurant_data->>'id')::uuid
    AND m.is_signature = true
    AND m.available = true;
  
  -- Build final result
  result := json_build_object(
    'restaurant', restaurant_data,
    'owners', COALESCE(owners_data, '[]'::json),
    'gallery', COALESCE(gallery_data, '[]'::json),
    'signature_dishes', COALESCE(signature_dishes_data, '[]'::json)
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_table_status_on_order_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- When a new order is created, mark table as occupied
    IF TG_OP = 'INSERT' THEN
        UPDATE tables 
        SET status = 'occupied', 
            updated_at = now()
        WHERE id = NEW.table_id;
        RETURN NEW;
    END IF;
    
    -- When an order is completed or canceled, check if table should be available
    IF TG_OP = 'UPDATE' THEN
        -- If order status changed to completed or canceled
        IF OLD.status != NEW.status AND NEW.status IN ('completed', 'canceled') THEN
            -- Check if there are any other active orders for this table
            IF NOT EXISTS (
                SELECT 1 FROM orders 
                WHERE table_id = NEW.table_id 
                AND status IN ('new', 'serving') 
                AND id != NEW.id
            ) THEN
                -- No other active orders, mark table as available
                UPDATE tables 
                SET status = 'available', 
                    updated_at = now()
                WHERE id = NEW.table_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- When an order is deleted, check if table should be available
    IF TG_OP = 'DELETE' THEN
        -- Only update if the deleted order was active
        IF OLD.status IN ('new', 'serving') THEN
            -- Check if there are any other active orders for this table
            IF NOT EXISTS (
                SELECT 1 FROM orders 
                WHERE table_id = OLD.table_id 
                AND status IN ('new', 'serving')
            ) THEN
                -- No other active orders, mark table as available
                UPDATE tables 
                SET status = 'available', 
                    updated_at = now()
                WHERE id = OLD.table_id;
            END IF;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_status_on_item_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    order_record RECORD;
    all_items_ready BOOLEAN;
    all_items_served BOOLEAN;
    has_preparing_items BOOLEAN;
    has_canceled_items BOOLEAN;
    order_id_to_check UUID;
BEGIN
    -- Get the order_id from the trigger
    IF TG_OP = 'DELETE' THEN
        order_id_to_check := OLD.order_id;
    ELSE
        order_id_to_check := NEW.order_id;
    END IF;
    
    -- Get current order status
    SELECT status INTO order_record FROM orders WHERE id = order_id_to_check;
    
    -- Check the status of all items in this order
    SELECT 
        NOT EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status NOT IN ('ready', 'served', 'canceled')) as all_ready,
        NOT EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status != 'served') as all_served,
        EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status = 'preparing') as has_preparing,
        EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status = 'canceled') as has_canceled
    INTO all_items_ready, all_items_served, has_preparing_items, has_canceled_items;
    
    -- Update order status based on item statuses
    IF has_preparing_items OR all_items_ready THEN
        -- Some items are preparing or ready, mark order as serving
        UPDATE orders 
        SET status = 'serving', 
            updated_at = now()
        WHERE id = order_id_to_check AND status = 'new';
    END IF;
    
    -- Check if all items are canceled (order should be canceled)
    IF NOT EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status != 'canceled') THEN
        UPDATE orders 
        SET status = 'canceled', 
            updated_at = now()
        WHERE id = order_id_to_check AND status NOT IN ('completed', 'canceled');
    END IF;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_total_amount()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    order_id_to_update UUID;
    new_total NUMERIC;
BEGIN
    -- Get the order_id from the trigger
    IF TG_OP = 'DELETE' THEN
        order_id_to_update := OLD.order_id;
    ELSE
        order_id_to_update := NEW.order_id;
    END IF;
    
    -- Calculate new total amount (excluding canceled items)
    SELECT COALESCE(SUM(price_at_order * quantity), 0)
    INTO new_total
    FROM order_items 
    WHERE order_id = order_id_to_update 
    AND status != 'canceled';
    
    -- Update the order total
    UPDATE orders 
    SET total_amount = new_total,
        updated_at = now()
    WHERE id = order_id_to_update;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;
