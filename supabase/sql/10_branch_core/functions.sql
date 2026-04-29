-- 10_branch_core/functions.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '10_branch_core/functions.sql'

CREATE OR REPLACE FUNCTION public.log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO audit_logs (
    restaurant_id,
    user_id,
    action,
    table_name,
    record_id,
    changes,
    ip_address
  )
  VALUES (
    COALESCE(NEW.restaurant_id, OLD.restaurant_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
    current_setting('request.ip', true)::inet
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_sellers_7days(p_restaurant_id uuid, p_limit integer)
 RETURNS TABLE(menu_item_id uuid, name_en text, name_ja text, name_vi text, total_sold bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        mi.id as menu_item_id,
        mi.name_en,
        mi.name_ja,
        mi.name_vi,
        SUM(oi.quantity) AS total_sold
    FROM
        order_items oi
    JOIN
        orders o ON oi.order_id = o.id
    JOIN
        menu_items mi ON oi.menu_item_id = mi.id
    WHERE
        o.restaurant_id = p_restaurant_id AND
        o.created_at >= NOW() - INTERVAL '7 days' AND
        o.status = 'completed'
    GROUP BY
        mi.id, mi.name_en, mi.name_ja, mi.name_vi
    ORDER BY
        total_sold DESC
    LIMIT
        p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.apply_recommendations(p_restaurant_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    featured_category_id uuid;
    top_seller_record record;
BEGIN
    -- Find or create "Featured" category
    SELECT id INTO featured_category_id
    FROM categories
    WHERE restaurant_id = p_restaurant_id AND name_en = 'Featured';

    IF featured_category_id IS NULL THEN
        INSERT INTO categories (restaurant_id, name_en, name_ja, name_vi, position)
        VALUES (p_restaurant_id, 'Featured', 'おすすめ', 'Nổi bật', 0)
        RETURNING id INTO featured_category_id;
    END IF;

    -- Delete existing items in "Featured" category
    DELETE FROM menu_items
    WHERE restaurant_id = p_restaurant_id AND category_id = featured_category_id;

    -- Copy top 3 sellers into "Featured" category
    FOR top_seller_record IN
        WITH top_sellers AS (
            SELECT ts.menu_item_id
            FROM get_top_sellers_7days(p_restaurant_id, 3) ts
        )
        SELECT
            orig_mi.*
        FROM menu_items orig_mi
        JOIN top_sellers ts ON orig_mi.id = ts.menu_item_id
    LOOP
        INSERT INTO menu_items (
            restaurant_id,
            category_id,
            name_ja,
            name_en,
            name_vi,
            code,
            description_ja,
            description_en,
            description_vi,
            price,
            tags,
            image_url,
            available,
            position
        )
        VALUES (
            p_restaurant_id,
            featured_category_id,
            top_seller_record.name_ja,
            top_seller_record.name_en,
            top_seller_record.name_vi,
            top_seller_record.code || '_featured',
            top_seller_record.description_ja,
            top_seller_record.description_en,
            top_seller_record.description_vi,
            top_seller_record.price,
            top_seller_record.tags,
            top_seller_record.image_url,
            true,
            0
        );
    END LOOP;

    RETURN json_build_object('success', true);

EXCEPTION
    WHEN others THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_table_session_by_code(input_code text, input_restaurant_id uuid)
 RETURNS TABLE(table_id uuid, restaurant_id uuid, active_session_id uuid, require_passcode boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS table_id,
    t.restaurant_id,
    o.session_id AS active_session_id,
    CASE 
      WHEN o.session_id IS NOT NULL THEN true 
      ELSE false 
    END AS require_passcode
  FROM tables t
  LEFT JOIN LATERAL (
    SELECT session_id
    FROM orders
    WHERE orders.table_id = t.id
      AND orders.status IN ('new', 'serving', 'ready')
    ORDER BY created_at DESC
    LIMIT 1
  ) o ON true
  WHERE t.qr_code = input_code
    AND t.restaurant_id = input_restaurant_id
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_order_session_info(p_session_id uuid, p_restaurant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id',            o.id,
    'restaurant_id', p_restaurant_id,
    'session_id',    o.session_id,
    'table_id',      o.table_id,
    'table_name',    t.name,
    'guest_count',   o.guest_count,
    'status',        o.status,
    'total_amount',  COALESCE(o.total_amount, 0),
    'tax_amount',    COALESCE(o.tax_amount, 0),
    'created_at',    o.created_at,
    'items', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'menu_item_id', oi.menu_item_id,
          'name_en',     mi.name_en,
          'name_ja',     mi.name_ja,
          'name_vi',     mi.name_vi,
          'quantity',    oi.quantity,
          'notes',       oi.notes,
          'status',      oi.status,
          'unit_price',  mi.price,
          'total',       COALESCE(oi.price_at_order, mi.price) * oi.quantity,
          'price_at_order', oi.price_at_order,
          'created_at',  oi.created_at,
          'menu_item_sizes', CASE 
            WHEN oi.menu_item_size_id IS NOT NULL THEN
              (SELECT jsonb_build_object(
                'id', mis.id,
                'size_key', mis.size_key,
                'name_en', mis.name_en,
                'name_ja', mis.name_ja,
                'name_vi', mis.name_vi,
                'price', mis.price
              )
              FROM menu_item_sizes mis 
              WHERE mis.id = oi.menu_item_size_id)
            ELSE NULL
          END,
          'toppings', CASE 
            WHEN oi.topping_ids IS NOT NULL AND array_length(oi.topping_ids, 1) > 0 THEN
              (SELECT jsonb_agg(
                jsonb_build_object(
                  'id', t.id,
                  'name_en', t.name_en,
                  'name_ja', t.name_ja,
                  'name_vi', t.name_vi,
                  'price', t.price
                )
              )
              FROM toppings t 
              WHERE t.id = ANY(oi.topping_ids))
            ELSE '[]'::jsonb
          END
        )
      )
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = o.id
    )
  ) 
  INTO result
  FROM orders o
  JOIN tables t ON o.table_id = t.id
  WHERE o.session_id    = p_session_id
    AND o.restaurant_id = p_restaurant_id
  LIMIT 1;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Order session not found';
  END IF;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_order_session_passcode(input_session_id uuid, input_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN LEFT(input_session_id::TEXT, 4) = input_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_item_to_order(input_session_id uuid, input_menu_item_id uuid, input_quantity integer, input_notes text DEFAULT ''::text, input_size_id uuid DEFAULT NULL::uuid, input_topping_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS TABLE(order_item_id uuid, success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o_rec RECORD;
  mi_rec RECORD;
  calculated_price NUMERIC;
  size_price NUMERIC := 0;
  toppings_price NUMERIC := 0;
  new_id UUID := uuid_generate_v4();
BEGIN
  -- Verify active session
  SELECT * INTO o_rec
    FROM orders
   WHERE session_id = input_session_id
     AND status IN ('new','preparing')
   LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'No active order session';
    RETURN;
  END IF;

  -- Get menu item details
  SELECT * INTO mi_rec
    FROM menu_items
   WHERE id = input_menu_item_id
     AND restaurant_id = o_rec.restaurant_id
     AND available = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Menu item not found or not available';
    RETURN;
  END IF;

  -- Calculate price with size if provided
  IF input_size_id IS NOT NULL THEN
    SELECT price INTO size_price
      FROM menu_item_sizes
     WHERE id = input_size_id
       AND menu_item_id = input_menu_item_id
       AND restaurant_id = o_rec.restaurant_id;
    
    IF size_price IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Invalid size selection';
      RETURN;
    END IF;
  END IF;

  -- Calculate toppings price
  IF array_length(input_topping_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO toppings_price
      FROM toppings
     WHERE id = ANY(input_topping_ids)
       AND restaurant_id = o_rec.restaurant_id;
  END IF;

  -- Calculate final price
  calculated_price := COALESCE(size_price, mi_rec.price) + toppings_price;

  -- Insert order item
  INSERT INTO order_items (
    id, restaurant_id, order_id, menu_item_id, menu_item_size_id,
    quantity, notes, topping_ids, price_at_order
  ) VALUES (
    new_id, o_rec.restaurant_id, o_rec.id, input_menu_item_id, input_size_id,
    input_quantity, input_notes, input_topping_ids, calculated_price
  );

  RETURN QUERY SELECT new_id, TRUE, 'Item added successfully';
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_item_status(input_order_item_id uuid, input_restaurant_id uuid, input_status text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate status
  IF input_status NOT IN ('new','preparing','ready','served','canceled') THEN
    RETURN QUERY SELECT FALSE, 'Invalid status';
    RETURN;
  END IF;

  -- Update the order item
  UPDATE order_items 
  SET status = input_status, updated_at = now()
  WHERE id = input_order_item_id 
    AND restaurant_id = input_restaurant_id;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Status updated successfully';
  ELSE
    RETURN QUERY SELECT FALSE, 'Order item not found';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_order_total(order_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_amount NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(price_at_order * quantity), 0)
  INTO total_amount
  FROM order_items
  WHERE order_id = order_id_param
    AND status != 'canceled';

  RETURN total_amount;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_total NUMERIC;
BEGIN
  -- Calculate new total for the order
  SELECT calculate_order_total(COALESCE(NEW.order_id, OLD.order_id))
  INTO new_total;

  -- Update the order total
  UPDATE orders 
  SET total_amount = new_total, updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_employee_bank_encryption_key()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  key_value text;
BEGIN
  key_value := NULLIF(current_setting('app.employee_bank_encryption_key', true), '');

  IF key_value IS NOT NULL THEN
    RETURN key_value;
  END IF;

  IF to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
    BEGIN
      EXECUTE
        'SELECT decrypted_secret::text FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
      INTO key_value
      USING 'employee_bank_account_key';
    EXCEPTION
      WHEN undefined_table OR undefined_column OR insufficient_privilege THEN
        key_value := NULL;
    END;
  END IF;

  RETURN NULLIF(key_value, '');
END;
$function$;

COMMENT ON FUNCTION public.get_employee_bank_encryption_key() IS 'Resolve the encryption key for employee bank account data from app settings or Supabase Vault';

CREATE OR REPLACE FUNCTION public.encrypt_employee_bank_account_number(p_account_number text)
 RETURNS bytea
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key text;
BEGIN
  IF p_account_number IS NULL OR btrim(p_account_number) = '' THEN
    RETURN NULL;
  END IF;

  encryption_key := public.get_employee_bank_encryption_key();
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Employee bank account encryption key is not configured'
      USING ERRCODE = '22023';
  END IF;

  RETURN pgp_sym_encrypt(
    p_account_number,
    encryption_key,
    'cipher-algo=aes256, compress-algo=1'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_employee_bank_account_number(p_account_number_encrypted bytea)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key text;
BEGIN
  IF p_account_number_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  encryption_key := public.get_employee_bank_encryption_key();
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Employee bank account encryption key is not configured'
      USING ERRCODE = '22023';
  END IF;

  RETURN pgp_sym_decrypt(p_account_number_encrypted, encryption_key);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_employee_bank_account(p_employee_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_restaurant_id uuid;
  encrypted_account_number bytea;
BEGIN
  SELECT restaurant_id, bank_account_number_encrypted
  INTO profile_restaurant_id, encrypted_account_number
  FROM public.employee_private_profiles
  WHERE employee_id = p_employee_id;

  IF NOT FOUND OR encrypted_account_number IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT (
    public.is_service_role()
    OR public.user_has_restaurant_role(profile_restaurant_id, ARRAY['owner'::text, 'manager'::text])
  ) THEN
    RAISE EXCEPTION 'Not authorized to read employee bank account data'
      USING ERRCODE = '42501';
  END IF;

  RETURN public.decrypt_employee_bank_account_number(encrypted_account_number);
END;
$function$;

COMMENT ON FUNCTION public.get_employee_bank_account(uuid) IS 'Return a decrypted employee bank account number only for service-role or authorized branch managers';

CREATE OR REPLACE FUNCTION public.set_employee_bank_account(p_employee_id uuid, p_account_number text, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  employee_restaurant_id uuid;
  encrypted_account_number bytea;
BEGIN
  SELECT restaurant_id
  INTO employee_restaurant_id
  FROM public.employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_service_role()
    OR public.user_has_restaurant_role(employee_restaurant_id, ARRAY['owner'::text, 'manager'::text])
  ) THEN
    RAISE EXCEPTION 'Not authorized to update employee bank account data'
      USING ERRCODE = '42501';
  END IF;

  encrypted_account_number := public.encrypt_employee_bank_account_number(p_account_number);

  INSERT INTO public.employee_private_profiles (
    employee_id,
    restaurant_id,
    bank_account_number_encrypted,
    updated_by,
    updated_at
  )
  VALUES (
    p_employee_id,
    employee_restaurant_id,
    encrypted_account_number,
    COALESCE(p_updated_by, auth.uid()),
    now()
  )
  ON CONFLICT (employee_id) DO UPDATE
  SET
    bank_account_number_encrypted = EXCLUDED.bank_account_number_encrypted,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
END;
$function$;

COMMENT ON FUNCTION public.set_employee_bank_account(uuid, text, uuid) IS 'Encrypt and store an employee bank account number through an authorized server or manager action';

CREATE OR REPLACE FUNCTION public.get_daily_sales_analytics(p_restaurant_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(date date, total_orders bigint, total_revenue numeric, average_order_value numeric, top_selling_item_id uuid, top_selling_item_name text, top_selling_item_quantity bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(o.total_amount), 0) as revenue,
      CASE 
        WHEN COUNT(DISTINCT o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(DISTINCT o.id)
        ELSE 0
      END as avg_order_value
    FROM orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND DATE(o.created_at) = p_date
      AND o.status != 'canceled'
  ),
  top_item AS (
    SELECT 
      oi.menu_item_id,
      mi.name_en,
      SUM(oi.quantity) as total_quantity
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE o.restaurant_id = p_restaurant_id
      AND DATE(o.created_at) = p_date
      AND o.status != 'canceled'
      AND oi.status != 'canceled'
    GROUP BY oi.menu_item_id, mi.name_en
    ORDER BY total_quantity DESC
    LIMIT 1
  )
  SELECT 
    p_date,
    ds.order_count,
    ds.revenue,
    ds.avg_order_value,
    ti.menu_item_id,
    ti.name_en,
    ti.total_quantity
  FROM daily_stats ds
  LEFT JOIN top_item ti ON true;
END;
$function$;
