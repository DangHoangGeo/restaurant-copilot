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
