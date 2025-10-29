-- Migration: Extend Restaurants Table
-- Description: Adds verification and suspension fields to restaurants table
-- Phase: 0 - Foundations

-- Add verification fields
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES platform_admins(id),
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add suspension fields
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES platform_admins(id),
  ADD COLUMN IF NOT EXISTS suspend_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspend_notes TEXT;

-- Add platform admin notes
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS platform_notes TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_verified_at ON restaurants(verified_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_verified ON restaurants(is_verified) WHERE is_verified = false;
CREATE INDEX IF NOT EXISTS idx_restaurants_suspended ON restaurants(suspended_at) WHERE suspended_at IS NOT NULL;

-- Update is_verified flag when verified_at is set (for backwards compatibility)
CREATE OR REPLACE FUNCTION sync_restaurant_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- If verified_at is set and is_verified is false, update it
  IF NEW.verified_at IS NOT NULL AND NEW.is_verified = false THEN
    NEW.is_verified = true;
  END IF;

  -- If verified_at is null and is_verified is true, clear it
  IF NEW.verified_at IS NULL AND NEW.is_verified = true THEN
    NEW.is_verified = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_restaurant_verification_trigger
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION sync_restaurant_verification();

-- Helper function to verify a restaurant
CREATE OR REPLACE FUNCTION verify_restaurant(
  rest_id UUID,
  admin_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can verify restaurants';
  END IF;

  -- Get the user_id from platform_admins
  SELECT user_id INTO admin_user_id
  FROM platform_admins
  WHERE id = admin_id;

  -- Update restaurant
  UPDATE restaurants
  SET
    is_verified = true,
    verified_at = NOW(),
    verified_by = admin_id,
    verification_notes = notes
  WHERE id = rest_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to suspend a restaurant
CREATE OR REPLACE FUNCTION suspend_restaurant(
  rest_id UUID,
  admin_id UUID,
  reason TEXT,
  notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can suspend restaurants';
  END IF;

  -- Update restaurant
  UPDATE restaurants
  SET
    is_active = false,
    suspended_at = NOW(),
    suspended_by = admin_id,
    suspend_reason = reason,
    suspend_notes = notes
  WHERE id = rest_id;

  -- Update subscription status
  UPDATE tenant_subscriptions
  SET status = 'paused'
  WHERE restaurant_id = rest_id
  AND status IN ('trial', 'active');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to unsuspend a restaurant
CREATE OR REPLACE FUNCTION unsuspend_restaurant(rest_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can unsuspend restaurants';
  END IF;

  -- Update restaurant
  UPDATE restaurants
  SET
    is_active = true,
    suspended_at = NULL,
    suspended_by = NULL,
    suspend_reason = NULL,
    suspend_notes = NULL
  WHERE id = rest_id;

  -- Restore subscription status
  UPDATE tenant_subscriptions
  SET status = CASE
    WHEN trial_ends_at > NOW() THEN 'trial'
    WHEN current_period_end > NOW() THEN 'active'
    ELSE 'expired'
  END
  WHERE restaurant_id = rest_id
  AND status = 'paused';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN restaurants.verified_at IS 'Timestamp when restaurant was verified by platform admin';
COMMENT ON COLUMN restaurants.verified_by IS 'Platform admin who verified the restaurant';
COMMENT ON COLUMN restaurants.suspended_at IS 'Timestamp when restaurant was suspended';
COMMENT ON COLUMN restaurants.suspended_by IS 'Platform admin who suspended the restaurant';
COMMENT ON COLUMN restaurants.suspend_reason IS 'Reason for suspension';
COMMENT ON COLUMN restaurants.platform_notes IS 'Internal notes from platform admins';
COMMENT ON FUNCTION verify_restaurant IS 'Verify a restaurant (platform admin only)';
COMMENT ON FUNCTION suspend_restaurant IS 'Suspend a restaurant (platform admin only)';
COMMENT ON FUNCTION unsuspend_restaurant IS 'Unsuspend a restaurant (platform admin only)';
