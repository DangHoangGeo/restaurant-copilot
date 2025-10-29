-- Migration: Tenant Usage Snapshots
-- Description: Creates tenant_usage_snapshots table for tracking resource usage over time
-- Phase: 0 - Foundations

-- Create tenant_usage_snapshots table
CREATE TABLE IF NOT EXISTS tenant_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Order metrics
  total_orders INTEGER DEFAULT 0,
  total_order_items INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,

  -- Staff metrics
  active_staff_count INTEGER DEFAULT 0,
  total_staff_hours DECIMAL(10, 2) DEFAULT 0,

  -- Storage metrics
  storage_used_mb BIGINT DEFAULT 0,
  image_count INTEGER DEFAULT 0,

  -- AI metrics
  ai_calls_count INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,

  -- API metrics
  api_calls_count INTEGER DEFAULT 0,
  api_errors_count INTEGER DEFAULT 0,

  -- System metrics
  realtime_connections_peak INTEGER DEFAULT 0,
  print_jobs_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(restaurant_id, snapshot_date)
);

-- Create indexes
CREATE INDEX idx_tenant_usage_snapshots_restaurant_date ON tenant_usage_snapshots(restaurant_id, snapshot_date DESC);
CREATE INDEX idx_tenant_usage_snapshots_date ON tenant_usage_snapshots(snapshot_date DESC);

-- Enable RLS
ALTER TABLE tenant_usage_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Restaurants can read their own usage
CREATE POLICY tenant_usage_snapshots_restaurant_read ON tenant_usage_snapshots
  FOR SELECT
  USING (restaurant_id = (auth.jwt()->>'restaurant_id')::UUID);

-- RLS Policy: Platform admins can read all usage
CREATE POLICY tenant_usage_snapshots_platform_admin_all ON tenant_usage_snapshots
  FOR ALL
  USING (is_platform_admin());

-- Function to calculate daily usage snapshot
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
BEGIN
  -- Calculate order metrics
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
  AND DATE(o.created_at) = target_date;

  -- Calculate staff metrics
  SELECT
    COUNT(DISTINCT u.id),
    COALESCE(SUM(EXTRACT(EPOCH FROM (ea.check_out_time - ea.check_in_time)) / 3600.0), 0)
  INTO
    v_active_staff_count,
    v_total_staff_hours
  FROM users u
  LEFT JOIN employee_attendance ea ON ea.user_id = u.id AND DATE(ea.check_in_time) = target_date
  WHERE u.restaurant_id = rest_id
  AND u.role IN ('staff', 'manager', 'owner');

  -- Calculate AI metrics (from logs table if available)
  SELECT COUNT(*)
  INTO v_ai_calls_count
  FROM logs
  WHERE restaurant_id = rest_id
  AND DATE(created_at) = target_date
  AND (
    endpoint LIKE '%/api/v1/ai/%'
    OR message LIKE '%AI%'
    OR message LIKE '%Gemini%'
  );

  -- Calculate print jobs (estimate from order items)
  v_print_jobs_count := COALESCE(v_total_orders, 0);

  -- Insert or update snapshot
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

-- Function to calculate usage snapshots for all restaurants
CREATE OR REPLACE FUNCTION calculate_all_usage_snapshots(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  restaurant_record RECORD;
  processed_count INTEGER := 0;
BEGIN
  FOR restaurant_record IN
    SELECT id FROM restaurants WHERE is_active = true
  LOOP
    PERFORM calculate_daily_usage_snapshot(restaurant_record.id, target_date);
    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get usage trends
CREATE OR REPLACE FUNCTION get_usage_trends(
  rest_id UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  snapshot_date DATE,
  total_orders INTEGER,
  total_revenue DECIMAL,
  unique_customers INTEGER,
  ai_calls_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tus.snapshot_date,
    tus.total_orders,
    tus.total_revenue,
    tus.unique_customers,
    tus.ai_calls_count
  FROM tenant_usage_snapshots tus
  WHERE tus.restaurant_id = rest_id
  AND tus.snapshot_date >= CURRENT_DATE - days_back
  ORDER BY tus.snapshot_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get aggregated platform usage
CREATE OR REPLACE FUNCTION get_platform_usage_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_restaurants BIGINT,
  total_orders BIGINT,
  total_revenue DECIMAL,
  total_customers BIGINT,
  total_ai_calls BIGINT,
  avg_orders_per_restaurant NUMERIC,
  avg_revenue_per_restaurant NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT tus.restaurant_id),
    SUM(tus.total_orders),
    SUM(tus.total_revenue),
    SUM(tus.unique_customers),
    SUM(tus.ai_calls_count),
    AVG(tus.total_orders),
    AVG(tus.total_revenue)
  FROM tenant_usage_snapshots tus
  WHERE tus.snapshot_date = target_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE tenant_usage_snapshots IS 'Daily snapshots of resource usage per restaurant tenant';
COMMENT ON FUNCTION calculate_daily_usage_snapshot IS 'Calculate and store daily usage snapshot for a restaurant';
COMMENT ON FUNCTION calculate_all_usage_snapshots IS 'Calculate usage snapshots for all active restaurants';
COMMENT ON FUNCTION get_usage_trends IS 'Get usage trends for a restaurant over time';
COMMENT ON FUNCTION get_platform_usage_summary IS 'Get aggregated platform-wide usage summary';
