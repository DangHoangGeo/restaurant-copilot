-- Migration: 044_phase0_foundation_hardening
-- Purpose:
--   1. Fix tenant usage snapshots to bucket by each branch's local day instead of UTC.
--   2. Keep Japan-first behavior by defaulting to Asia/Tokyo when a branch timezone is missing.

CREATE OR REPLACE FUNCTION calculate_daily_usage_snapshot(
  rest_id UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
  v_total_orders INTEGER;
  v_total_order_items INTEGER;
  v_total_revenue DECIMAL(10, 2);
  v_unique_customers INTEGER;
  v_active_staff_count INTEGER;
  v_total_staff_hours DECIMAL(10, 2);
  v_ai_calls_count INTEGER;
  v_print_jobs_count INTEGER;
  v_timezone TEXT := 'Asia/Tokyo';
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
BEGIN
  SELECT COALESCE(timezone, 'Asia/Tokyo')
  INTO v_timezone
  FROM restaurants
  WHERE id = rest_id;

  v_day_start := (target_date::timestamp AT TIME ZONE v_timezone);
  v_day_end := ((target_date + INTERVAL '1 day')::timestamp AT TIME ZONE v_timezone);

  SELECT
    COUNT(DISTINCT o.id),
    COUNT(oi.id),
    COALESCE(SUM(oi.price * oi.quantity), 0),
    COUNT(DISTINCT o.session_id)
  INTO
    v_total_orders,
    v_total_order_items,
    v_total_revenue,
    v_unique_customers
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.restaurant_id = rest_id
    AND o.created_at >= v_day_start
    AND o.created_at < v_day_end;

  SELECT
    COUNT(DISTINCT u.id),
    COALESCE(SUM(EXTRACT(EPOCH FROM (ea.check_out_time - ea.check_in_time)) / 3600.0), 0)
  INTO
    v_active_staff_count,
    v_total_staff_hours
  FROM users u
  LEFT JOIN employee_attendance ea
    ON ea.user_id = u.id
   AND ea.check_in_time >= v_day_start
   AND ea.check_in_time < v_day_end
  WHERE u.restaurant_id = rest_id
    AND u.role IN ('staff', 'manager', 'owner');

  SELECT COUNT(*)
  INTO v_ai_calls_count
  FROM logs
  WHERE restaurant_id = rest_id
    AND created_at >= v_day_start
    AND created_at < v_day_end
    AND (
      endpoint LIKE '%/api/v1/ai/%'
      OR message LIKE '%AI%'
      OR message LIKE '%Gemini%'
    );

  v_print_jobs_count := COALESCE(v_total_orders, 0);

  INSERT INTO tenant_usage_snapshots (
    restaurant_id,
    snapshot_date,
    total_orders,
    total_order_items,
    total_revenue,
    unique_customers,
    active_staff_count,
    total_staff_hours,
    ai_calls_count,
    print_jobs_count
  ) VALUES (
    rest_id,
    target_date,
    v_total_orders,
    v_total_order_items,
    v_total_revenue,
    v_unique_customers,
    v_active_staff_count,
    v_total_staff_hours,
    v_ai_calls_count,
    v_print_jobs_count
  )
  ON CONFLICT (restaurant_id, snapshot_date)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_order_items = EXCLUDED.total_order_items,
    total_revenue = EXCLUDED.total_revenue,
    unique_customers = EXCLUDED.unique_customers,
    active_staff_count = EXCLUDED.active_staff_count,
    total_staff_hours = EXCLUDED.total_staff_hours,
    ai_calls_count = EXCLUDED.ai_calls_count,
    print_jobs_count = EXCLUDED.print_jobs_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
