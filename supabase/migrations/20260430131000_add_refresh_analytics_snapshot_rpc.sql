-- Phase 2.2: bounded daily analytics snapshot refresh.

CREATE OR REPLACE FUNCTION public.refresh_analytics_snapshot(p_restaurant_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS public.analytics_snapshots
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  branch_timezone text;
  period_start timestamptz;
  period_end timestamptz;
  total_sales_value numeric := 0;
  orders_count_value integer := 0;
  top_seller_value uuid;
  snapshot_row public.analytics_snapshots;
BEGIN
  IF NOT public.is_service_role() AND NOT public.can_access_restaurant_context(p_restaurant_id) THEN
    RAISE EXCEPTION 'Not authorized to refresh analytics snapshot for restaurant %', p_restaurant_id
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(timezone, 'Asia/Tokyo')
  INTO branch_timezone
  FROM public.restaurants
  WHERE id = p_restaurant_id;

  IF branch_timezone IS NULL THEN
    RAISE EXCEPTION 'Restaurant % was not found', p_restaurant_id
      USING ERRCODE = '22023';
  END IF;

  period_start := p_date::timestamp AT TIME ZONE branch_timezone;
  period_end := (p_date + 1)::timestamp AT TIME ZONE branch_timezone;

  SELECT
    COALESCE(SUM(o.total_amount), 0),
    COUNT(*)::integer
  INTO total_sales_value, orders_count_value
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.status = 'completed'
    AND o.created_at >= period_start
    AND o.created_at < period_end;

  SELECT oi.menu_item_id
  INTO top_seller_value
  FROM public.order_items oi
  JOIN public.orders o
    ON o.id = oi.order_id
   AND o.created_at = oi.order_created_at
  WHERE oi.restaurant_id = p_restaurant_id
    AND oi.status != 'canceled'
    AND o.status = 'completed'
    AND o.created_at >= period_start
    AND o.created_at < period_end
  GROUP BY oi.menu_item_id
  ORDER BY SUM(oi.quantity) DESC, SUM(oi.quantity * oi.price_at_order) DESC
  LIMIT 1;

  INSERT INTO public.analytics_snapshots (
    restaurant_id,
    date,
    total_sales,
    top_seller_item,
    orders_count,
    updated_at
  ) VALUES (
    p_restaurant_id,
    p_date,
    total_sales_value,
    top_seller_value,
    orders_count_value,
    now()
  )
  ON CONFLICT (restaurant_id, date)
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    top_seller_item = EXCLUDED.top_seller_item,
    orders_count = EXCLUDED.orders_count,
    updated_at = now()
  RETURNING *
  INTO snapshot_row;

  RETURN snapshot_row;
END;
$function$;

COMMENT ON FUNCTION public.refresh_analytics_snapshot(uuid, date) IS 'Refreshes one restaurant-local daily analytics snapshot from completed orders.';

GRANT EXECUTE ON FUNCTION public.refresh_analytics_snapshot(uuid, date) TO authenticated, service_role;
