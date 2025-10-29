-- Migration: Subscription Plans
-- Description: Creates subscription_plans table and seeds with pricing data
-- Phase: 0 - Foundations

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  max_customers_per_day INTEGER,
  max_staff_seats INTEGER DEFAULT 10,
  max_storage_gb INTEGER DEFAULT 10,
  max_ai_calls_per_month INTEGER DEFAULT 1000,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_highlighted BOOLEAN DEFAULT false,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, sort_order);

-- Seed subscription plans from pricing.ts
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, max_customers_per_day, max_staff_seats, max_storage_gb, max_ai_calls_per_month, features, is_highlighted, is_popular, sort_order)
VALUES
  (
    'starter',
    'Starter Plan',
    'Perfect for small establishments serving up to 100 customers per day',
    15.00,
    180.00,
    100,
    5,
    5,
    500,
    '["basic_order_management", "ai_analytics_basic", "basic_customer_support"]'::jsonb,
    false,
    false,
    1
  ),
  (
    'growth',
    'Growth Plan',
    'Ideal for regular-sized establishments serving 100-500 customers per day',
    40.00,
    480.00,
    500,
    15,
    25,
    2000,
    '["advanced_order_management", "enhanced_ai_analytics", "priority_customer_support", "external_platform_integrations"]'::jsonb,
    true,
    true,
    2
  ),
  (
    'enterprise',
    'Enterprise Plan',
    'For business owners managing multiple locations',
    100.00,
    1200.00,
    NULL, -- Unlimited
    50,
    100,
    10000,
    '["full_feature_access", "comprehensive_ai_optimization", "dedicated_ai_support", "multi_location_management"]'::jsonb,
    false,
    false,
    3
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Add comment
COMMENT ON TABLE subscription_plans IS 'Available subscription plans with pricing and resource quotas';
