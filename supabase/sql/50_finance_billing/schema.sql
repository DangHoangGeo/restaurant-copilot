-- 50_finance_billing/schema.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '50_finance_billing/schema.sql'

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    receipt_url text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.monthly_finance_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    year smallint NOT NULL,
    month smallint NOT NULL,
    revenue_total numeric(14,2) DEFAULT 0 NOT NULL,
    order_count integer DEFAULT 0 NOT NULL,
    discount_total numeric(14,2) DEFAULT 0 NOT NULL,
    approved_labor_hours numeric(10,2) DEFAULT 0 NOT NULL,
    labor_entry_count integer DEFAULT 0 NOT NULL,
    purchasing_total numeric(14,2) DEFAULT 0 NOT NULL,
    expense_total numeric(14,2) DEFAULT 0 NOT NULL,
    combined_cost_total numeric(14,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    snapshot_status text DEFAULT 'draft'::text NOT NULL,
    closed_at timestamp with time zone,
    closed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gross_profit_estimate numeric(14,2) GENERATED ALWAYS AS (((revenue_total - discount_total) - combined_cost_total)) STORED,
    CONSTRAINT monthly_finance_snapshots_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT monthly_finance_snapshots_snapshot_status_check CHECK ((snapshot_status = ANY (ARRAY['draft'::text, 'closed'::text]))),
    CONSTRAINT monthly_finance_snapshots_year_check CHECK (((year >= 2020) AND (year <= 2100)))
);

CREATE TABLE public.organization_finance_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    category text DEFAULT 'miscellaneous'::text NOT NULL,
    description text NOT NULL,
    vendor_name text,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    receipt_url text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_finance_expenses_amount_check CHECK ((amount >= (0)::numeric))
);

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    restaurant_id uuid NOT NULL,
    name text NOT NULL,
    quantity numeric(10,3) DEFAULT 1 NOT NULL,
    unit text,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    line_total numeric(12,2) GENERATED ALWAYS AS ((quantity * unit_price)) STORED,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    supplier_id uuid,
    supplier_name text,
    category text DEFAULT 'general'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    received_date date,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    tax_amount numeric(12,2),
    notes text,
    receipt_url text,
    is_paid boolean DEFAULT false NOT NULL,
    paid_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.subscription_plans (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    price_monthly numeric(10,2) NOT NULL,
    price_yearly numeric(10,2) NOT NULL,
    max_customers_per_day integer,
    max_staff_seats integer DEFAULT 10,
    max_storage_gb integer DEFAULT 10,
    max_ai_calls_per_month integer DEFAULT 1000,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_highlighted boolean DEFAULT false,
    is_popular boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans with pricing and resource quotas';

CREATE TABLE public.subscription_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    organization_id uuid,
    restaurant_id uuid NOT NULL,
    receipt_number text NOT NULL,
    plan_id text NOT NULL,
    billing_cycle text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    status text DEFAULT 'issued'::text NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscription_receipts_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text]))),
    CONSTRAINT subscription_receipts_status_check CHECK ((status = ANY (ARRAY['issued'::text, 'paid'::text, 'void'::text])))
);

COMMENT ON TABLE public.subscription_receipts IS 'Issued billing receipts for tenant subscription periods.';

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    contact_name text,
    contact_phone text,
    contact_email text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    plan_id text NOT NULL,
    status text NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    trial_starts_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    billing_provider text,
    external_subscription_id text,
    payment_method_type text,
    payment_method_last4 text,
    seat_limit integer,
    storage_limit_gb integer,
    ai_calls_limit integer,
    customers_per_day_limit integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone,
    canceled_at timestamp with time zone,
    cancellation_reason text,
    canceled_by uuid,
    notes text,
    CONSTRAINT tenant_subscriptions_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text]))),
    CONSTRAINT tenant_subscriptions_billing_provider_check CHECK ((billing_provider = ANY (ARRAY['stripe'::text, 'manual'::text, 'none'::text]))),
    CONSTRAINT tenant_subscriptions_status_check CHECK ((status = ANY (ARRAY['trial'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'paused'::text, 'expired'::text])))
);

COMMENT ON TABLE public.tenant_subscriptions IS 'Subscription status and billing information for each restaurant tenant';
