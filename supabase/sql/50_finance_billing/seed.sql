-- 50_finance_billing/seed.sql
-- Canonical seed data for billing plans required by tenant subscriptions.

\echo '50_finance_billing/seed.sql'

INSERT INTO public.subscription_plans (
    id,
    name,
    description,
    price_monthly,
    price_yearly,
    max_customers_per_day,
    max_staff_seats,
    max_storage_gb,
    max_ai_calls_per_month,
    features,
    is_active,
    is_highlighted,
    is_popular,
    sort_order
) VALUES
(
    'starter',
    'Starter Plan',
    'Perfect for small establishments serving up to 100 customers per day',
    15.00,
    180.00,
    100,
    10,
    10,
    1000,
    '["basic_order_management", "ai_analytics_basic", "basic_customer_support"]'::jsonb,
    true,
    false,
    false,
    10
),
(
    'growth',
    'Growth Plan',
    'Ideal for regular-sized establishments serving 100-500 customers per day',
    40.00,
    480.00,
    500,
    25,
    50,
    5000,
    '["advanced_order_management", "enhanced_ai_analytics", "priority_customer_support", "external_platform_integrations"]'::jsonb,
    true,
    true,
    true,
    20
),
(
    'enterprise',
    'Enterprise Plan',
    'For business owners managing multiple locations',
    100.00,
    1200.00,
    NULL,
    100,
    250,
    25000,
    '["full_feature_access", "comprehensive_ai_optimization", "dedicated_ai_support", "multi_location_management"]'::jsonb,
    true,
    false,
    false,
    30
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_customers_per_day = EXCLUDED.max_customers_per_day,
    max_staff_seats = EXCLUDED.max_staff_seats,
    max_storage_gb = EXCLUDED.max_storage_gb,
    max_ai_calls_per_month = EXCLUDED.max_ai_calls_per_month,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    is_highlighted = EXCLUDED.is_highlighted,
    is_popular = EXCLUDED.is_popular,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
