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
