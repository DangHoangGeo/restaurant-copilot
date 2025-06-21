-- ================================================
-- PRODUCTION FUNCTIONS & TRIGGERS
-- Restaurant Copilot Database Functions
-- ================================================

-- ================================================
-- AUDIT LOGGING FUNCTIONS
-- ================================================

-- Function to log changes for audit purposes
CREATE OR REPLACE FUNCTION public.log_changes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Attach triggers on critical tables for audit logging
CREATE TRIGGER trg_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_menu_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_inventory_audit
  AFTER INSERT OR UPDATE OR DELETE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_bookings_audit
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- ================================================
-- BUSINESS INTELLIGENCE FUNCTIONS
-- ================================================

-- Function to get top selling items for the last 7 days
CREATE OR REPLACE FUNCTION get_top_sellers_7days(p_restaurant_id uuid, p_limit int)
RETURNS TABLE (
    menu_item_id UUID,
    name_en TEXT,
    name_ja TEXT,
    name_vi TEXT,
    total_sold BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_sellers_7days(uuid, int) TO authenticated;

-- Function to apply AI recommendations by creating featured category
CREATE OR REPLACE FUNCTION apply_recommendations(p_restaurant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION apply_recommendations(uuid) TO authenticated;

-- ================================================
-- QR CODE & SESSION MANAGEMENT FUNCTIONS
-- ================================================

-- Function to get table session information by QR code
CREATE OR REPLACE FUNCTION get_table_session_by_code(
  input_code text,
  input_restaurant_id uuid
)
RETURNS TABLE (
  table_id uuid,
  restaurant_id uuid,
  active_session_id uuid,
  require_passcode boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_table_session_by_code(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_table_session_by_code(text, uuid) TO authenticated;

-- Function to get order session information with all details
CREATE OR REPLACE FUNCTION get_order_session_info(
  p_session_id   UUID,
  p_restaurant_id UUID
)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_order_session_info(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_order_session_info(uuid, uuid) TO authenticated;

-- Function to verify order session passcode
CREATE OR REPLACE FUNCTION verify_order_session_passcode(
  input_session_id UUID,
  input_code       TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN LEFT(input_session_id::TEXT, 4) = input_code;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION verify_order_session_passcode(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_order_session_passcode(uuid, text) TO authenticated;

-- ================================================
-- ORDER MANAGEMENT FUNCTIONS
-- ================================================

-- Function to get active orders with all related data
CREATE OR REPLACE FUNCTION get_active_orders_with_details(restaurant_uuid UUID)
RETURNS TABLE (
    -- Order fields
    order_id UUID,
    order_restaurant_id UUID,
    order_table_id UUID,
    order_session_id UUID,
    order_guest_count INTEGER,
    order_status TEXT,
    order_total_amount DECIMAL,
    order_created_at TIMESTAMPTZ,
    order_updated_at TIMESTAMPTZ,
    
    -- Table fields
    table_id UUID,
    table_name TEXT,
    table_status TEXT,
    table_capacity INTEGER,
    table_is_outdoor BOOLEAN,
    table_is_accessible BOOLEAN,
    table_notes TEXT,
    
    -- Order items as JSON aggregation
    order_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.restaurant_id as order_restaurant_id,
        o.table_id as order_table_id,
        o.session_id as order_session_id,
        o.guest_count as order_guest_count,
        o.status as order_status,
        o.total_amount as order_total_amount,
        o.created_at as order_created_at,
        o.updated_at as order_updated_at,
        
        t.id as table_id,
        t.name as table_name,
        t.status as table_status,
        t.capacity as table_capacity,
        t.is_outdoor as table_is_outdoor,
        t.is_accessible as table_is_accessible,
        t.notes as table_notes,
        
        -- Aggregate order items with menu details as JSON
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'restaurant_id', oi.restaurant_id,
                    'order_id', oi.order_id,
                    'menu_item_id', oi.menu_item_id,
                    'quantity', oi.quantity,
                    'notes', oi.notes,
                    'status', oi.status,
                    'price_at_order', oi.price_at_order,
                    'topping_ids', oi.topping_ids,
                    'menu_item_size_id', oi.menu_item_size_id,
                    'created_at', oi.created_at,
                    'menu_item', jsonb_build_object(
                        'id', mi.id,
                        'restaurant_id', mi.restaurant_id,
                        'category_id', mi.category_id,
                        'name_en', mi.name_en,
                        'name_ja', mi.name_ja,
                        'name_vi', mi.name_vi,
                        'code', mi.code,
                        'description_en', mi.description_en,
                        'description_ja', mi.description_ja,
                        'price', mi.price,
                        'updated_at', mi.updated_at
                    )
                )
                ORDER BY oi.created_at
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::jsonb
        ) as order_items
        
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
    
    WHERE o.restaurant_id = restaurant_uuid
      AND o.status IN ('new', 'preparing', 'ready')
    
    GROUP BY 
        o.id, o.restaurant_id, o.table_id, o.session_id, o.guest_count, 
        o.status, o.total_amount, o.created_at, o.updated_at,
        t.id, t.name, t.status, t.capacity, t.is_outdoor, t.is_accessible, t.notes
    
    ORDER BY o.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_active_orders_with_details(UUID) TO authenticated;

-- Function to add an item to an order with full validation
CREATE OR REPLACE FUNCTION add_item_to_order(
  input_session_id   UUID,
  input_menu_item_id UUID,
  input_quantity     INT,
  input_notes        TEXT DEFAULT '',
  input_size_id      UUID DEFAULT NULL,
  input_topping_ids  UUID[] DEFAULT '{}'
)
RETURNS TABLE(
  order_item_id UUID,
  success       BOOLEAN,
  message       TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION add_item_to_order(uuid, uuid, int, text, uuid, uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION add_item_to_order(uuid, uuid, int, text, uuid, uuid[]) TO authenticated;

-- Function to update order item status (for kitchen staff)
CREATE OR REPLACE FUNCTION update_order_item_status(
  input_order_item_id UUID,
  input_restaurant_id UUID,
  input_status        TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate status
  IF input_status NOT IN ('new','preparing','ready','served','cancelled') THEN
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_order_item_status(uuid, uuid, text) TO authenticated;

-- ================================================
-- UTILITY FUNCTIONS
-- ================================================

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(order_id_param UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_amount NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(price_at_order * quantity), 0)
  INTO total_amount
  FROM order_items
  WHERE order_id = order_id_param
    AND status != 'cancelled';

  RETURN total_amount;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_order_total(uuid) TO authenticated;

-- Function to update order total automatically
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update order totals
CREATE TRIGGER trg_update_order_total
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_total();

-- ================================================
-- ANALYTICS FUNCTIONS
-- ================================================

-- Function to get daily sales analytics
CREATE OR REPLACE FUNCTION get_daily_sales_analytics(
  p_restaurant_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  date DATE,
  total_orders BIGINT,
  total_revenue NUMERIC,
  average_order_value NUMERIC,
  top_selling_item_id UUID,
  top_selling_item_name TEXT,
  top_selling_item_quantity BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      AND oi.status != 'cancelled'
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_sales_analytics(uuid, date) TO authenticated;
