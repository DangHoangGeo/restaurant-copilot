-- Migration: Platform Admin RLS Policies
-- Description: Creates RLS policies to allow platform admins cross-tenant read access
-- Phase: 0 - Foundations

-- ============================================
-- RESTAURANTS TABLE - Platform Admin Access
-- ============================================

-- Platform admins can read all restaurants
CREATE POLICY restaurants_platform_admin_read ON restaurants
  FOR SELECT
  USING (is_platform_admin());

-- Platform admins can update restaurants (for verification, suspension)
CREATE POLICY restaurants_platform_admin_update ON restaurants
  FOR UPDATE
  USING (is_platform_admin());

-- ============================================
-- USERS TABLE - Platform Admin Access
-- ============================================

-- Platform admins can read all users across tenants
CREATE POLICY users_platform_admin_read ON users
  FOR SELECT
  USING (is_platform_admin());

-- ============================================
-- ORDERS TABLE - Platform Admin Access
-- ============================================

-- Platform admins can read all orders
CREATE POLICY orders_platform_admin_read ON orders
  FOR SELECT
  USING (is_platform_admin());

-- ============================================
-- ORDER_ITEMS TABLE - Platform Admin Access
-- ============================================

-- Platform admins can read all order items
CREATE POLICY order_items_platform_admin_read ON order_items
  FOR SELECT
  USING (is_platform_admin());

-- ============================================
-- MENU_ITEMS TABLE - Platform Admin Access
-- ============================================

-- Platform admins can read all menu items
CREATE POLICY menu_items_platform_admin_read ON menu_items
  FOR SELECT
  USING (is_platform_admin());

-- ============================================
-- CATEGORIES TABLE - Platform Admin Access
-- ============================================

-- Platform admins can read all categories
CREATE POLICY categories_platform_admin_read ON categories
  FOR SELECT
  USING (is_platform_admin());

-- ============================================
-- SESSIONS TABLE - Platform Admin Access
-- ============================================

-- Platform admins can read all customer sessions
CREATE POLICY sessions_platform_admin_read ON sessions
  FOR SELECT
  USING (is_platform_admin());

-- ============================================
-- LOGS TABLE - Platform Admin Access
-- ============================================

-- Platform admins can read all logs
CREATE POLICY logs_platform_admin_read ON logs
  FOR SELECT
  USING (is_platform_admin());

-- ============================================
-- EMPLOYEE_ATTENDANCE TABLE - Platform Admin Access
-- ============================================

-- Platform admins can read all employee attendance records
CREATE POLICY employee_attendance_platform_admin_read ON employee_attendance
  FOR SELECT
  USING (is_platform_admin());

-- ============================================
-- FEEDBACK TABLE - Platform Admin Access (if exists)
-- ============================================

-- Check if feedback table exists and add policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
    EXECUTE 'CREATE POLICY feedback_platform_admin_read ON feedback
      FOR SELECT
      USING (is_platform_admin())';
  END IF;
END $$;

-- ============================================
-- RESTAURANT_SETTINGS TABLE - Platform Admin Access (if exists)
-- ============================================

-- Check if restaurant_settings table exists and add policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurant_settings') THEN
    EXECUTE 'CREATE POLICY restaurant_settings_platform_admin_read ON restaurant_settings
      FOR SELECT
      USING (is_platform_admin())';
  END IF;
END $$;

-- ============================================
-- PLATFORM AUDIT LOG
-- ============================================

-- Create platform_audit_logs table for tracking all platform admin actions
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES platform_admins(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  restaurant_id UUID REFERENCES restaurants(id),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_platform_audit_logs_admin_id ON platform_audit_logs(admin_id, created_at DESC);
CREATE INDEX idx_platform_audit_logs_resource ON platform_audit_logs(resource_type, resource_id);
CREATE INDEX idx_platform_audit_logs_restaurant_id ON platform_audit_logs(restaurant_id, created_at DESC);
CREATE INDEX idx_platform_audit_logs_action ON platform_audit_logs(action);
CREATE INDEX idx_platform_audit_logs_created_at ON platform_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read audit logs
CREATE POLICY platform_audit_logs_read ON platform_audit_logs
  FOR SELECT
  USING (is_platform_admin());

-- Only platform admins can insert audit logs (system will insert automatically)
CREATE POLICY platform_audit_logs_insert ON platform_audit_logs
  FOR INSERT
  WITH CHECK (is_platform_admin());

-- Function to log platform admin actions
CREATE OR REPLACE FUNCTION log_platform_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_restaurant_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_admin_id UUID;
  v_log_id UUID;
BEGIN
  -- Get the platform admin ID for current user
  SELECT id INTO v_admin_id
  FROM platform_admins
  WHERE user_id = auth.uid()
  AND is_active = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not a platform admin';
  END IF;

  -- Insert audit log
  INSERT INTO platform_audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    restaurant_id,
    changes
  ) VALUES (
    v_admin_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_restaurant_id,
    p_changes
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE platform_audit_logs IS 'Audit trail of all platform administrator actions';
COMMENT ON FUNCTION log_platform_action IS 'Log a platform admin action to the audit trail';

-- ============================================
-- HELPFUL PLATFORM ADMIN FUNCTIONS
-- ============================================

-- Function to get restaurant summary for platform admins
CREATE OR REPLACE FUNCTION get_platform_restaurant_summary(rest_id UUID)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  subdomain TEXT,
  owner_email TEXT,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  subscription_plan TEXT,
  subscription_status TEXT,
  trial_ends_at TIMESTAMPTZ,
  total_staff INTEGER,
  total_orders_30d BIGINT,
  total_revenue_30d DECIMAL,
  last_order_at TIMESTAMPTZ,
  support_tickets_open INTEGER
) AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.subdomain,
    r.email,
    r.is_active,
    r.is_verified,
    r.verified_at,
    r.created_at,
    ts.plan_id,
    ts.status,
    ts.trial_ends_at,
    (SELECT COUNT(*)::INTEGER FROM users WHERE restaurant_id = r.id),
    (SELECT COUNT(*) FROM tenant_usage_snapshots tus
     WHERE tus.restaurant_id = r.id
     AND tus.snapshot_date >= CURRENT_DATE - 30),
    (SELECT SUM(total_revenue) FROM tenant_usage_snapshots tus
     WHERE tus.restaurant_id = r.id
     AND tus.snapshot_date >= CURRENT_DATE - 30),
    (SELECT MAX(created_at) FROM orders WHERE restaurant_id = r.id),
    (SELECT COUNT(*)::INTEGER FROM support_tickets st
     WHERE st.restaurant_id = r.id
     AND st.status NOT IN ('resolved', 'closed'))
  FROM restaurants r
  LEFT JOIN tenant_subscriptions ts ON ts.restaurant_id = r.id
  WHERE r.id = rest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_platform_restaurant_summary IS 'Get comprehensive summary of a restaurant for platform admins';
