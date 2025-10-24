-- Migration: Tenant Subscriptions
-- Description: Creates tenant_subscriptions table to track restaurant subscription status
-- Phase: 0 - Foundations

-- Create tenant_subscriptions table
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'paused', 'expired')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',

  -- Trial management
  trial_starts_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,

  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Payment integration
  billing_provider TEXT CHECK (billing_provider IN ('stripe', 'manual', 'none')),
  external_subscription_id TEXT,
  payment_method_type TEXT,
  payment_method_last4 TEXT,

  -- Resource quotas (cached from plan for performance)
  seat_limit INTEGER,
  storage_limit_gb INTEGER,
  ai_calls_limit INTEGER,
  customers_per_day_limit INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  canceled_by UUID REFERENCES auth.users(id),
  notes TEXT,

  UNIQUE(restaurant_id)
);

-- Create indexes
CREATE INDEX idx_tenant_subscriptions_restaurant_id ON tenant_subscriptions(restaurant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_trial_ends_at ON tenant_subscriptions(trial_ends_at) WHERE status = 'trial';
CREATE INDEX idx_tenant_subscriptions_period_end ON tenant_subscriptions(current_period_end);
CREATE INDEX idx_tenant_subscriptions_external_id ON tenant_subscriptions(external_subscription_id) WHERE external_subscription_id IS NOT NULL;

-- Enable RLS
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Restaurants can read their own subscription
CREATE POLICY tenant_subscriptions_restaurant_read ON tenant_subscriptions
  FOR SELECT
  USING (restaurant_id = (auth.jwt()->>'restaurant_id')::UUID);

-- RLS Policy: Platform admins can read all subscriptions
CREATE POLICY tenant_subscriptions_platform_admin_read ON tenant_subscriptions
  FOR SELECT
  USING (is_platform_admin());

-- RLS Policy: Platform admins can update subscriptions
CREATE POLICY tenant_subscriptions_platform_admin_update ON tenant_subscriptions
  FOR UPDATE
  USING (is_platform_admin());

-- RLS Policy: Platform admins can insert subscriptions
CREATE POLICY tenant_subscriptions_platform_admin_insert ON tenant_subscriptions
  FOR INSERT
  WITH CHECK (is_platform_admin());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tenant_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_subscriptions_updated_at();

-- Helper function to get subscription status for a restaurant
CREATE OR REPLACE FUNCTION get_restaurant_subscription_status(rest_id UUID)
RETURNS TABLE (
  plan_id TEXT,
  status TEXT,
  is_trial BOOLEAN,
  trial_days_remaining INTEGER,
  period_ends_at TIMESTAMPTZ,
  days_until_renewal INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.plan_id,
    ts.status,
    (ts.status = 'trial') as is_trial,
    CASE
      WHEN ts.status = 'trial' AND ts.trial_ends_at IS NOT NULL
      THEN GREATEST(0, EXTRACT(DAY FROM (ts.trial_ends_at - NOW()))::INTEGER)
      ELSE NULL
    END as trial_days_remaining,
    ts.current_period_end as period_ends_at,
    GREATEST(0, EXTRACT(DAY FROM (ts.current_period_end - NOW()))::INTEGER) as days_until_renewal
  FROM tenant_subscriptions ts
  WHERE ts.restaurant_id = rest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if restaurant is within quota
CREATE OR REPLACE FUNCTION check_restaurant_quota(
  rest_id UUID,
  quota_type TEXT,
  current_usage INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  quota_limit INTEGER;
BEGIN
  SELECT
    CASE quota_type
      WHEN 'seats' THEN seat_limit
      WHEN 'storage_gb' THEN storage_limit_gb
      WHEN 'ai_calls' THEN ai_calls_limit
      WHEN 'customers_per_day' THEN customers_per_day_limit
      ELSE NULL
    END
  INTO quota_limit
  FROM tenant_subscriptions
  WHERE restaurant_id = rest_id;

  -- NULL limit means unlimited
  IF quota_limit IS NULL THEN
    RETURN true;
  END IF;

  RETURN current_usage < quota_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE tenant_subscriptions IS 'Subscription status and billing information for each restaurant tenant';
COMMENT ON FUNCTION get_restaurant_subscription_status IS 'Get detailed subscription status for a restaurant';
COMMENT ON FUNCTION check_restaurant_quota IS 'Check if restaurant is within quota limits for a specific resource';
