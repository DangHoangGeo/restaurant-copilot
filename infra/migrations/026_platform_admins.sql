-- Migration: Platform Admins
-- Description: Creates platform_admins table for super-admin role management
-- Phase: 0 - Foundations

-- Create platform_admins table
CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB DEFAULT '{"restaurants": ["read", "verify", "suspend"], "subscriptions": ["read", "update"], "support": ["read", "write"], "logs": ["read"], "users": ["read"]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Create index for active platform admins lookup
CREATE INDEX idx_platform_admins_user_id ON platform_admins(user_id) WHERE is_active = true;
CREATE INDEX idx_platform_admins_email ON platform_admins(email) WHERE is_active = true;

-- Enable RLS
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Platform admins can read all platform admin records
CREATE POLICY platform_admins_read_policy ON platform_admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.user_id = auth.uid()
      AND pa.is_active = true
    )
  );

-- RLS Policy: Platform admins can insert new platform admins
CREATE POLICY platform_admins_insert_policy ON platform_admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.user_id = auth.uid()
      AND pa.is_active = true
    )
  );

-- RLS Policy: Platform admins can update platform admin records
CREATE POLICY platform_admins_update_policy ON platform_admins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.user_id = auth.uid()
      AND pa.is_active = true
    )
  );

-- Create helper function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = check_user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get platform admin permissions
CREATE OR REPLACE FUNCTION get_platform_admin_permissions(check_user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
  admin_permissions JSONB;
BEGIN
  SELECT permissions INTO admin_permissions
  FROM platform_admins
  WHERE user_id = check_user_id
  AND is_active = true;

  RETURN COALESCE(admin_permissions, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE platform_admins IS 'Platform-level administrators with cross-tenant access';
COMMENT ON FUNCTION is_platform_admin IS 'Check if a user is an active platform administrator';
COMMENT ON FUNCTION get_platform_admin_permissions IS 'Get permissions for a platform administrator';
