CREATE OR REPLACE FUNCTION get_table_session_by_code(
  input_code text,
  input_restaurant_id uuid
)
RETURNS TABLE (
  table_id uuid,
  restaurant_id uuid,
  active_session_id uuid,
  require_passcode boolean
) AS $$
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
      AND orders.status IN ('new', 'preparing', 'ready')
    ORDER BY created_at DESC
    LIMIT 1
  ) o ON true
  WHERE t.qr_code = input_code
    AND t.restaurant_id = input_restaurant_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;



--

CREATE OR REPLACE FUNCTION get_order_session_info(
  p_session_id   UUID,
  p_restaurant_id UUID
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'table_id',      o.table_id,
    'table_name',    t.name,
    'session_id',    o.session_id,
    'guest_count',   o.guest_count,
    'status',       o.status,
    'total_amount',  COALESCE(o.total_amount, 0),
    'created_at',    o.created_at,
    'items', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'menu_item_id', oi.menu_item_id,
          'name_en',     mi.name_en,
          'name_ja',     mi.name_ja,
          'name_vi',     mi.name_vi,
          'quantity',   oi.quantity,
          'notes',      oi.notes,
          'status', oi.status,
          'unit_price',  mi.price,
          'total',  oi.quantity * mi.price
        )
      )
      FROM order_items oi
      JOIN menu_items mi
        ON oi.menu_item_id = mi.id
      WHERE oi.order_id = o.id
    )
  ) 
  INTO result
  FROM orders o
  JOIN tables t
    ON o.table_id = t.id
  WHERE o.session_id    = p_session_id
    AND o.restaurant_id = p_restaurant_id
  LIMIT 1;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Order session not found';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;