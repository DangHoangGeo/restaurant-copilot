-- Initial canonical foundation rollout for Supabase live environments.
-- Purpose: initialize a blank staging or production project with the current verified foundation.
-- Rollout assumptions: the target database is a fresh Supabase project with no prior app schema history.
-- Verification: CI replays this migration path on a blank local stack and runs public app smoke tests before deploy.

-- BEGIN supabase/sql/00_foundation/00_extensions.sql
-- Canonical extensions for a fresh Supabase project.
-- Keep this file idempotent so CI can safely re-apply it.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- END supabase/sql/00_foundation/00_extensions.sql

-- BEGIN supabase/sql/10_branch_core/schema.sql
-- 10_branch_core/schema.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TABLE public.orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    table_id uuid NOT NULL,
    session_id uuid NOT NULL,
    guest_count integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    total_amount numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_guest_count_check CHECK ((guest_count > 0)),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['new'::text, 'serving'::text, 'completed'::text, 'canceled'::text]))),
    CONSTRAINT orders_total_amount_check CHECK ((total_amount >= (0)::numeric))
);

CREATE TABLE public.analytics_snapshots (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    date date NOT NULL,
    total_sales numeric DEFAULT 0,
    top_seller_item uuid,
    orders_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.audit_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid,
    user_id uuid,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    changes jsonb NOT NULL,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.bookings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    table_id uuid NOT NULL,
    customer_name text NOT NULL,
    customer_contact text NOT NULL,
    booking_date date NOT NULL,
    booking_time time without time zone NOT NULL,
    party_size integer NOT NULL,
    preorder_items jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bookings_party_size_check CHECK ((party_size > 0)),
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'canceled'::text])))
);

CREATE TABLE public.categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    name_ja text NOT NULL,
    name_en text NOT NULL,
    name_vi text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    organization_menu_category_id uuid
);

COMMENT ON COLUMN public.categories.organization_menu_category_id IS 'When present, this branch category is inherited from an organization shared menu category.';

CREATE TABLE public.chat_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    user_id uuid,
    user_language text NOT NULL,
    prompt_text text NOT NULL,
    prompt_token_count integer,
    response_token_count integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_logs_user_language_check CHECK ((user_language = ANY (ARRAY['ja'::text, 'en'::text, 'vi'::text])))
);

CREATE TABLE public.employees (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp with time zone,
    deactivated_by uuid,
    CONSTRAINT employees_role_check CHECK ((role = ANY (ARRAY['chef'::text, 'server'::text, 'cashier'::text, 'manager'::text])))
);

CREATE TABLE public.feedback (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid,
    comments text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.inventory_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    menu_item_id uuid,
    stock_level integer DEFAULT 0,
    threshold integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_items_stock_level_check CHECK ((stock_level >= 0)),
    CONSTRAINT inventory_items_threshold_check CHECK ((threshold >= 0))
);

CREATE TABLE public.logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid,
    user_id uuid,
    level text,
    endpoint text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT logs_level_check CHECK ((level = ANY (ARRAY['INFO'::text, 'WARN'::text, 'ERROR'::text, 'DEBUG'::text])))
);

CREATE TABLE public.menu_item_sizes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    size_key text NOT NULL,
    name_ja text NOT NULL,
    name_en text NOT NULL,
    name_vi text NOT NULL,
    price numeric NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT menu_item_sizes_price_check CHECK ((price >= (0)::numeric))
);

CREATE TABLE public.menu_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    category_id uuid NOT NULL,
    name_ja text NOT NULL,
    name_en text NOT NULL,
    name_vi text NOT NULL,
    code text,
    description_ja text,
    description_en text,
    description_vi text,
    price numeric NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    image_url text,
    stock_level integer DEFAULT 0,
    available boolean DEFAULT true NOT NULL,
    weekday_visibility integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7] NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_signature boolean DEFAULT false NOT NULL,
    organization_menu_item_id uuid,
    CONSTRAINT menu_items_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT menu_items_stock_level_check CHECK ((stock_level >= 0))
);

COMMENT ON COLUMN public.menu_items.organization_menu_item_id IS 'When present, this branch menu item is inherited from an organization shared menu item.';

CREATE TABLE public.order_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    order_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    menu_item_size_id uuid,
    quantity integer NOT NULL,
    notes text,
    status text DEFAULT 'new'::text NOT NULL,
    topping_ids uuid[] DEFAULT '{}'::uuid[],
    price_at_order numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_status_check CHECK ((status = ANY (ARRAY['new'::text, 'preparing'::text, 'ready'::text, 'served'::text, 'canceled'::text])))
);

CREATE TABLE public.restaurants (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    subdomain text NOT NULL,
    default_language text NOT NULL,
    logo_url text,
    brand_color text,
    address text,
    phone text,
    email text,
    website text,
    description_en text,
    description_vi text,
    description_ja text,
    opening_hours jsonb,
    social_links jsonb,
    timezone text DEFAULT 'Asia/Tokyo'::text NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    payment_methods text[] DEFAULT '{}'::text[],
    delivery_options text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    tax numeric DEFAULT 0.10 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    wifi_ssid text,
    wifi_password text,
    onboarded boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    verified_by uuid,
    verification_notes text,
    suspended_at timestamp with time zone,
    suspended_by uuid,
    suspend_reason text,
    suspend_notes text,
    platform_notes text,
    owner_story_en text,
    owner_story_ja text,
    owner_story_vi text,
    tagline_en text,
    tagline_ja text,
    tagline_vi text,
    google_place_id text,
    google_rating numeric,
    google_review_count integer DEFAULT 0,
    secondary_color text,
    branch_code text,
    allow_order_notes boolean DEFAULT true NOT NULL,
    hero_title_en text,
    hero_title_ja text,
    hero_title_vi text,
    hero_subtitle_en text,
    hero_subtitle_ja text,
    hero_subtitle_vi text,
    owner_photo_url text,
    CONSTRAINT restaurants_default_language_check CHECK ((default_language = ANY (ARRAY['ja'::text, 'en'::text, 'vi'::text]))),
    CONSTRAINT restaurants_google_rating_check CHECK (((google_rating >= (0)::numeric) AND (google_rating <= (5)::numeric)))
);

COMMENT ON COLUMN public.restaurants.wifi_ssid IS 'WiFi network name (SSID) to display on printed table QR codes';

COMMENT ON COLUMN public.restaurants.wifi_password IS 'WiFi password to display on printed table QR codes';

COMMENT ON COLUMN public.restaurants.onboarded IS 'Flag indicating whether the restaurant owner has completed the onboarding flow';

COMMENT ON COLUMN public.restaurants.verified_at IS 'Timestamp when restaurant was verified by platform admin';

COMMENT ON COLUMN public.restaurants.verified_by IS 'Platform admin who verified the restaurant';

COMMENT ON COLUMN public.restaurants.suspended_at IS 'Timestamp when restaurant was suspended';

COMMENT ON COLUMN public.restaurants.suspended_by IS 'Platform admin who suspended the restaurant';

COMMENT ON COLUMN public.restaurants.suspend_reason IS 'Reason for suspension';

COMMENT ON COLUMN public.restaurants.platform_notes IS 'Internal notes from platform admins';

COMMENT ON COLUMN public.restaurants.branch_code IS 'Explicit public branch identifier used on company-host customer URLs and QR entry.';

COMMENT ON COLUMN public.restaurants.allow_order_notes IS 'When false, the special instructions / order notes field is hidden from customers on the item detail modal.';

CREATE TABLE public.reviews (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    user_id uuid,
    rating smallint NOT NULL,
    comment text,
    resolved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE public.schedules (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    weekday integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT schedules_weekday_check CHECK (((weekday >= 1) AND (weekday <= 7)))
);

CREATE TABLE public.tables (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    capacity integer NOT NULL,
    is_outdoor boolean DEFAULT false,
    is_accessible boolean DEFAULT false,
    notes text,
    qr_code text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    qr_code_created_at timestamp with time zone,
    CONSTRAINT tables_capacity_check CHECK ((capacity > 0)),
    CONSTRAINT tables_status_check CHECK ((status = ANY (ARRAY['available'::text, 'occupied'::text, 'reserved'::text])))
);

CREATE TABLE public.toppings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    name_ja text NOT NULL,
    name_en text NOT NULL,
    name_vi text NOT NULL,
    price numeric NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT toppings_price_check CHECK ((price >= (0)::numeric))
);

CREATE TABLE public.users (
    id uuid NOT NULL,
    restaurant_id uuid NOT NULL,
    email text NOT NULL,
    name text,
    role text NOT NULL,
    two_factor_secret text,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    photo_url text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'chef'::text, 'server'::text, 'cashier'::text, 'manager'::text])))
);
-- END supabase/sql/10_branch_core/schema.sql

-- BEGIN supabase/sql/30_founder_control/schema.sql
-- 30_founder_control/schema.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TABLE public.organization_member_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    member_id uuid NOT NULL,
    permission text NOT NULL,
    granted boolean DEFAULT true NOT NULL,
    granted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_member_permissions_permission_check CHECK ((permission = ANY (ARRAY['reports'::text, 'finance_exports'::text, 'purchases'::text, 'promotions'::text, 'employees'::text, 'attendance_approvals'::text, 'restaurant_settings'::text, 'organization_settings'::text, 'billing'::text])))
);

CREATE TABLE public.organization_member_shop_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    member_id uuid NOT NULL,
    restaurant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    shop_scope text DEFAULT 'all_shops'::text NOT NULL,
    invited_by uuid,
    joined_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_members_role_check CHECK ((role = ANY (ARRAY['founder_full_control'::text, 'founder_operations'::text, 'founder_finance'::text, 'accountant_readonly'::text, 'branch_general_manager'::text]))),
    CONSTRAINT organization_members_shop_scope_check CHECK ((shop_scope = ANY (ARRAY['all_shops'::text, 'selected_shops'::text])))
);

CREATE TABLE public.organization_menu_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name_en text NOT NULL,
    name_ja text,
    name_vi text,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.organization_menu_categories IS 'Organization-level shared menu categories for founder-owned reusable menu planning.';

CREATE TABLE public.organization_menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    category_id uuid NOT NULL,
    name_en text NOT NULL,
    name_ja text,
    name_vi text,
    description_en text,
    description_ja text,
    description_vi text,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    image_url text,
    available boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.organization_menu_items IS 'Organization-level shared menu items. Branch menus remain independent until copied or applied separately.';

CREATE TABLE public.organization_pending_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    invited_by uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    shop_scope text DEFAULT 'all_shops'::text NOT NULL,
    selected_restaurant_ids jsonb,
    invite_token text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    accepted_at timestamp with time zone,
    accepted_by_user_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_resent_at timestamp with time zone,
    resend_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT organization_pending_invites_role_check CHECK ((role = ANY (ARRAY['founder_full_control'::text, 'founder_operations'::text, 'founder_finance'::text, 'accountant_readonly'::text, 'branch_general_manager'::text]))),
    CONSTRAINT organization_pending_invites_shop_scope_check CHECK ((shop_scope = ANY (ARRAY['all_shops'::text, 'selected_shops'::text])))
);

COMMENT ON COLUMN public.organization_pending_invites.last_resent_at IS 'Timestamp of the most recent resend action (NULL if never resent)';

COMMENT ON COLUMN public.organization_pending_invites.resend_count IS 'Number of times this invite has been resent';

CREATE TABLE public.organization_restaurants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    restaurant_id uuid NOT NULL,
    added_by uuid,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.owner_organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    country text DEFAULT 'JP'::text NOT NULL,
    timezone text DEFAULT 'Asia/Tokyo'::text NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    brand_color text,
    description_en text,
    description_ja text,
    description_vi text,
    website text,
    phone text,
    email text,
    approval_status text DEFAULT 'pending'::text NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    approval_notes text,
    requested_plan text,
    onboarding_completed_at timestamp with time zone,
    address text,
    requested_billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    public_subdomain text,
    CONSTRAINT owner_organizations_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT owner_organizations_requested_billing_cycle_check CHECK ((requested_billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text])))
);

COMMENT ON COLUMN public.owner_organizations.logo_url IS 'Shared organization logo URL — used as the default for all branches.';

COMMENT ON COLUMN public.owner_organizations.brand_color IS 'Shared hex brand color (#RRGGBB) — branches may override at the branch level.';

COMMENT ON COLUMN public.owner_organizations.description_en IS 'English tagline / intro paragraph displayed on customer-facing pages.';

COMMENT ON COLUMN public.owner_organizations.description_ja IS 'Japanese tagline / intro paragraph displayed on customer-facing pages.';

COMMENT ON COLUMN public.owner_organizations.description_vi IS 'Vietnamese tagline / intro paragraph displayed on customer-facing pages.';

COMMENT ON COLUMN public.owner_organizations.approval_status IS 'Platform approval lifecycle for company signup. Control access is blocked until approved.';

COMMENT ON COLUMN public.owner_organizations.requested_plan IS 'Plan selected during initial signup before payment subscription is implemented.';

COMMENT ON COLUMN public.owner_organizations.onboarding_completed_at IS 'Timestamp marking completion of the first owner setup flow after approval.';

COMMENT ON COLUMN public.owner_organizations.address IS 'Primary company address used as the default contact/location baseline for new branches.';

COMMENT ON COLUMN public.owner_organizations.requested_billing_cycle IS 'Billing cycle selected during signup before the organization is approved.';

COMMENT ON COLUMN public.owner_organizations.public_subdomain IS 'Canonical public company host identifier used for customer entry and company-level routing.';
-- END supabase/sql/30_founder_control/schema.sql

-- BEGIN supabase/sql/50_finance_billing/schema.sql
-- 50_finance_billing/schema.sql
-- Canonical baseline generated from the verified local Supabase state.


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
-- END supabase/sql/50_finance_billing/schema.sql

-- BEGIN supabase/sql/40_people_attendance/schema.sql
-- 40_people_attendance/schema.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TABLE public.attendance_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    summary_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    action text NOT NULL,
    notes text,
    acted_by uuid NOT NULL,
    acted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_approvals_action_check CHECK ((action = ANY (ARRAY['approved'::text, 'rejected'::text])))
);

CREATE TABLE public.attendance_daily_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    first_check_in timestamp with time zone,
    last_check_out timestamp with time zone,
    total_hours numeric(5,2),
    status text DEFAULT 'pending'::text NOT NULL,
    has_exception boolean DEFAULT false NOT NULL,
    exception_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_daily_summaries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'correction_pending'::text])))
);

CREATE TABLE public.attendance_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    event_type text NOT NULL,
    corrected_event_type text,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    credential_id uuid,
    source text DEFAULT 'qr_self'::text NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_events_corrected_event_type_required CHECK ((((event_type = 'manual_correction'::text) AND (corrected_event_type IS NOT NULL)) OR ((event_type <> 'manual_correction'::text) AND (corrected_event_type IS NULL)))),
    CONSTRAINT attendance_events_corrected_event_type_valid CHECK (((corrected_event_type = ANY (ARRAY['check_in'::text, 'check_out'::text])) OR (corrected_event_type IS NULL))),
    CONSTRAINT attendance_events_event_type_check CHECK ((event_type = ANY (ARRAY['check_in'::text, 'check_out'::text, 'manual_correction'::text]))),
    CONSTRAINT attendance_events_source_check CHECK ((source = ANY (ARRAY['qr_self'::text, 'qr_kiosk'::text, 'manager_manual'::text])))
);

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    hours_worked numeric(6,2),
    status text DEFAULT 'recorded'::text NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_records_status_check CHECK ((status = ANY (ARRAY['recorded'::text, 'checked'::text])))
);

CREATE TABLE public.employee_qr_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    token text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    rotated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.restaurant_role_pay_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    job_title text NOT NULL,
    hourly_rate numeric(10,2) NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT restaurant_role_pay_rates_hourly_rate_check CHECK ((hourly_rate >= (0)::numeric)),
    CONSTRAINT restaurant_role_pay_rates_job_title_check CHECK ((job_title = ANY (ARRAY['manager'::text, 'chef'::text, 'server'::text, 'cashier'::text])))
);
-- END supabase/sql/40_people_attendance/schema.sql

-- BEGIN supabase/sql/60_platform_admin_support/schema.sql
-- 60_platform_admin_support/schema.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TABLE public.email_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_email text NOT NULL,
    recipient_name text,
    template_name text NOT NULL,
    template_data jsonb DEFAULT '{}'::jsonb,
    subject text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    CONSTRAINT email_notifications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);

COMMENT ON TABLE public.email_notifications IS 'Queue for outgoing email notifications';

CREATE TABLE public.platform_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    is_active boolean DEFAULT true NOT NULL,
    permissions jsonb DEFAULT '{"logs": ["read"], "users": ["read"], "support": ["read", "write"], "restaurants": ["read", "verify", "suspend"], "subscriptions": ["read", "update"]}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    deactivated_at timestamp with time zone,
    deactivated_by uuid,
    notes text
);

COMMENT ON TABLE public.platform_admins IS 'Platform-level administrators with cross-tenant access';

CREATE TABLE public.platform_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    restaurant_id uuid,
    changes jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.platform_audit_logs IS 'Audit trail of all platform administrator actions';

CREATE TABLE public.sla_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_priority text NOT NULL,
    first_response_hours integer NOT NULL,
    resolution_hours integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sla_config_ticket_priority_check CHECK ((ticket_priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])))
);

COMMENT ON TABLE public.sla_config IS 'SLA targets for support tickets by priority level';

CREATE TABLE public.support_ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    message text NOT NULL,
    posted_by_type text NOT NULL,
    posted_by uuid,
    poster_name text,
    is_internal_note boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    edited_by uuid,
    CONSTRAINT support_ticket_messages_posted_by_type_check CHECK ((posted_by_type = ANY (ARRAY['restaurant'::text, 'platform_admin'::text, 'system'::text])))
);

COMMENT ON TABLE public.support_ticket_messages IS 'Threaded messages within support tickets';

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    ticket_number integer NOT NULL,
    subject text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    submitted_by uuid NOT NULL,
    submitter_name text NOT NULL,
    submitter_email text NOT NULL,
    submitter_role text,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    first_response_at timestamp with time zone,
    first_response_sla_breach boolean DEFAULT false,
    resolution_sla_target timestamp with time zone,
    resolution_sla_breach boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    resolution_notes text,
    CONSTRAINT support_tickets_category_check CHECK ((category = ANY (ARRAY['billing'::text, 'technical'::text, 'feature_request'::text, 'bug_report'::text, 'account'::text, 'general'::text]))),
    CONSTRAINT support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['new'::text, 'investigating'::text, 'waiting_customer'::text, 'resolved'::text, 'closed'::text])))
);

COMMENT ON TABLE public.support_tickets IS 'Customer support tickets from restaurant tenants';

CREATE SEQUENCE public.support_tickets_ticket_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.tenant_usage_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    total_orders integer DEFAULT 0,
    total_order_items integer DEFAULT 0,
    total_revenue numeric(10,2) DEFAULT 0,
    unique_customers integer DEFAULT 0,
    active_staff_count integer DEFAULT 0,
    total_staff_hours numeric(10,2) DEFAULT 0,
    storage_used_mb bigint DEFAULT 0,
    image_count integer DEFAULT 0,
    ai_calls_count integer DEFAULT 0,
    ai_tokens_used integer DEFAULT 0,
    api_calls_count integer DEFAULT 0,
    api_errors_count integer DEFAULT 0,
    realtime_connections_peak integer DEFAULT 0,
    print_jobs_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.tenant_usage_snapshots IS 'Daily snapshots of resource usage per restaurant tenant';
-- END supabase/sql/60_platform_admin_support/schema.sql

-- BEGIN supabase/sql/20_ordering_customer/schema.sql
-- 20_ordering_customer/schema.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TABLE public.order_discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    order_id uuid NOT NULL,
    promotion_id uuid,
    promotion_code text NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    discount_amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_by_session text,
    CONSTRAINT order_discounts_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT order_discounts_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'flat'::text])))
);

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    min_order_amount numeric(12,2),
    max_discount_amount numeric(12,2),
    valid_from date,
    valid_until date,
    usage_limit integer,
    usage_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT promotions_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'flat'::text]))),
    CONSTRAINT promotions_discount_value_check CHECK ((discount_value > (0)::numeric))
);

CREATE TABLE public.restaurant_gallery_images (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    image_url text NOT NULL,
    caption text,
    alt_text text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_hero boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
-- END supabase/sql/20_ordering_customer/schema.sql

-- BEGIN supabase/sql/00_foundation/functions.sql
-- 00_foundation/functions.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'restaurant_id', '')::uuid,
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'restaurant_id', '')::uuid,
    (
      SELECT restaurant_id
      FROM users
      WHERE id = auth.uid()
      LIMIT 1
    )
  );
$function$;

COMMENT ON FUNCTION public.get_user_restaurant_id() IS 'Resolve the authenticated user''s effective branch restaurant id from JWT claims or the users table fallback';

CREATE OR REPLACE FUNCTION public.get_request_restaurant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT NULLIF(current_setting('app.current_restaurant_id', true), '')::uuid;
$function$;

COMMENT ON FUNCTION public.get_request_restaurant_id() IS 'Resolve the branch restaurant id bound to the current anonymous or public request context';

CREATE OR REPLACE FUNCTION public.is_service_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$function$;

COMMENT ON FUNCTION public.is_service_role() IS 'Identify internal RPC calls executed with the Supabase service role';

CREATE OR REPLACE FUNCTION public.user_has_restaurant_role(p_restaurant_id uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
      AND restaurant_id = p_restaurant_id
      AND role = ANY (p_roles)
  );
$function$;

COMMENT ON FUNCTION public.user_has_restaurant_role(p_restaurant_id uuid, p_roles text[]) IS 'Check whether the authenticated branch user belongs to a restaurant and holds one of the allowed branch roles';

CREATE OR REPLACE FUNCTION public.set_current_restaurant_id_for_session(restaurant_id_value uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- The 'true' in the third argument of set_config makes the setting local to the current session/transaction.
  PERFORM set_config('app.current_restaurant_id', restaurant_id_value::text, true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
-- END supabase/sql/00_foundation/functions.sql

-- BEGIN supabase/sql/30_founder_control/functions.sql
-- 30_founder_control/functions.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE OR REPLACE FUNCTION public.is_org_member(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members om
    WHERE  om.organization_id = p_organization_id
    AND    om.user_id          = auth.uid()
    AND    om.is_active        = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_founder(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members om
    WHERE  om.organization_id = p_organization_id
    AND    om.user_id          = auth.uid()
    AND    om.is_active        = true
    AND    om.role             = 'founder_full_control'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_member_for_restaurant(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members   om
    JOIN   organization_restaurants orr ON orr.organization_id = om.organization_id
    WHERE  orr.restaurant_id = p_restaurant_id
    AND    om.user_id         = auth.uid()
    AND    om.is_active       = true
    AND (
      om.shop_scope = 'all_shops'
      OR EXISTS (
        SELECT 1
        FROM   organization_member_shop_scopes s
        WHERE  s.member_id     = om.id
        AND    s.restaurant_id = p_restaurant_id
      )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.request_can_access_restaurant(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(public.get_request_restaurant_id() = p_restaurant_id, false)
      OR COALESCE(public.get_user_restaurant_id() = p_restaurant_id, false)
      OR public.is_org_member_for_restaurant(p_restaurant_id);
$function$;

COMMENT ON FUNCTION public.request_can_access_restaurant(p_restaurant_id uuid) IS 'Check whether the current anonymous, branch-authenticated, or organization-authenticated request can act on a restaurant';

CREATE OR REPLACE FUNCTION public.can_access_restaurant_context(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_service_role()
      OR public.request_can_access_restaurant(p_restaurant_id);
$function$;

COMMENT ON FUNCTION public.can_access_restaurant_context(p_restaurant_id uuid) IS 'Allow trusted internal callers or current request actors to operate within a restaurant context';

CREATE OR REPLACE FUNCTION public.complete_restaurant_onboarding(p_restaurant_id uuid, p_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_hero_title_en text DEFAULT NULL::text, p_hero_title_ja text DEFAULT NULL::text, p_hero_title_vi text DEFAULT NULL::text, p_hero_subtitle_en text DEFAULT NULL::text, p_hero_subtitle_ja text DEFAULT NULL::text, p_hero_subtitle_vi text DEFAULT NULL::text, p_owner_story_en text DEFAULT NULL::text, p_owner_story_ja text DEFAULT NULL::text, p_owner_story_vi text DEFAULT NULL::text, p_logo_url text DEFAULT NULL::text, p_owner_photo_url text DEFAULT NULL::text, p_gallery_images text[] DEFAULT NULL::text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  update_data jsonb := '{}';
  gallery_record record;
  existing_gallery_count integer := 0;
BEGIN
  IF NOT public.request_can_access_restaurant(p_restaurant_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authorized to onboard this restaurant'
    );
  END IF;

  -- Check if restaurant exists
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Restaurant not found'
    );
  END IF;

  -- Build update data dynamically
  IF p_name IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('name', p_name);
  END IF;
  
  IF p_phone IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('phone', p_phone);
  END IF;
  
  IF p_email IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('email', p_email);
  END IF;
  
  IF p_address IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('address', p_address);
  END IF;
  
  IF p_website IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('website', p_website);
  END IF;
  
  IF p_logo_url IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('logo_url', p_logo_url);
  END IF;

  -- Add hero content fields
  IF p_hero_title_en IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_title_en', p_hero_title_en);
  END IF;
  
  IF p_hero_title_ja IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_title_ja', p_hero_title_ja);
  END IF;
  
  IF p_hero_title_vi IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_title_vi', p_hero_title_vi);
  END IF;
  
  IF p_hero_subtitle_en IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_subtitle_en', p_hero_subtitle_en);
  END IF;
  
  IF p_hero_subtitle_ja IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_subtitle_ja', p_hero_subtitle_ja);
  END IF;
  
  IF p_hero_subtitle_vi IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('hero_subtitle_vi', p_hero_subtitle_vi);
  END IF;

  -- Add owner story fields
  IF p_owner_story_en IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('owner_story_en', p_owner_story_en);
  END IF;
  
  IF p_owner_story_ja IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('owner_story_ja', p_owner_story_ja);
  END IF;
  
  IF p_owner_story_vi IS NOT NULL THEN
    update_data := update_data || jsonb_build_object('owner_story_vi', p_owner_story_vi);
  END IF;

  -- Always mark as onboarded
  update_data := update_data || jsonb_build_object('onboarded', true);

  -- Execute the restaurant update
  EXECUTE format(
    'UPDATE restaurants SET %s, updated_at = NOW() WHERE id = $1',
    (
      SELECT string_agg(format('%I = ($2->>%L)::%s', key, key, 
        CASE 
          WHEN key = 'onboarded' THEN 'boolean'
          ELSE 'text'
        END
      ), ', ')
      FROM jsonb_object_keys(update_data) AS key
    )
  ) USING p_restaurant_id, update_data;

  -- Handle owner photo separately if provided (store in restaurants table)
  IF p_owner_photo_url IS NOT NULL THEN
    -- Update restaurants table with owner photo
    UPDATE restaurants 
    SET owner_photo_url = p_owner_photo_url, updated_at = NOW()
    WHERE id = p_restaurant_id;
  END IF;

  -- Handle gallery images if provided
  IF p_gallery_images IS NOT NULL AND array_length(p_gallery_images, 1) > 0 THEN
    -- Get current gallery count
    SELECT COUNT(*) INTO existing_gallery_count
    FROM restaurant_gallery_images 
    WHERE restaurant_id = p_restaurant_id;

    -- Insert new gallery images
    FOR i IN 1..array_length(p_gallery_images, 1) LOOP
      INSERT INTO restaurant_gallery_images (
        restaurant_id,
        image_url,
        alt_text,
        sort_order,
        created_at,
        updated_at
      ) VALUES (
        p_restaurant_id,
        p_gallery_images[i],
        'Gallery Image ' || (existing_gallery_count + i),
        existing_gallery_count + i,
        NOW(),
        NOW()
      );
    END LOOP;
  END IF;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'restaurant_id', p_restaurant_id,
    'updated_fields', jsonb_object_keys(update_data)
  );

EXCEPTION
  WHEN others THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$function$;

COMMENT ON FUNCTION public.complete_restaurant_onboarding(p_restaurant_id uuid, p_name text, p_phone text, p_email text, p_address text, p_website text, p_hero_title_en text, p_hero_title_ja text, p_hero_title_vi text, p_hero_subtitle_en text, p_hero_subtitle_ja text, p_hero_subtitle_vi text, p_owner_story_en text, p_owner_story_ja text, p_owner_story_vi text, p_logo_url text, p_owner_photo_url text, p_gallery_images text[]) IS 'Completes restaurant onboarding by updating restaurant data, owner photo, and gallery images in a single transaction';
-- END supabase/sql/30_founder_control/functions.sql

-- BEGIN supabase/sql/60_platform_admin_support/functions.sql
-- 60_platform_admin_support/functions.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE OR REPLACE FUNCTION public.is_platform_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = check_user_id
    AND is_active = true
  );
END;
$function$;

COMMENT ON FUNCTION public.is_platform_admin(check_user_id uuid) IS 'Check if a user is an active platform administrator';

CREATE OR REPLACE FUNCTION public.check_is_platform_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN is_platform_admin(auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_internal_operator()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_platform_admin() OR public.is_service_role();
$function$;

COMMENT ON FUNCTION public.is_internal_operator() IS 'Allow privileged internal jobs via service role while still permitting platform admin initiated RPC calls';

CREATE OR REPLACE FUNCTION public.get_platform_admin_permissions(check_user_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_permissions JSONB;
BEGIN
  IF check_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to inspect another platform admin''s permissions';
  END IF;

  SELECT permissions INTO admin_permissions
  FROM platform_admins
  WHERE user_id = check_user_id
  AND is_active = true;

  RETURN COALESCE(admin_permissions, '{}'::jsonb);
END;
$function$;

COMMENT ON FUNCTION public.get_platform_admin_permissions(check_user_id uuid) IS 'Get permissions for a platform administrator';

CREATE OR REPLACE FUNCTION public.queue_email_notification(p_recipient_email text, p_recipient_name text, p_template_name text, p_template_data jsonb, p_subject text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to queue email notifications';
  END IF;

  INSERT INTO email_notifications (
    recipient_email,
    recipient_name,
    template_name,
    template_data,
    subject
  ) VALUES (
    p_recipient_email,
    p_recipient_name,
    p_template_name,
    p_template_data,
    p_subject
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$function$;

COMMENT ON FUNCTION public.queue_email_notification(p_recipient_email text, p_recipient_name text, p_template_name text, p_template_data jsonb, p_subject text) IS 'Queue an email notification for async sending';

CREATE OR REPLACE FUNCTION public.trigger_restaurant_verified_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only send if restaurant just got verified (wasn't verified before)
  IF NEW.is_verified = true AND (OLD.is_verified = false OR OLD.is_verified IS NULL) THEN
    PERFORM queue_email_notification(
      NEW.email,
      NEW.name,
      'restaurant_approved',
      jsonb_build_object(
        'restaurant_name', NEW.name,
        'subdomain', NEW.subdomain,
        'verification_date', NEW.verified_at
      ),
      'Your restaurant has been approved!'
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_restaurant_rejection_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If restaurant was not verified and is being deleted, send rejection email
  IF OLD.is_verified = false THEN
    PERFORM queue_email_notification(
      OLD.email,
      OLD.name,
      'restaurant_rejected',
      jsonb_build_object(
        'restaurant_name', OLD.name,
        'rejection_date', NOW()
      ),
      'Update regarding your restaurant application'
    );
  END IF;

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_restaurant_suspended_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only send if restaurant just got suspended
  IF NEW.suspended_at IS NOT NULL AND OLD.suspended_at IS NULL THEN
    PERFORM queue_email_notification(
      NEW.email,
      NEW.name,
      'restaurant_suspended',
      jsonb_build_object(
        'restaurant_name', NEW.name,
        'suspend_reason', NEW.suspend_reason,
        'suspended_at', NEW.suspended_at
      ),
      'Important: Your restaurant account has been suspended'
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_restaurant_unsuspended_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only send if restaurant just got unsuspended
  IF NEW.suspended_at IS NULL AND OLD.suspended_at IS NOT NULL THEN
    PERFORM queue_email_notification(
      NEW.email,
      NEW.name,
      'restaurant_unsuspended',
      jsonb_build_object(
        'restaurant_name', NEW.name,
        'unsuspended_at', NOW()
      ),
      'Your restaurant account has been reactivated'
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_restaurant_verification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.log_platform_action(p_action text, p_resource_type text, p_resource_id uuid DEFAULT NULL::uuid, p_restaurant_id uuid DEFAULT NULL::uuid, p_changes jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

COMMENT ON FUNCTION public.log_platform_action(p_action text, p_resource_type text, p_resource_id uuid, p_restaurant_id uuid, p_changes jsonb) IS 'Log a platform admin action to the audit trail';

CREATE OR REPLACE FUNCTION public.get_platform_restaurant_summary(rest_id uuid)
 RETURNS TABLE(restaurant_id uuid, restaurant_name text, subdomain text, owner_email text, is_active boolean, is_verified boolean, verified_at timestamp with time zone, created_at timestamp with time zone, subscription_plan text, subscription_status text, trial_ends_at timestamp with time zone, total_staff integer, total_orders_30d bigint, total_revenue_30d numeric, last_order_at timestamp with time zone, support_tickets_open integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

COMMENT ON FUNCTION public.get_platform_restaurant_summary(rest_id uuid) IS 'Get comprehensive summary of a restaurant for platform admins';

CREATE OR REPLACE FUNCTION public.verify_restaurant(rest_id uuid, admin_id uuid, notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

COMMENT ON FUNCTION public.verify_restaurant(rest_id uuid, admin_id uuid, notes text) IS 'Verify a restaurant (platform admin only)
';

CREATE OR REPLACE FUNCTION public.suspend_restaurant(rest_id uuid, admin_id uuid, reason text, notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

COMMENT ON FUNCTION public.suspend_restaurant(rest_id uuid, admin_id uuid, reason text, notes text) IS 'Suspend a restaurant (platform admin only)';

CREATE OR REPLACE FUNCTION public.unsuspend_restaurant(rest_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

COMMENT ON FUNCTION public.unsuspend_restaurant(rest_id uuid) IS 'Unsuspend a restaurant (platform admin only)';

CREATE OR REPLACE FUNCTION public.update_support_tickets_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_first_response_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.posted_by_type = 'platform_admin' THEN
    UPDATE support_tickets
    SET first_response_at = COALESCE(first_response_at, NEW.created_at)
    WHERE id = NEW.ticket_id
    AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_support_ticket_summary(rest_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_tickets bigint, new_tickets bigint, investigating_tickets bigint, waiting_customer_tickets bigint, resolved_tickets bigint, closed_tickets bigint, sla_breached_tickets bigint, avg_resolution_time_hours numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access support ticket summary';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) as total_tickets,
    COUNT(*) FILTER (WHERE status = 'new') as new_tickets,
    COUNT(*) FILTER (WHERE status = 'investigating') as investigating_tickets,
    COUNT(*) FILTER (WHERE status = 'waiting_customer') as waiting_customer_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
    COUNT(*) FILTER (WHERE resolution_sla_breach = true) as sla_breached_tickets,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_hours
  FROM support_tickets
  WHERE rest_id IS NULL OR restaurant_id = rest_id;
END;
$function$;

COMMENT ON FUNCTION public.get_support_ticket_summary(rest_id uuid) IS 'Get summary statistics for support tickets';

CREATE OR REPLACE FUNCTION public.reject_restaurant_application(rest_id uuid, admin_id uuid, rejection_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_restaurant RECORD;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can reject applications';
  END IF;

  -- Get restaurant details
  SELECT * INTO v_restaurant
  FROM restaurants
  WHERE id = rest_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Queue rejection email
  PERFORM queue_email_notification(
    v_restaurant.email,
    v_restaurant.name,
    'restaurant_rejected',
    jsonb_build_object(
      'restaurant_name', v_restaurant.name,
      'rejection_reason', rejection_reason,
      'rejection_date', NOW()
    ),
    'Update regarding your restaurant application'
  );

  -- Log the rejection
  PERFORM log_platform_action(
    'reject_restaurant_application',
    'restaurant',
    rest_id,
    rest_id,
    jsonb_build_object('reason', rejection_reason)
  );

  -- Mark as inactive instead of deleting
  UPDATE restaurants
  SET
    is_active = false,
    platform_notes = COALESCE(platform_notes || E'\n\n', '') ||
      'Rejected: ' || rejection_reason || ' (by admin ' || admin_id::text || ' at ' || NOW()::text || ')'
  WHERE id = rest_id;

  RETURN true;
END;
$function$;

COMMENT ON FUNCTION public.reject_restaurant_application(rest_id uuid, admin_id uuid, rejection_reason text) IS 'Reject a restaurant application and send notification email';

CREATE OR REPLACE FUNCTION public.set_ticket_sla_targets()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  sla_settings RECORD;
BEGIN
  -- Get SLA settings for this priority
  SELECT * INTO sla_settings
  FROM sla_config
  WHERE ticket_priority = NEW.priority;

  IF FOUND THEN
    -- Set resolution SLA target
    NEW.resolution_sla_target := NEW.created_at + (sla_settings.resolution_hours || ' hours')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_ticket_sla_targets()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  sla_settings RECORD;
BEGIN
  -- Only update if priority changed
  IF NEW.priority != OLD.priority THEN
    -- Get new SLA settings
    SELECT * INTO sla_settings
    FROM sla_config
    WHERE ticket_priority = NEW.priority;

    IF FOUND THEN
      -- Recalculate resolution SLA based on new priority
      NEW.resolution_sla_target := OLD.created_at + (sla_settings.resolution_hours || ' hours')::INTERVAL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_sla_breaches()
 RETURNS TABLE(ticket_id uuid, ticket_number integer, breach_type text, breach_time interval)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ticket_record RECORD;
  sla_settings RECORD;
  first_response_deadline TIMESTAMPTZ;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to check SLA breaches';
  END IF;

  FOR ticket_record IN
    SELECT
      st.id,
      st.ticket_number,
      st.priority,
      st.status,
      st.created_at,
      st.first_response_at,
      st.first_response_sla_breach,
      st.resolution_sla_target,
      st.resolution_sla_breach,
      st.resolved_at
    FROM support_tickets st
    WHERE st.status NOT IN ('resolved', 'closed')
  LOOP
    -- Get SLA settings for this priority
    SELECT * INTO sla_settings
    FROM sla_config
    WHERE ticket_priority = ticket_record.priority;

    IF FOUND THEN
      -- Check first response SLA
      IF ticket_record.first_response_at IS NULL THEN
        first_response_deadline := ticket_record.created_at + (sla_settings.first_response_hours || ' hours')::INTERVAL;

        IF NOW() > first_response_deadline AND NOT ticket_record.first_response_sla_breach THEN
          -- Flag first response SLA breach
          UPDATE support_tickets
          SET first_response_sla_breach = true
          WHERE id = ticket_record.id;

          ticket_id := ticket_record.id;
          ticket_number := ticket_record.ticket_number;
          breach_type := 'first_response';
          breach_time := NOW() - first_response_deadline;

          RETURN NEXT;
        END IF;
      END IF;

      -- Check resolution SLA
      IF ticket_record.resolved_at IS NULL AND ticket_record.resolution_sla_target IS NOT NULL THEN
        IF NOW() > ticket_record.resolution_sla_target AND NOT ticket_record.resolution_sla_breach THEN
          -- Flag resolution SLA breach
          UPDATE support_tickets
          SET resolution_sla_breach = true
          WHERE id = ticket_record.id;

          ticket_id := ticket_record.id;
          ticket_number := ticket_record.ticket_number;
          breach_type := 'resolution';
          breach_time := NOW() - ticket_record.resolution_sla_target;

          RETURN NEXT;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.check_sla_breaches() IS 'Check for SLA breaches and flag tickets';

CREATE OR REPLACE FUNCTION public.auto_escalate_tickets()
 RETURNS TABLE(ticket_id uuid, old_priority text, new_priority text, escalation_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ticket_record RECORD;
  new_priority_value TEXT;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to auto-escalate support tickets';
  END IF;

  FOR ticket_record IN
    SELECT
      st.id,
      st.priority,
      st.status,
      st.resolution_sla_breach,
      st.first_response_sla_breach,
      st.created_at
    FROM support_tickets st
    WHERE st.status NOT IN ('resolved', 'closed')
    AND (st.resolution_sla_breach = true OR st.first_response_sla_breach = true)
  LOOP
    -- Escalate priority
    new_priority_value := CASE ticket_record.priority
      WHEN 'low' THEN 'medium'
      WHEN 'medium' THEN 'high'
      WHEN 'high' THEN 'urgent'
      ELSE 'urgent'
    END;

    -- Only escalate if priority can be increased
    IF new_priority_value != ticket_record.priority THEN
      UPDATE support_tickets
      SET priority = new_priority_value
      WHERE id = ticket_record.id;

      -- Create internal note about escalation
      INSERT INTO support_ticket_messages (
        ticket_id,
        message,
        posted_by_type,
        is_internal_note
      ) VALUES (
        ticket_record.id,
        'Ticket automatically escalated from ' || ticket_record.priority || ' to ' || new_priority_value || ' due to SLA breach.',
        'system',
        true
      );

      ticket_id := ticket_record.id;
      old_priority := ticket_record.priority;
      new_priority := new_priority_value;
      escalation_reason := 'sla_breach';

      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.auto_escalate_tickets() IS 'Automatically escalate tickets that have breached SLA';

CREATE OR REPLACE FUNCTION public.get_sla_performance(days_back integer DEFAULT 30)
 RETURNS TABLE(total_tickets integer, first_response_on_time integer, first_response_breached integer, first_response_rate numeric, resolution_on_time integer, resolution_breached integer, resolution_rate numeric, avg_first_response_hours numeric, avg_resolution_hours numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total INTEGER;
  v_fr_on_time INTEGER;
  v_fr_breach INTEGER;
  v_res_on_time INTEGER;
  v_res_breach INTEGER;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access SLA performance';
  END IF;

  -- Total tickets in period
  SELECT COUNT(*) INTO v_total
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL;

  -- First response stats
  SELECT COUNT(*) INTO v_fr_on_time
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND first_response_sla_breach = false
  AND first_response_at IS NOT NULL;

  SELECT COUNT(*) INTO v_fr_breach
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND first_response_sla_breach = true;

  -- Resolution stats
  SELECT COUNT(*) INTO v_res_on_time
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND resolution_sla_breach = false
  AND resolved_at IS NOT NULL;

  SELECT COUNT(*) INTO v_res_breach
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND resolution_sla_breach = true;

  -- Return results
  total_tickets := v_total;
  first_response_on_time := v_fr_on_time;
  first_response_breached := v_fr_breach;
  first_response_rate := CASE WHEN (v_fr_on_time + v_fr_breach) > 0
    THEN (v_fr_on_time::NUMERIC / (v_fr_on_time + v_fr_breach)::NUMERIC) * 100
    ELSE 0
  END;

  resolution_on_time := v_res_on_time;
  resolution_breached := v_res_breach;
  resolution_rate := CASE WHEN (v_res_on_time + v_res_breach) > 0
    THEN (v_res_on_time::NUMERIC / (v_res_on_time + v_res_breach)::NUMERIC) * 100
    ELSE 0
  END;

  -- Average times
  SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600.0) INTO avg_first_response_hours
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND first_response_at IS NOT NULL;

  SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) INTO avg_resolution_hours
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND resolved_at IS NOT NULL;

  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.get_sla_performance(days_back integer) IS 'Get SLA performance metrics for dashboard';

CREATE OR REPLACE FUNCTION public.calculate_daily_usage_snapshot(rest_id uuid, target_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_orders integer := 0;
  v_total_order_items integer := 0;
  v_total_revenue numeric(12,2) := 0;
  v_unique_customers integer := 0;
  v_active_staff_count integer := 0;
  v_total_staff_hours numeric(10,2) := 0;
  v_ai_calls_count integer := 0;
  v_print_jobs_count integer := 0;
  v_timezone text := 'Asia/Tokyo';
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to calculate daily usage snapshots';
  END IF;

  SELECT COALESCE(timezone, 'Asia/Tokyo')
  INTO v_timezone
  FROM restaurants
  WHERE id = rest_id;

  v_day_start := (target_date::timestamp AT TIME ZONE v_timezone);
  v_day_end := ((target_date + INTERVAL '1 day')::timestamp AT TIME ZONE v_timezone);

  SELECT
    COUNT(DISTINCT o.id),
    COUNT(oi.id),
    COALESCE(SUM(oi.price_at_order * oi.quantity), 0),
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
    COUNT(DISTINCT ads.employee_id),
    COALESCE(SUM(ads.total_hours), 0)
  INTO
    v_active_staff_count,
    v_total_staff_hours
  FROM attendance_daily_summaries ads
  WHERE ads.restaurant_id = rest_id
    AND ads.work_date = target_date
    AND ads.status IN ('pending', 'approved', 'correction_pending');

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
$function$;

COMMENT ON FUNCTION public.calculate_daily_usage_snapshot(rest_id uuid, target_date date) IS 'Calculate and store daily usage snapshot for a restaurant';

CREATE OR REPLACE FUNCTION public.calculate_all_usage_snapshots(target_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  restaurant_record record;
  processed_count integer := 0;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to calculate usage snapshots';
  END IF;

  FOR restaurant_record IN
    SELECT id
    FROM restaurants
    WHERE is_active = true
  LOOP
    PERFORM calculate_daily_usage_snapshot(restaurant_record.id, target_date);
    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$function$;

COMMENT ON FUNCTION public.calculate_all_usage_snapshots(target_date date) IS 'Calculate usage snapshots for all active restaurants';

CREATE OR REPLACE FUNCTION public.get_usage_trends(rest_id uuid, days_back integer DEFAULT 30)
 RETURNS TABLE(snapshot_date date, total_orders integer, total_revenue numeric, unique_customers integer, ai_calls_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access usage trends';
  END IF;

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
$function$;

COMMENT ON FUNCTION public.get_usage_trends(rest_id uuid, days_back integer) IS 'Get usage trends for a restaurant over time';

CREATE OR REPLACE FUNCTION public.get_platform_usage_summary(target_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(total_restaurants bigint, total_orders bigint, total_revenue numeric, total_customers bigint, total_ai_calls bigint, avg_orders_per_restaurant numeric, avg_revenue_per_restaurant numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access platform usage summary';
  END IF;

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
$function$;

COMMENT ON FUNCTION public.get_platform_usage_summary(target_date date) IS 'Get aggregated platform-wide usage summary';

CREATE OR REPLACE FUNCTION public.get_top_seller_for_day(p_restaurant_id uuid, p_date text)
 RETURNS TABLE(name_en text, name_ja text, name_vi text, total_sold bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        mi.name_en,
        mi.name_ja,
        mi.name_vi,
        SUM(oi.quantity) AS total_sold
    FROM
        order_items oi
    JOIN
        orders o ON oi.order_id = o.id
    JOIN
        menu_items mi ON oi.menu_item_id = mi.id
    WHERE
        o.restaurant_id = p_restaurant_id AND
        o.created_at::date = p_date::date
    GROUP BY
        mi.id,
        mi.name_en,
        mi.name_ja,
        mi.name_vi
    ORDER BY
        total_sold DESC
    LIMIT 1;
END;
$function$;
-- END supabase/sql/60_platform_admin_support/functions.sql

-- BEGIN supabase/sql/50_finance_billing/functions.sql
-- 50_finance_billing/functions.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE OR REPLACE FUNCTION public.update_subscription_plans_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_restaurant_subscription_status(rest_id uuid)
 RETURNS TABLE(plan_id text, status text, is_trial boolean, trial_days_remaining integer, period_ends_at timestamp with time zone, days_until_renewal integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.request_can_access_restaurant(rest_id) OR public.is_internal_operator()) THEN
    RAISE EXCEPTION 'Not authorized to access subscription status for restaurant %', rest_id;
  END IF;

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
$function$;

COMMENT ON FUNCTION public.get_restaurant_subscription_status(rest_id uuid) IS 'Get detailed subscription status for a restaurant';

CREATE OR REPLACE FUNCTION public.check_restaurant_quota(rest_id uuid, quota_type text, current_usage integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  quota_limit INTEGER;
BEGIN
  IF NOT (public.request_can_access_restaurant(rest_id) OR public.is_internal_operator()) THEN
    RAISE EXCEPTION 'Not authorized to check quota for restaurant %', rest_id;
  END IF;

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
$function$;

COMMENT ON FUNCTION public.check_restaurant_quota(rest_id uuid, quota_type text, current_usage integer) IS 'Check if restaurant is within quota limits for a specific resource';

CREATE OR REPLACE FUNCTION public.update_tenant_subscriptions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_subscription_receipts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_trials_expiring_soon(days_threshold integer DEFAULT 3)
 RETURNS TABLE(subscription_id uuid, restaurant_id uuid, restaurant_name text, restaurant_email text, plan_id text, trial_ends_at timestamp with time zone, days_remaining numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to inspect expiring trials';
  END IF;

  RETURN QUERY
  SELECT
    ts.id,
    ts.restaurant_id,
    r.name,
    r.email,
    ts.plan_id,
    ts.trial_ends_at,
    EXTRACT(EPOCH FROM (ts.trial_ends_at - NOW())) / 86400.0 as days_remaining
  FROM tenant_subscriptions ts
  JOIN restaurants r ON r.id = ts.restaurant_id
  WHERE ts.status = 'trial'
  AND ts.trial_ends_at IS NOT NULL
  AND ts.trial_ends_at > NOW()
  AND ts.trial_ends_at <= NOW() + (days_threshold || ' days')::INTERVAL
  ORDER BY ts.trial_ends_at ASC;
END;
$function$;

COMMENT ON FUNCTION public.get_trials_expiring_soon(days_threshold integer) IS 'Find all trials expiring within the specified days threshold';

CREATE OR REPLACE FUNCTION public.send_trial_expiration_warnings(days_before integer DEFAULT 3)
 RETURNS TABLE(restaurant_id uuid, email_queued boolean, days_remaining numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trial_record RECORD;
  email_id UUID;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to send trial expiration warnings';
  END IF;

  FOR trial_record IN
    SELECT * FROM get_trials_expiring_soon(days_before)
  LOOP
    -- Queue email notification
    email_id := queue_email_notification(
      trial_record.restaurant_email,
      trial_record.restaurant_name,
      'trial_expiring_soon',
      jsonb_build_object(
        'restaurant_name', trial_record.restaurant_name,
        'plan_name', trial_record.plan_id,
        'trial_ends_at', trial_record.trial_ends_at,
        'days_remaining', FLOOR(trial_record.days_remaining)
      ),
      'Your trial is ending in ' || FLOOR(trial_record.days_remaining) || ' days'
    );

    restaurant_id := trial_record.restaurant_id;
    email_queued := (email_id IS NOT NULL);
    days_remaining := trial_record.days_remaining;

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.send_trial_expiration_warnings(days_before integer) IS 'Send email warnings for trials expiring soon';

CREATE OR REPLACE FUNCTION public.process_expired_trials()
 RETURNS TABLE(subscription_id uuid, restaurant_id uuid, action_taken text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  expired_trial RECORD;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to process expired trials';
  END IF;

  FOR expired_trial IN
    SELECT
      ts.id,
      ts.restaurant_id,
      r.name,
      r.email,
      ts.plan_id
    FROM tenant_subscriptions ts
    JOIN restaurants r ON r.id = ts.restaurant_id
    WHERE ts.status = 'trial'
    AND ts.trial_ends_at IS NOT NULL
    AND ts.trial_ends_at < NOW()
  LOOP
    -- Update subscription status to expired
    UPDATE tenant_subscriptions
    SET status = 'expired'
    WHERE id = expired_trial.id;

    -- Queue expiration notification email
    PERFORM queue_email_notification(
      expired_trial.email,
      expired_trial.name,
      'trial_expired',
      jsonb_build_object(
        'restaurant_name', expired_trial.name,
        'plan_id', expired_trial.plan_id
      ),
      'Your trial has expired - Subscribe to continue'
    );

    subscription_id := expired_trial.id;
    restaurant_id := expired_trial.restaurant_id;
    action_taken := 'expired_and_notified';

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.process_expired_trials() IS 'Process expired trials and send notifications';

CREATE OR REPLACE FUNCTION public.extend_trial(sub_id uuid, extension_days integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_trial_end TIMESTAMPTZ;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can extend trials';
  END IF;

  -- Get current trial end date
  SELECT trial_ends_at INTO current_trial_end
  FROM tenant_subscriptions
  WHERE id = sub_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Extend the trial
  UPDATE tenant_subscriptions
  SET
    trial_ends_at = COALESCE(current_trial_end, NOW()) + (extension_days || ' days')::INTERVAL,
    current_period_end = COALESCE(current_trial_end, NOW()) + (extension_days || ' days')::INTERVAL
  WHERE id = sub_id;

  -- If status was expired, revert to trial
  UPDATE tenant_subscriptions
  SET status = 'trial'
  WHERE id = sub_id
  AND status = 'expired';

  RETURN true;
END;
$function$;

COMMENT ON FUNCTION public.extend_trial(sub_id uuid, extension_days integer) IS 'Extend trial period by specified days (platform admin only)';

CREATE OR REPLACE FUNCTION public.get_trial_statistics()
 RETURNS TABLE(total_trials integer, expiring_today integer, expiring_this_week integer, expiring_this_month integer, expired_last_7_days integer, conversion_rate_last_30_days numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_trials INTEGER;
  v_expiring_today INTEGER;
  v_expiring_week INTEGER;
  v_expiring_month INTEGER;
  v_expired_7d INTEGER;
  v_trials_30d INTEGER;
  v_converted_30d INTEGER;
  v_conversion_rate NUMERIC;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to view trial statistics';
  END IF;

  -- Total active trials
  SELECT COUNT(*) INTO v_total_trials
  FROM tenant_subscriptions
  WHERE status = 'trial';

  -- Expiring today
  SELECT COUNT(*) INTO v_expiring_today
  FROM tenant_subscriptions
  WHERE status = 'trial'
  AND trial_ends_at::DATE = CURRENT_DATE;

  -- Expiring this week
  SELECT COUNT(*) INTO v_expiring_week
  FROM tenant_subscriptions
  WHERE status = 'trial'
  AND trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';

  -- Expiring this month
  SELECT COUNT(*) INTO v_expiring_month
  FROM tenant_subscriptions
  WHERE status = 'trial'
  AND trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '30 days';

  -- Expired in last 7 days
  SELECT COUNT(*) INTO v_expired_7d
  FROM tenant_subscriptions
  WHERE status = 'expired'
  AND trial_ends_at BETWEEN NOW() - INTERVAL '7 days' AND NOW();

  -- Conversion rate (last 30 days)
  SELECT COUNT(*) INTO v_trials_30d
  FROM tenant_subscriptions
  WHERE trial_ends_at BETWEEN NOW() - INTERVAL '30 days' AND NOW();

  SELECT COUNT(*) INTO v_converted_30d
  FROM tenant_subscriptions
  WHERE trial_ends_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
  AND status = 'active'
  AND activated_at IS NOT NULL;

  IF v_trials_30d > 0 THEN
    v_conversion_rate := (v_converted_30d::NUMERIC / v_trials_30d::NUMERIC) * 100;
  ELSE
    v_conversion_rate := 0;
  END IF;

  total_trials := v_total_trials;
  expiring_today := v_expiring_today;
  expiring_this_week := v_expiring_week;
  expiring_this_month := v_expiring_month;
  expired_last_7_days := v_expired_7d;
  conversion_rate_last_30_days := v_conversion_rate;

  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.get_trial_statistics() IS 'Get comprehensive trial statistics for dashboard';
-- END supabase/sql/50_finance_billing/functions.sql

-- BEGIN supabase/sql/10_branch_core/functions.sql
-- 10_branch_core/functions.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE OR REPLACE FUNCTION public.log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO audit_logs (
    restaurant_id,
    user_id,
    action,
    table_name,
    record_id,
    changes,
    ip_address
  )
  VALUES (
    COALESCE(NEW.restaurant_id, OLD.restaurant_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
    current_setting('request.ip', true)::inet
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_sellers_7days(p_restaurant_id uuid, p_limit integer)
 RETURNS TABLE(menu_item_id uuid, name_en text, name_ja text, name_vi text, total_sold bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        mi.id as menu_item_id,
        mi.name_en,
        mi.name_ja,
        mi.name_vi,
        SUM(oi.quantity) AS total_sold
    FROM
        order_items oi
    JOIN
        orders o ON oi.order_id = o.id
    JOIN
        menu_items mi ON oi.menu_item_id = mi.id
    WHERE
        o.restaurant_id = p_restaurant_id AND
        o.created_at >= NOW() - INTERVAL '7 days' AND
        o.status = 'completed'
    GROUP BY
        mi.id, mi.name_en, mi.name_ja, mi.name_vi
    ORDER BY
        total_sold DESC
    LIMIT
        p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.apply_recommendations(p_restaurant_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    featured_category_id uuid;
    top_seller_record record;
BEGIN
    -- Find or create "Featured" category
    SELECT id INTO featured_category_id
    FROM categories
    WHERE restaurant_id = p_restaurant_id AND name_en = 'Featured';

    IF featured_category_id IS NULL THEN
        INSERT INTO categories (restaurant_id, name_en, name_ja, name_vi, position)
        VALUES (p_restaurant_id, 'Featured', 'おすすめ', 'Nổi bật', 0)
        RETURNING id INTO featured_category_id;
    END IF;

    -- Delete existing items in "Featured" category
    DELETE FROM menu_items
    WHERE restaurant_id = p_restaurant_id AND category_id = featured_category_id;

    -- Copy top 3 sellers into "Featured" category
    FOR top_seller_record IN
        WITH top_sellers AS (
            SELECT ts.menu_item_id
            FROM get_top_sellers_7days(p_restaurant_id, 3) ts
        )
        SELECT
            orig_mi.*
        FROM menu_items orig_mi
        JOIN top_sellers ts ON orig_mi.id = ts.menu_item_id
    LOOP
        INSERT INTO menu_items (
            restaurant_id,
            category_id,
            name_ja,
            name_en,
            name_vi,
            code,
            description_ja,
            description_en,
            description_vi,
            price,
            tags,
            image_url,
            available,
            position
        )
        VALUES (
            p_restaurant_id,
            featured_category_id,
            top_seller_record.name_ja,
            top_seller_record.name_en,
            top_seller_record.name_vi,
            top_seller_record.code || '_featured',
            top_seller_record.description_ja,
            top_seller_record.description_en,
            top_seller_record.description_vi,
            top_seller_record.price,
            top_seller_record.tags,
            top_seller_record.image_url,
            true,
            0
        );
    END LOOP;

    RETURN json_build_object('success', true);

EXCEPTION
    WHEN others THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_table_session_by_code(input_code text, input_restaurant_id uuid)
 RETURNS TABLE(table_id uuid, restaurant_id uuid, active_session_id uuid, require_passcode boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS table_id,
    t.restaurant_id,
    o.session_id AS active_session_id,
    CASE 
      WHEN o.session_id IS NOT NULL THEN true 
      ELSE false 
    END AS require_passcode
  FROM tables t
  LEFT JOIN LATERAL (
    SELECT session_id
    FROM orders
    WHERE orders.table_id = t.id
      AND orders.status IN ('new', 'serving', 'ready')
    ORDER BY created_at DESC
    LIMIT 1
  ) o ON true
  WHERE t.qr_code = input_code
    AND t.restaurant_id = input_restaurant_id
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_order_session_info(p_session_id uuid, p_restaurant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id',            o.id,
    'restaurant_id', p_restaurant_id,
    'session_id',    o.session_id,
    'table_id',      o.table_id,
    'table_name',    t.name,
    'guest_count',   o.guest_count,
    'status',        o.status,
    'total_amount',  COALESCE(o.total_amount, 0),
    'created_at',    o.created_at,
    'items', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'menu_item_id', oi.menu_item_id,
          'name_en',     mi.name_en,
          'name_ja',     mi.name_ja,
          'name_vi',     mi.name_vi,
          'quantity',    oi.quantity,
          'notes',       oi.notes,
          'status',      oi.status,
          'unit_price',  mi.price,
          'total',       COALESCE(oi.price_at_order, mi.price) * oi.quantity,
          'price_at_order', oi.price_at_order,
          'created_at',  oi.created_at,
          'menu_item_sizes', CASE 
            WHEN oi.menu_item_size_id IS NOT NULL THEN
              (SELECT jsonb_build_object(
                'id', mis.id,
                'size_key', mis.size_key,
                'name_en', mis.name_en,
                'name_ja', mis.name_ja,
                'name_vi', mis.name_vi,
                'price', mis.price
              )
              FROM menu_item_sizes mis 
              WHERE mis.id = oi.menu_item_size_id)
            ELSE NULL
          END,
          'toppings', CASE 
            WHEN oi.topping_ids IS NOT NULL AND array_length(oi.topping_ids, 1) > 0 THEN
              (SELECT jsonb_agg(
                jsonb_build_object(
                  'id', t.id,
                  'name_en', t.name_en,
                  'name_ja', t.name_ja,
                  'name_vi', t.name_vi,
                  'price', t.price
                )
              )
              FROM toppings t 
              WHERE t.id = ANY(oi.topping_ids))
            ELSE '[]'::jsonb
          END
        )
      )
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = o.id
    )
  ) 
  INTO result
  FROM orders o
  JOIN tables t ON o.table_id = t.id
  WHERE o.session_id    = p_session_id
    AND o.restaurant_id = p_restaurant_id
  LIMIT 1;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Order session not found';
  END IF;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_order_session_passcode(input_session_id uuid, input_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN LEFT(input_session_id::TEXT, 4) = input_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_item_to_order(input_session_id uuid, input_menu_item_id uuid, input_quantity integer, input_notes text DEFAULT ''::text, input_size_id uuid DEFAULT NULL::uuid, input_topping_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS TABLE(order_item_id uuid, success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o_rec RECORD;
  mi_rec RECORD;
  calculated_price NUMERIC;
  size_price NUMERIC := 0;
  toppings_price NUMERIC := 0;
  new_id UUID := uuid_generate_v4();
BEGIN
  -- Verify active session
  SELECT * INTO o_rec
    FROM orders
   WHERE session_id = input_session_id
     AND status IN ('new','preparing')
   LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'No active order session';
    RETURN;
  END IF;

  -- Get menu item details
  SELECT * INTO mi_rec
    FROM menu_items
   WHERE id = input_menu_item_id
     AND restaurant_id = o_rec.restaurant_id
     AND available = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Menu item not found or not available';
    RETURN;
  END IF;

  -- Calculate price with size if provided
  IF input_size_id IS NOT NULL THEN
    SELECT price INTO size_price
      FROM menu_item_sizes
     WHERE id = input_size_id
       AND menu_item_id = input_menu_item_id
       AND restaurant_id = o_rec.restaurant_id;
    
    IF size_price IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Invalid size selection';
      RETURN;
    END IF;
  END IF;

  -- Calculate toppings price
  IF array_length(input_topping_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO toppings_price
      FROM toppings
     WHERE id = ANY(input_topping_ids)
       AND restaurant_id = o_rec.restaurant_id;
  END IF;

  -- Calculate final price
  calculated_price := COALESCE(size_price, mi_rec.price) + toppings_price;

  -- Insert order item
  INSERT INTO order_items (
    id, restaurant_id, order_id, menu_item_id, menu_item_size_id,
    quantity, notes, topping_ids, price_at_order
  ) VALUES (
    new_id, o_rec.restaurant_id, o_rec.id, input_menu_item_id, input_size_id,
    input_quantity, input_notes, input_topping_ids, calculated_price
  );

  RETURN QUERY SELECT new_id, TRUE, 'Item added successfully';
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_item_status(input_order_item_id uuid, input_restaurant_id uuid, input_status text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate status
  IF input_status NOT IN ('new','preparing','ready','served','canceled') THEN
    RETURN QUERY SELECT FALSE, 'Invalid status';
    RETURN;
  END IF;

  -- Update the order item
  UPDATE order_items 
  SET status = input_status, updated_at = now()
  WHERE id = input_order_item_id 
    AND restaurant_id = input_restaurant_id;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Status updated successfully';
  ELSE
    RETURN QUERY SELECT FALSE, 'Order item not found';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_order_total(order_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_amount NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(price_at_order * quantity), 0)
  INTO total_amount
  FROM order_items
  WHERE order_id = order_id_param
    AND status != 'canceled';

  RETURN total_amount;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  new_total NUMERIC;
BEGIN
  -- Calculate new total for the order
  SELECT calculate_order_total(COALESCE(NEW.order_id, OLD.order_id))
  INTO new_total;

  -- Update the order total
  UPDATE orders 
  SET total_amount = new_total, updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_sales_analytics(p_restaurant_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(date date, total_orders bigint, total_revenue numeric, average_order_value numeric, top_selling_item_id uuid, top_selling_item_name text, top_selling_item_quantity bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(o.total_amount), 0) as revenue,
      CASE 
        WHEN COUNT(DISTINCT o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(DISTINCT o.id)
        ELSE 0
      END as avg_order_value
    FROM orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND DATE(o.created_at) = p_date
      AND o.status != 'canceled'
  ),
  top_item AS (
    SELECT 
      oi.menu_item_id,
      mi.name_en,
      SUM(oi.quantity) as total_quantity
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE o.restaurant_id = p_restaurant_id
      AND DATE(o.created_at) = p_date
      AND o.status != 'canceled'
      AND oi.status != 'canceled'
    GROUP BY oi.menu_item_id, mi.name_en
    ORDER BY total_quantity DESC
    LIMIT 1
  )
  SELECT 
    p_date,
    ds.order_count,
    ds.revenue,
    ds.avg_order_value,
    ti.menu_item_id,
    ti.name_en,
    ti.total_quantity
  FROM daily_stats ds
  LEFT JOIN top_item ti ON true;
END;
$function$;
-- END supabase/sql/10_branch_core/functions.sql

-- BEGIN supabase/sql/20_ordering_customer/functions.sql
-- 20_ordering_customer/functions.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE OR REPLACE FUNCTION public.get_active_orders_with_details(p_restaurant_id uuid)
 RETURNS SETOF orders
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Return all orders that are not completed, canceled, or draft
    -- The client will handle the relationship data fetching for order items
    RETURN QUERY
    SELECT *
    FROM orders
    WHERE orders.restaurant_id = p_restaurant_id
      AND orders.status NOT IN ('completed', 'canceled', 'draft')
    ORDER BY orders.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_order(p_restaurant_id uuid, p_table_id uuid, p_guest_count integer, p_items jsonb)
 RETURNS TABLE(order_id uuid, total_amount numeric, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_session_id uuid := gen_random_uuid();
  v_created_at timestamptz := now();
  v_item jsonb;
  v_menu_item_id uuid;
  v_menu_item_size_id uuid;
  v_quantity integer;
  v_notes text;
  v_topping_ids uuid[];
  v_base_price numeric(12,2);
  v_toppings_total numeric(12,2);
  v_unit_price numeric(12,2);
  v_order_total numeric(12,2) := 0;
BEGIN
  IF NOT public.can_access_restaurant_context(p_restaurant_id) THEN
    RAISE EXCEPTION 'Not authorized for restaurant %', p_restaurant_id;
  END IF;

  IF p_guest_count IS NULL OR p_guest_count <= 0 THEN
    RAISE EXCEPTION 'guest_count must be positive';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'order_items must be a non-empty JSON array';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM tables
    WHERE id = p_table_id
      AND restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'table does not belong to restaurant';
  END IF;

  INSERT INTO orders (
    id,
    restaurant_id,
    table_id,
    session_id,
    guest_count,
    status,
    total_amount,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    p_restaurant_id,
    p_table_id,
    v_session_id,
    p_guest_count,
    'new',
    0,
    v_created_at,
    v_created_at
  );

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;
    v_menu_item_size_id := NULLIF(v_item ->> 'menu_item_size_id', '')::uuid;
    v_quantity := COALESCE((v_item ->> 'quantity')::integer, 0);
    v_notes := NULLIF(v_item ->> 'notes', '');

    SELECT COALESCE(array_agg(value::uuid), ARRAY[]::uuid[])
    INTO v_topping_ids
    FROM jsonb_array_elements_text(COALESCE(v_item -> 'topping_ids', '[]'::jsonb));

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'quantity must be positive for all items';
    END IF;

    SELECT mi.price
    INTO v_base_price
    FROM menu_items mi
    WHERE mi.id = v_menu_item_id
      AND mi.restaurant_id = p_restaurant_id
      AND mi.available = true;

    IF v_base_price IS NULL THEN
      RAISE EXCEPTION 'menu item % is unavailable or does not belong to restaurant %', v_menu_item_id, p_restaurant_id;
    END IF;

    IF v_menu_item_size_id IS NOT NULL THEN
      SELECT mis.price
      INTO v_base_price
      FROM menu_item_sizes mis
      WHERE mis.id = v_menu_item_size_id
        AND mis.menu_item_id = v_menu_item_id
        AND mis.restaurant_id = p_restaurant_id;

      IF v_base_price IS NULL THEN
        RAISE EXCEPTION 'menu item size % is invalid for menu item %', v_menu_item_size_id, v_menu_item_id;
      END IF;
    END IF;

    SELECT COALESCE(SUM(t.price), 0)
    INTO v_toppings_total
    FROM toppings t
    WHERE t.restaurant_id = p_restaurant_id
      AND t.menu_item_id = v_menu_item_id
      AND (
        cardinality(v_topping_ids) = 0
        OR t.id = ANY (v_topping_ids)
      );

    v_unit_price := COALESCE(v_base_price, 0) + COALESCE(v_toppings_total, 0);
    v_order_total := v_order_total + (v_unit_price * v_quantity);

    INSERT INTO order_items (
      id,
      restaurant_id,
      order_id,
      menu_item_id,
      menu_item_size_id,
      quantity,
      notes,
      status,
      topping_ids,
      price_at_order,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_restaurant_id,
      v_order_id,
      v_menu_item_id,
      v_menu_item_size_id,
      v_quantity,
      v_notes,
      'new',
      COALESCE(v_topping_ids, ARRAY[]::uuid[]),
      v_unit_price,
      v_created_at,
      v_created_at
    );
  END LOOP;

  UPDATE orders
  SET total_amount = v_order_total,
      updated_at = now()
  WHERE id = v_order_id;

  RETURN QUERY
  SELECT v_order_id, v_order_total, v_created_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_item_counts_for_categories(p_category_ids uuid[])
 RETURNS TABLE(category_id uuid, item_count bigint)
 LANGUAGE sql
AS $function$
    SELECT
        mi.category_id,
        COUNT(mi.id) as item_count
    FROM
        menu_items mi
    WHERE
        mi.category_id = ANY(p_category_ids)
    GROUP BY
        mi.category_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_restaurant_homepage_data(restaurant_subdomain text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  restaurant_data json;
  owners_data json;
  gallery_data json;
  signature_dishes_data json;
  result json;
BEGIN
  -- Get restaurant basic info
  SELECT to_json(r.*) INTO restaurant_data
  FROM restaurants r
  WHERE r.subdomain = restaurant_subdomain;
  
  IF restaurant_data IS NULL THEN
    RETURN json_build_object('error', 'Restaurant not found');
  END IF;
  
  -- Get owners (users with role='owner')
  SELECT json_agg(
    json_build_object(
      'id', u.id,
      'name', u.name,
      'email', u.email,
      'photo_url', u.photo_url
    )
  ) INTO owners_data
  FROM users u
  WHERE u.restaurant_id = (restaurant_data->>'id')::uuid
    AND u.role = 'owner';
  
  -- Get gallery images
  SELECT json_agg(
    json_build_object(
      'id', g.id,
      'image_url', g.image_url,
      'caption', g.caption,
      'alt_text', g.alt_text,
      'sort_order', g.sort_order,
      'is_hero', g.is_hero
    ) ORDER BY g.sort_order
  ) INTO gallery_data
  FROM restaurant_gallery_images g
  WHERE g.restaurant_id = (restaurant_data->>'id')::uuid;
  
  -- Get signature dishes
  SELECT json_agg(
    json_build_object(
      'id', m.id,
      'name_en', m.name_en,
      'name_ja', m.name_ja,
      'name_vi', m.name_vi,
      'description_en', m.description_en,
      'description_ja', m.description_ja,
      'description_vi', m.description_vi,
      'price', m.price,
      'image_url', m.image_url,
      'category_name_en', c.name_en,
      'category_name_ja', c.name_ja,
      'category_name_vi', c.name_vi
    ) ORDER BY m.position
  ) INTO signature_dishes_data
  FROM menu_items m
  JOIN categories c ON m.category_id = c.id
  WHERE m.restaurant_id = (restaurant_data->>'id')::uuid
    AND m.is_signature = true
    AND m.available = true;
  
  -- Build final result
  result := json_build_object(
    'restaurant', restaurant_data,
    'owners', COALESCE(owners_data, '[]'::json),
    'gallery', COALESCE(gallery_data, '[]'::json),
    'signature_dishes', COALESCE(signature_dishes_data, '[]'::json)
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_table_status_on_order_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- When a new order is created, mark table as occupied
    IF TG_OP = 'INSERT' THEN
        UPDATE tables 
        SET status = 'occupied', 
            updated_at = now()
        WHERE id = NEW.table_id;
        RETURN NEW;
    END IF;
    
    -- When an order is completed or canceled, check if table should be available
    IF TG_OP = 'UPDATE' THEN
        -- If order status changed to completed or canceled
        IF OLD.status != NEW.status AND NEW.status IN ('completed', 'canceled') THEN
            -- Check if there are any other active orders for this table
            IF NOT EXISTS (
                SELECT 1 FROM orders 
                WHERE table_id = NEW.table_id 
                AND status IN ('new', 'serving') 
                AND id != NEW.id
            ) THEN
                -- No other active orders, mark table as available
                UPDATE tables 
                SET status = 'available', 
                    updated_at = now()
                WHERE id = NEW.table_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- When an order is deleted, check if table should be available
    IF TG_OP = 'DELETE' THEN
        -- Only update if the deleted order was active
        IF OLD.status IN ('new', 'serving') THEN
            -- Check if there are any other active orders for this table
            IF NOT EXISTS (
                SELECT 1 FROM orders 
                WHERE table_id = OLD.table_id 
                AND status IN ('new', 'serving')
            ) THEN
                -- No other active orders, mark table as available
                UPDATE tables 
                SET status = 'available', 
                    updated_at = now()
                WHERE id = OLD.table_id;
            END IF;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_status_on_item_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    order_record RECORD;
    all_items_ready BOOLEAN;
    all_items_served BOOLEAN;
    has_preparing_items BOOLEAN;
    has_canceled_items BOOLEAN;
    order_id_to_check UUID;
BEGIN
    -- Get the order_id from the trigger
    IF TG_OP = 'DELETE' THEN
        order_id_to_check := OLD.order_id;
    ELSE
        order_id_to_check := NEW.order_id;
    END IF;
    
    -- Get current order status
    SELECT status INTO order_record FROM orders WHERE id = order_id_to_check;
    
    -- Check the status of all items in this order
    SELECT 
        NOT EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status NOT IN ('ready', 'served', 'canceled')) as all_ready,
        NOT EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status != 'served') as all_served,
        EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status = 'preparing') as has_preparing,
        EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status = 'canceled') as has_canceled
    INTO all_items_ready, all_items_served, has_preparing_items, has_canceled_items;
    
    -- Update order status based on item statuses
    IF has_preparing_items OR all_items_ready THEN
        -- Some items are preparing or ready, mark order as serving
        UPDATE orders 
        SET status = 'serving', 
            updated_at = now()
        WHERE id = order_id_to_check AND status = 'new';
    END IF;
    
    -- Check if all items are canceled (order should be canceled)
    IF NOT EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status != 'canceled') THEN
        UPDATE orders 
        SET status = 'canceled', 
            updated_at = now()
        WHERE id = order_id_to_check AND status NOT IN ('completed', 'canceled');
    END IF;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_total_amount()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    order_id_to_update UUID;
    new_total NUMERIC;
BEGIN
    -- Get the order_id from the trigger
    IF TG_OP = 'DELETE' THEN
        order_id_to_update := OLD.order_id;
    ELSE
        order_id_to_update := NEW.order_id;
    END IF;
    
    -- Calculate new total amount (excluding canceled items)
    SELECT COALESCE(SUM(price_at_order * quantity), 0)
    INTO new_total
    FROM order_items 
    WHERE order_id = order_id_to_update 
    AND status != 'canceled';
    
    -- Update the order total
    UPDATE orders 
    SET total_amount = new_total,
        updated_at = now()
    WHERE id = order_id_to_update;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;
-- END supabase/sql/20_ordering_customer/functions.sql

-- BEGIN supabase/sql/40_people_attendance/functions.sql
-- 40_people_attendance/functions.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE OR REPLACE FUNCTION public.update_attendance_records_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
-- END supabase/sql/40_people_attendance/functions.sql

-- BEGIN supabase/sql/10_branch_core/keys.sql
-- 10_branch_core/keys.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_logs
    ADD CONSTRAINT chat_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.menu_item_sizes
    ADD CONSTRAINT menu_item_sizes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_code_key UNIQUE (code);

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_session_id_key UNIQUE (session_id);

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_email_key UNIQUE (email);

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_subdomain_key UNIQUE (subdomain);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_qr_code_key UNIQUE (qr_code);

ALTER TABLE ONLY public.toppings
    ADD CONSTRAINT toppings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX idx_analytics_restaurant_date ON public.analytics_snapshots USING btree (restaurant_id, date);

CREATE INDEX idx_analytics_restaurant_date_range ON public.analytics_snapshots USING btree (restaurant_id, date);

CREATE INDEX idx_bookings_restaurant_date ON public.bookings USING btree (restaurant_id, booking_date);

CREATE INDEX idx_categories_restaurant_org_menu_category ON public.categories USING btree (restaurant_id, organization_menu_category_id);

CREATE UNIQUE INDEX idx_categories_restaurant_position ON public.categories USING btree (restaurant_id, "position");

CREATE INDEX idx_chat_logs_restaurant_created ON public.chat_logs USING btree (restaurant_id, created_at);

CREATE INDEX idx_employees_is_active ON public.employees USING btree (restaurant_id, is_active);

CREATE INDEX idx_employees_restaurant_role ON public.employees USING btree (restaurant_id, role);

CREATE INDEX idx_feedback_restaurant ON public.feedback USING btree (restaurant_id);

CREATE INDEX idx_inventory_low_stock ON public.inventory_items USING btree (restaurant_id, stock_level, threshold) WHERE (stock_level <= threshold);

CREATE INDEX idx_inventory_restaurant_stock ON public.inventory_items USING btree (restaurant_id, stock_level);

CREATE INDEX idx_logs_restaurant_created ON public.logs USING btree (restaurant_id, created_at);

CREATE INDEX idx_logs_restaurant_level_time ON public.logs USING btree (restaurant_id, level, created_at DESC);

CREATE INDEX idx_logs_user_created ON public.logs USING btree (user_id, created_at);

CREATE INDEX idx_menu_item_sizes_item_size ON public.menu_item_sizes USING btree (menu_item_id, size_key);

CREATE INDEX idx_menu_item_sizes_menu_item ON public.menu_item_sizes USING btree (menu_item_id, restaurant_id);

COMMENT ON INDEX public.idx_menu_item_sizes_menu_item IS 'Optimizes price lookups during order creation and menu display';

CREATE INDEX idx_menu_item_sizes_restaurant_item ON public.menu_item_sizes USING btree (restaurant_id, menu_item_id);

CREATE INDEX idx_menu_items_category_code ON public.menu_items USING btree (category_id, code);

CREATE INDEX idx_menu_items_category_position ON public.menu_items USING btree (category_id, "position", restaurant_id);

CREATE INDEX idx_menu_items_restaurant_available ON public.menu_items USING btree (restaurant_id, available);

CREATE INDEX idx_menu_items_restaurant_category ON public.menu_items USING btree (restaurant_id, category_id);

CREATE INDEX idx_menu_items_restaurant_org_menu_item ON public.menu_items USING btree (restaurant_id, organization_menu_item_id);

CREATE INDEX idx_menu_items_signature ON public.menu_items USING btree (restaurant_id, is_signature) WHERE (is_signature = true);

CREATE INDEX idx_order_items_menu_item_created ON public.order_items USING btree (menu_item_id, created_at DESC);

CREATE INDEX idx_order_items_menu_item_size ON public.order_items USING btree (menu_item_size_id);

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);

CREATE INDEX idx_order_items_order_status ON public.order_items USING btree (order_id, status);

CREATE INDEX idx_order_items_orders_reporting ON public.order_items USING btree (restaurant_id, created_at DESC);

CREATE INDEX idx_order_items_restaurant_menu_item ON public.order_items USING btree (restaurant_id, menu_item_id);

COMMENT ON INDEX public.idx_order_items_restaurant_menu_item IS 'Optimizes popular items analysis and menu item performance queries';

CREATE INDEX idx_order_items_restaurant_price ON public.order_items USING btree (restaurant_id, price_at_order);

CREATE INDEX idx_order_items_restaurant_status ON public.order_items USING btree (restaurant_id, status);

CREATE INDEX idx_order_items_topping_ids ON public.order_items USING gin (topping_ids);

CREATE INDEX idx_orders_completed_date ON public.orders USING btree (restaurant_id, created_at DESC) WHERE (status = 'completed'::text);

CREATE INDEX idx_orders_restaurant_created ON public.orders USING btree (restaurant_id, created_at DESC);

CREATE INDEX idx_orders_restaurant_status ON public.orders USING btree (restaurant_id, status);

CREATE INDEX idx_orders_restaurant_status_created ON public.orders USING btree (restaurant_id, status, created_at DESC) WHERE (status = ANY (ARRAY['new'::text, 'confirmed'::text, 'preparing'::text, 'ready'::text, 'serving'::text, 'completed'::text, 'canceled'::text]));

COMMENT ON INDEX public.idx_orders_restaurant_status_created IS 'Optimizes dashboard queries filtering by restaurant, status, and ordering by creation date';

CREATE UNIQUE INDEX idx_restaurants_branch_code_unique ON public.restaurants USING btree (branch_code);

CREATE INDEX idx_restaurants_is_verified ON public.restaurants USING btree (is_verified) WHERE (is_verified = false);

CREATE INDEX idx_restaurants_onboarded ON public.restaurants USING btree (onboarded);

CREATE INDEX idx_restaurants_subdomain ON public.restaurants USING btree (subdomain) WHERE (subdomain IS NOT NULL);

CREATE INDEX idx_restaurants_suspended ON public.restaurants USING btree (suspended_at) WHERE (suspended_at IS NOT NULL);

CREATE INDEX idx_restaurants_verified_at ON public.restaurants USING btree (verified_at);

CREATE INDEX idx_reviews_restaurant_menu_item ON public.reviews USING btree (restaurant_id, menu_item_id);

CREATE INDEX idx_schedules_employee_weekday ON public.schedules USING btree (employee_id, weekday);

CREATE INDEX idx_tables_qr_created_at ON public.tables USING btree (qr_code_created_at) WHERE (qr_code_created_at IS NOT NULL);

CREATE INDEX idx_tables_restaurant ON public.tables USING btree (restaurant_id);

CREATE INDEX idx_tables_restaurant_id ON public.tables USING btree (restaurant_id, id);

CREATE INDEX idx_toppings_menu_item ON public.toppings USING btree (menu_item_id);

COMMENT ON INDEX public.idx_toppings_menu_item IS 'Optimizes topping lookups during order creation and menu display';

CREATE INDEX idx_toppings_restaurant_ids ON public.toppings USING btree (restaurant_id, id);

CREATE INDEX idx_toppings_restaurant_position ON public.toppings USING btree (restaurant_id, "position");

CREATE INDEX idx_users_restaurant_id ON public.users USING btree (restaurant_id);

CREATE INDEX idx_users_restaurant_role ON public.users USING btree (restaurant_id, role);

CREATE UNIQUE INDEX uq_categories_restaurant_org_menu_category ON public.categories USING btree (restaurant_id, organization_menu_category_id) WHERE (organization_menu_category_id IS NOT NULL);

CREATE UNIQUE INDEX uq_menu_items_restaurant_org_menu_item ON public.menu_items USING btree (restaurant_id, organization_menu_item_id) WHERE (organization_menu_item_id IS NOT NULL);
-- END supabase/sql/10_branch_core/keys.sql

-- BEGIN supabase/sql/30_founder_control/keys.sql
-- 30_founder_control/keys.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_member_id_permission_key UNIQUE (member_id, permission);

ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_member_id_restaurant_id_key UNIQUE (member_id, restaurant_id);

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_menu_categories
    ADD CONSTRAINT organization_menu_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_menu_items
    ADD CONSTRAINT organization_menu_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_invite_token_key UNIQUE (invite_token);

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_organization_id_restaurant_id_key UNIQUE (organization_id, restaurant_id);

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_restaurant_id_key UNIQUE (restaurant_id);

ALTER TABLE ONLY public.owner_organizations
    ADD CONSTRAINT owner_organizations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.owner_organizations
    ADD CONSTRAINT owner_organizations_slug_key UNIQUE (slug);

CREATE INDEX idx_org_member_permissions_member_id ON public.organization_member_permissions USING btree (member_id);

CREATE INDEX idx_org_member_shop_scopes_member_id ON public.organization_member_shop_scopes USING btree (member_id);

CREATE INDEX idx_org_members_org_id ON public.organization_members USING btree (organization_id);

CREATE INDEX idx_org_members_user_id ON public.organization_members USING btree (user_id);

CREATE INDEX idx_org_restaurants_org_id ON public.organization_restaurants USING btree (organization_id);

CREATE INDEX idx_org_restaurants_restaurant_id ON public.organization_restaurants USING btree (restaurant_id);

CREATE INDEX idx_organization_menu_categories_org_position ON public.organization_menu_categories USING btree (organization_id, "position");

CREATE INDEX idx_organization_menu_items_org_category_position ON public.organization_menu_items USING btree (organization_id, category_id, "position");

CREATE INDEX idx_owner_organizations_created_by ON public.owner_organizations USING btree (created_by);

CREATE UNIQUE INDEX idx_owner_organizations_public_subdomain_unique ON public.owner_organizations USING btree (public_subdomain);

CREATE INDEX idx_pending_invites_email ON public.organization_pending_invites USING btree (email);

CREATE INDEX idx_pending_invites_is_active ON public.organization_pending_invites USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_pending_invites_org_id ON public.organization_pending_invites USING btree (organization_id);

CREATE INDEX idx_pending_invites_token ON public.organization_pending_invites USING btree (invite_token);
-- END supabase/sql/30_founder_control/keys.sql

-- BEGIN supabase/sql/50_finance_billing/keys.sql
-- 50_finance_billing/keys.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.monthly_finance_snapshots
    ADD CONSTRAINT monthly_finance_snapshots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.monthly_finance_snapshots
    ADD CONSTRAINT monthly_finance_snapshots_restaurant_id_year_month_key UNIQUE (restaurant_id, year, month);

ALTER TABLE ONLY public.organization_finance_expenses
    ADD CONSTRAINT organization_finance_expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subscription_receipts
    ADD CONSTRAINT subscription_receipts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subscription_receipts
    ADD CONSTRAINT subscription_receipts_receipt_number_key UNIQUE (receipt_number);

ALTER TABLE ONLY public.subscription_receipts
    ADD CONSTRAINT subscription_receipts_subscription_id_period_start_period_e_key UNIQUE (subscription_id, period_start, period_end);

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_restaurant_id_key UNIQUE (restaurant_id);

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);

CREATE INDEX idx_expenses_expense_date ON public.expenses USING btree (expense_date);

CREATE INDEX idx_expenses_restaurant_id ON public.expenses USING btree (restaurant_id);

CREATE INDEX idx_monthly_finance_snapshots_restaurant_period ON public.monthly_finance_snapshots USING btree (restaurant_id, year DESC, month DESC);

CREATE INDEX idx_org_finance_expenses_category ON public.organization_finance_expenses USING btree (organization_id, category);

CREATE INDEX idx_org_finance_expenses_org_date ON public.organization_finance_expenses USING btree (organization_id, expense_date DESC);

CREATE INDEX idx_poi_purchase_order_id ON public.purchase_order_items USING btree (purchase_order_id);

CREATE INDEX idx_poi_restaurant_id ON public.purchase_order_items USING btree (restaurant_id);

CREATE INDEX idx_purchase_orders_order_date ON public.purchase_orders USING btree (order_date);

CREATE INDEX idx_purchase_orders_restaurant_id ON public.purchase_orders USING btree (restaurant_id);

CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status);

CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders USING btree (supplier_id);

CREATE INDEX idx_subscription_plans_active ON public.subscription_plans USING btree (is_active, sort_order);

CREATE INDEX idx_subscription_receipts_organization_id ON public.subscription_receipts USING btree (organization_id, issued_at DESC);

CREATE INDEX idx_subscription_receipts_restaurant_id ON public.subscription_receipts USING btree (restaurant_id, issued_at DESC);

CREATE INDEX idx_subscription_receipts_subscription_id ON public.subscription_receipts USING btree (subscription_id, period_start DESC);

CREATE INDEX idx_suppliers_is_active ON public.suppliers USING btree (is_active);

CREATE INDEX idx_suppliers_restaurant_id ON public.suppliers USING btree (restaurant_id);

CREATE INDEX idx_tenant_subscriptions_external_id ON public.tenant_subscriptions USING btree (external_subscription_id) WHERE (external_subscription_id IS NOT NULL);

CREATE INDEX idx_tenant_subscriptions_period_end ON public.tenant_subscriptions USING btree (current_period_end);

CREATE INDEX idx_tenant_subscriptions_restaurant_id ON public.tenant_subscriptions USING btree (restaurant_id);

CREATE INDEX idx_tenant_subscriptions_status ON public.tenant_subscriptions USING btree (status);

CREATE INDEX idx_tenant_subscriptions_trial_ends_at ON public.tenant_subscriptions USING btree (trial_ends_at) WHERE (status = 'trial'::text);
-- END supabase/sql/50_finance_billing/keys.sql

-- BEGIN supabase/sql/40_people_attendance/keys.sql
-- 40_people_attendance/keys.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_employee_id_work_date_key UNIQUE (employee_id, work_date);

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_work_date_key UNIQUE (employee_id, work_date);

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_token_key UNIQUE (token);

ALTER TABLE ONLY public.restaurant_role_pay_rates
    ADD CONSTRAINT restaurant_role_pay_rates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.restaurant_role_pay_rates
    ADD CONSTRAINT restaurant_role_pay_rates_restaurant_id_job_title_key UNIQUE (restaurant_id, job_title);

CREATE INDEX idx_aa_acted_by ON public.attendance_approvals USING btree (acted_by);

CREATE INDEX idx_aa_restaurant_date ON public.attendance_approvals USING btree (restaurant_id, work_date);

CREATE INDEX idx_aa_summary_id ON public.attendance_approvals USING btree (summary_id);

CREATE INDEX idx_ads_employee_work_date ON public.attendance_daily_summaries USING btree (employee_id, work_date);

CREATE INDEX idx_ads_restaurant_status ON public.attendance_daily_summaries USING btree (restaurant_id, status);

CREATE INDEX idx_ads_work_date ON public.attendance_daily_summaries USING btree (work_date);

CREATE INDEX idx_ae_employee_work_date ON public.attendance_events USING btree (employee_id, work_date);

CREATE INDEX idx_ae_restaurant_id ON public.attendance_events USING btree (restaurant_id);

CREATE INDEX idx_ae_work_date ON public.attendance_events USING btree (work_date);

CREATE INDEX idx_attendance_records_employee_work_date ON public.attendance_records USING btree (employee_id, work_date DESC);

CREATE INDEX idx_attendance_records_restaurant_work_date ON public.attendance_records USING btree (restaurant_id, work_date DESC);

CREATE INDEX idx_eqr_employee_id ON public.employee_qr_credentials USING btree (employee_id);

CREATE INDEX idx_eqr_restaurant_id ON public.employee_qr_credentials USING btree (restaurant_id);

CREATE INDEX idx_eqr_token_active ON public.employee_qr_credentials USING btree (token) WHERE (is_active = true);

CREATE INDEX idx_restaurant_role_pay_rates_restaurant ON public.restaurant_role_pay_rates USING btree (restaurant_id);
-- END supabase/sql/40_people_attendance/keys.sql

-- BEGIN supabase/sql/60_platform_admin_support/keys.sql
-- 60_platform_admin_support/keys.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER SEQUENCE public.support_tickets_ticket_number_seq OWNED BY public.support_tickets.ticket_number;

ALTER TABLE ONLY public.support_tickets ALTER COLUMN ticket_number SET DEFAULT nextval('public.support_tickets_ticket_number_seq'::regclass);

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_email_key UNIQUE (email);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.platform_audit_logs
    ADD CONSTRAINT platform_audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sla_config
    ADD CONSTRAINT sla_config_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sla_config
    ADD CONSTRAINT sla_config_ticket_priority_key UNIQUE (ticket_priority);

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_number_key UNIQUE (ticket_number);

ALTER TABLE ONLY public.tenant_usage_snapshots
    ADD CONSTRAINT tenant_usage_snapshots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant_usage_snapshots
    ADD CONSTRAINT tenant_usage_snapshots_restaurant_id_snapshot_date_key UNIQUE (restaurant_id, snapshot_date);

CREATE INDEX idx_email_notifications_pending ON public.email_notifications USING btree (status, created_at) WHERE (status = 'pending'::text);

CREATE INDEX idx_platform_admins_email ON public.platform_admins USING btree (email) WHERE (is_active = true);

CREATE INDEX idx_platform_admins_user_id ON public.platform_admins USING btree (user_id) WHERE (is_active = true);

CREATE INDEX idx_platform_audit_logs_action ON public.platform_audit_logs USING btree (action);

CREATE INDEX idx_platform_audit_logs_admin_id ON public.platform_audit_logs USING btree (admin_id, created_at DESC);

CREATE INDEX idx_platform_audit_logs_created_at ON public.platform_audit_logs USING btree (created_at DESC);

CREATE INDEX idx_platform_audit_logs_resource ON public.platform_audit_logs USING btree (resource_type, resource_id);

CREATE INDEX idx_platform_audit_logs_restaurant_id ON public.platform_audit_logs USING btree (restaurant_id, created_at DESC);

CREATE INDEX idx_support_ticket_messages_posted_by ON public.support_ticket_messages USING btree (posted_by);

CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages USING btree (ticket_id, created_at);

CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);

CREATE INDEX idx_support_tickets_category ON public.support_tickets USING btree (category);

CREATE INDEX idx_support_tickets_created_at ON public.support_tickets USING btree (created_at DESC);

CREATE INDEX idx_support_tickets_priority ON public.support_tickets USING btree (priority);

CREATE INDEX idx_support_tickets_restaurant_id ON public.support_tickets USING btree (restaurant_id);

CREATE INDEX idx_support_tickets_sla_breach ON public.support_tickets USING btree (resolution_sla_breach, status) WHERE (status <> ALL (ARRAY['resolved'::text, 'closed'::text]));

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);

CREATE INDEX idx_tenant_usage_snapshots_date ON public.tenant_usage_snapshots USING btree (snapshot_date DESC);

CREATE INDEX idx_tenant_usage_snapshots_restaurant_date ON public.tenant_usage_snapshots USING btree (restaurant_id, snapshot_date DESC);
-- END supabase/sql/60_platform_admin_support/keys.sql

-- BEGIN supabase/sql/20_ordering_customer/keys.sql
-- 20_ordering_customer/keys.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_restaurant_id_code_key UNIQUE (restaurant_id, code);

ALTER TABLE ONLY public.restaurant_gallery_images
    ADD CONSTRAINT restaurant_gallery_images_pkey PRIMARY KEY (id);

CREATE INDEX idx_gallery_hero ON public.restaurant_gallery_images USING btree (restaurant_id, is_hero);

CREATE INDEX idx_gallery_restaurant_id ON public.restaurant_gallery_images USING btree (restaurant_id);

CREATE INDEX idx_gallery_sort_order ON public.restaurant_gallery_images USING btree (restaurant_id, sort_order);

CREATE INDEX idx_order_discounts_applied_at ON public.order_discounts USING btree (applied_at);

CREATE INDEX idx_order_discounts_order_id ON public.order_discounts USING btree (order_id);

CREATE INDEX idx_order_discounts_promotion_id ON public.order_discounts USING btree (promotion_id);

CREATE INDEX idx_order_discounts_restaurant_id ON public.order_discounts USING btree (restaurant_id);

CREATE UNIQUE INDEX idx_order_discounts_unique_order ON public.order_discounts USING btree (order_id);

CREATE INDEX idx_promotions_code ON public.promotions USING btree (code);

CREATE INDEX idx_promotions_is_active ON public.promotions USING btree (is_active);

CREATE INDEX idx_promotions_restaurant_id ON public.promotions USING btree (restaurant_id);

CREATE INDEX idx_promotions_valid_until ON public.promotions USING btree (valid_until);
-- END supabase/sql/20_ordering_customer/keys.sql

-- BEGIN supabase/sql/30_founder_control/relations.sql
-- 30_founder_control/relations.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.organization_members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.organization_members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_menu_categories
    ADD CONSTRAINT organization_menu_categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_menu_items
    ADD CONSTRAINT organization_menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.organization_menu_categories(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_menu_items
    ADD CONSTRAINT organization_menu_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_accepted_by_user_id_fkey FOREIGN KEY (accepted_by_user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.owner_organizations
    ADD CONSTRAINT owner_organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
-- END supabase/sql/30_founder_control/relations.sql

-- BEGIN supabase/sql/60_platform_admin_support/relations.sql
-- 60_platform_admin_support/relations.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.platform_audit_logs
    ADD CONSTRAINT platform_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id);

ALTER TABLE ONLY public.platform_audit_logs
    ADD CONSTRAINT platform_audit_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.platform_admins(id);

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.tenant_usage_snapshots
    ADD CONSTRAINT tenant_usage_snapshots_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
-- END supabase/sql/60_platform_admin_support/relations.sql

-- BEGIN supabase/sql/10_branch_core/relations.sql
-- 10_branch_core/relations.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_top_seller_item_fkey FOREIGN KEY (top_seller_item) REFERENCES public.menu_items(id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_organization_menu_category_id_fkey FOREIGN KEY (organization_menu_category_id) REFERENCES public.organization_menu_categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_logs
    ADD CONSTRAINT chat_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_logs
    ADD CONSTRAINT chat_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.menu_item_sizes
    ADD CONSTRAINT menu_item_sizes_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.menu_item_sizes
    ADD CONSTRAINT menu_item_sizes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_organization_menu_item_id_fkey FOREIGN KEY (organization_menu_item_id) REFERENCES public.organization_menu_items(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_size_id_fkey FOREIGN KEY (menu_item_size_id) REFERENCES public.menu_item_sizes(id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES public.platform_admins(id);

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.platform_admins(id);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.toppings
    ADD CONSTRAINT toppings_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.toppings
    ADD CONSTRAINT toppings_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
-- END supabase/sql/10_branch_core/relations.sql

-- BEGIN supabase/sql/50_finance_billing/relations.sql
-- 50_finance_billing/relations.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.monthly_finance_snapshots
    ADD CONSTRAINT monthly_finance_snapshots_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.monthly_finance_snapshots
    ADD CONSTRAINT monthly_finance_snapshots_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_finance_expenses
    ADD CONSTRAINT organization_finance_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_finance_expenses
    ADD CONSTRAINT organization_finance_expenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.subscription_receipts
    ADD CONSTRAINT subscription_receipts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subscription_receipts
    ADD CONSTRAINT subscription_receipts_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);

ALTER TABLE ONLY public.subscription_receipts
    ADD CONSTRAINT subscription_receipts_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subscription_receipts
    ADD CONSTRAINT subscription_receipts_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_canceled_by_fkey FOREIGN KEY (canceled_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
-- END supabase/sql/50_finance_billing/relations.sql

-- BEGIN supabase/sql/40_people_attendance/relations.sql
-- 40_people_attendance/relations.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_acted_by_fkey FOREIGN KEY (acted_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_summary_id_fkey FOREIGN KEY (summary_id) REFERENCES public.attendance_daily_summaries(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES public.employee_qr_credentials(id);

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_rotated_by_fkey FOREIGN KEY (rotated_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.restaurant_role_pay_rates
    ADD CONSTRAINT restaurant_role_pay_rates_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.restaurant_role_pay_rates
    ADD CONSTRAINT restaurant_role_pay_rates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
-- END supabase/sql/40_people_attendance/relations.sql

-- BEGIN supabase/sql/20_ordering_customer/relations.sql
-- 20_ordering_customer/relations.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.restaurant_gallery_images
    ADD CONSTRAINT restaurant_gallery_images_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
-- END supabase/sql/20_ordering_customer/relations.sql

-- BEGIN supabase/sql/10_branch_core/policies.sql
-- 10_branch_core/policies.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE POLICY "Anonymous can INSERT bookings" ON public.bookings FOR INSERT TO anon WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can INSERT chat_logs" ON public.chat_logs FOR INSERT TO anon WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can INSERT feedback" ON public.feedback FOR INSERT TO anon WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can INSERT order_items" ON public.order_items FOR INSERT TO anon WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can INSERT orders" ON public.orders FOR INSERT TO anon WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can INSERT reviews" ON public.reviews FOR INSERT TO anon WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can SELECT categories" ON public.categories FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can SELECT menu_item_sizes" ON public.menu_item_sizes FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can SELECT menu_items" ON public.menu_items FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can SELECT order_items" ON public.order_items FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can SELECT orders" ON public.orders FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can SELECT reviews" ON public.reviews FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can SELECT tables" ON public.tables FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can SELECT toppings" ON public.toppings FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can UPDATE order_items" ON public.order_items FOR UPDATE TO anon USING ((restaurant_id = public.get_request_restaurant_id())) WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Anonymous can UPDATE orders" ON public.orders FOR UPDATE TO anon USING ((restaurant_id = public.get_request_restaurant_id())) WITH CHECK ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Authenticated can INSERT chat_logs" ON public.chat_logs FOR INSERT TO authenticated WITH CHECK ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT analytics_snapshots" ON public.analytics_snapshots FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT bookings" ON public.bookings FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT categories" ON public.categories FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT chat_logs" ON public.chat_logs FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT employees" ON public.employees FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT feedback" ON public.feedback FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT inventory_items" ON public.inventory_items FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT logs" ON public.logs FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT menu_item_sizes" ON public.menu_item_sizes FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT menu_items" ON public.menu_items FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT order_items" ON public.order_items FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT orders" ON public.orders FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT reviews" ON public.reviews FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT schedules" ON public.schedules FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT tables" ON public.tables FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can SELECT toppings" ON public.toppings FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Authenticated users can see own restaurant" ON public.restaurants FOR SELECT TO authenticated USING ((id = public.get_user_restaurant_id()));

CREATE POLICY "Managers can manage analytics_snapshots" ON public.analytics_snapshots TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Managers can manage employees" ON public.employees TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Managers can manage schedules" ON public.schedules TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Owners and managers can create users" ON public.users FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Restaurant owners can update own restaurant" ON public.restaurants FOR UPDATE TO authenticated USING (((id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(id, ARRAY['owner'::text])));

CREATE POLICY "Restrict audit logs" ON public.audit_logs FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Staff can DELETE bookings" ON public.bookings FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE categories" ON public.categories FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE feedback" ON public.feedback FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE inventory_items" ON public.inventory_items FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE menu_item_sizes" ON public.menu_item_sizes FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can DELETE menu_items" ON public.menu_items FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can DELETE order_items" ON public.order_items FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE orders" ON public.orders FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE reviews" ON public.reviews FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE tables" ON public.tables FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE toppings" ON public.toppings FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can INSERT bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text])));

CREATE POLICY "Staff can INSERT categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT inventory_items" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT menu_item_sizes" ON public.menu_item_sizes FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can INSERT menu_items" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can INSERT order_items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text])));

CREATE POLICY "Staff can INSERT orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text])));

CREATE POLICY "Staff can INSERT reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT tables" ON public.tables FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT toppings" ON public.toppings FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can UPDATE bookings" ON public.bookings FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text])));

CREATE POLICY "Staff can UPDATE categories" ON public.categories FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can UPDATE feedback" ON public.feedback FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can UPDATE inventory_items" ON public.inventory_items FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can UPDATE menu_item_sizes" ON public.menu_item_sizes FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can UPDATE menu_items" ON public.menu_items FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can UPDATE order_items" ON public.order_items FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text])));

CREATE POLICY "Staff can UPDATE orders" ON public.orders FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text])));

CREATE POLICY "Staff can UPDATE reviews" ON public.reviews FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can UPDATE tables" ON public.tables FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can UPDATE toppings" ON public.toppings FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "System can INSERT logs" ON public.logs FOR INSERT TO authenticated WITH CHECK ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Tenant can INSERT audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Tenant can UPDATE audit logs" ON public.audit_logs FOR UPDATE TO authenticated USING ((restaurant_id = public.get_user_restaurant_id())) WITH CHECK ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Users can see restaurant colleagues" ON public.users FOR SELECT TO authenticated USING ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING ((id = auth.uid()));

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_platform_admin_read ON public.categories FOR SELECT USING (public.is_platform_admin());

ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_platform_admin_read ON public.feedback FOR SELECT USING (public.is_platform_admin());

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY logs_platform_admin_read ON public.logs FOR SELECT USING (public.is_platform_admin());

ALTER TABLE public.menu_item_sizes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_items_platform_admin_read ON public.menu_items FOR SELECT USING (public.is_platform_admin());

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_items_platform_admin_read ON public.order_items FOR SELECT USING (public.is_platform_admin());

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_platform_admin_read ON public.orders FOR SELECT USING (public.is_platform_admin());

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY restaurants_platform_admin_read ON public.restaurants FOR SELECT USING (public.is_platform_admin());

CREATE POLICY restaurants_platform_admin_update ON public.restaurants FOR UPDATE USING (public.is_platform_admin());

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_platform_admin_read ON public.users FOR SELECT USING (public.is_platform_admin());
-- END supabase/sql/10_branch_core/policies.sql

-- BEGIN supabase/sql/30_founder_control/policies.sql
-- 30_founder_control/policies.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE POLICY "Org founders can add restaurants to their organization" ON public.organization_restaurants FOR INSERT WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can create pending invites" ON public.organization_pending_invites FOR INSERT WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can delete members" ON public.organization_members FOR DELETE USING (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can insert members" ON public.organization_members FOR INSERT WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can manage permissions" ON public.organization_member_permissions USING (public.is_org_founder(organization_id)) WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can manage shop scopes" ON public.organization_member_shop_scopes USING (public.is_org_founder(organization_id)) WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can remove restaurants from their organization" ON public.organization_restaurants FOR DELETE USING (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can revoke pending invites" ON public.organization_pending_invites FOR UPDATE USING (public.is_org_founder(organization_id)) WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can update members" ON public.organization_members FOR UPDATE USING (public.is_org_founder(organization_id)) WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can update their organization" ON public.owner_organizations FOR UPDATE USING (public.is_org_founder(id)) WITH CHECK (public.is_org_founder(id));

CREATE POLICY "Org members can view members of their organization" ON public.organization_members FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view pending invites" ON public.organization_pending_invites FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view permissions in their organization" ON public.organization_member_permissions FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view restaurants in their organization" ON public.organization_restaurants FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view shop scopes in their organization" ON public.organization_member_shop_scopes FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view their organization" ON public.owner_organizations FOR SELECT USING (public.is_org_member(id));

ALTER TABLE public.organization_member_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_member_shop_scopes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_pending_invites ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_restaurants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.owner_organizations ENABLE ROW LEVEL SECURITY;
-- END supabase/sql/30_founder_control/policies.sql

-- BEGIN supabase/sql/50_finance_billing/policies.sql
-- 50_finance_billing/policies.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE POLICY "Org founders can delete organization finance expenses" ON public.organization_finance_expenses FOR DELETE USING (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can insert organization finance expenses" ON public.organization_finance_expenses FOR INSERT WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can update organization finance expenses" ON public.organization_finance_expenses FOR UPDATE USING (public.is_org_founder(organization_id)) WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org members can view organization finance expenses" ON public.organization_finance_expenses FOR SELECT USING (public.is_org_member(organization_id));

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_delete ON public.expenses FOR DELETE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY expenses_insert ON public.expenses FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY expenses_select ON public.expenses FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY expenses_update ON public.expenses FOR UPDATE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY finance_snapshots_read ON public.monthly_finance_snapshots FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY finance_snapshots_update ON public.monthly_finance_snapshots FOR UPDATE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY finance_snapshots_write ON public.monthly_finance_snapshots FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.monthly_finance_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_finance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY poi_delete ON public.purchase_order_items FOR DELETE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY poi_insert ON public.purchase_order_items FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY poi_select ON public.purchase_order_items FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY poi_update ON public.purchase_order_items FOR UPDATE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_orders_delete ON public.purchase_orders FOR DELETE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY purchase_orders_insert ON public.purchase_orders FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY purchase_orders_select ON public.purchase_orders FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY purchase_orders_update ON public.purchase_orders FOR UPDATE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.subscription_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_receipts_platform_admin_insert ON public.subscription_receipts FOR INSERT WITH CHECK (public.is_platform_admin());

CREATE POLICY subscription_receipts_platform_admin_read ON public.subscription_receipts FOR SELECT USING (public.is_platform_admin());

CREATE POLICY subscription_receipts_platform_admin_update ON public.subscription_receipts FOR UPDATE USING (public.is_platform_admin());

CREATE POLICY subscription_receipts_restaurant_read ON public.subscription_receipts FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_delete ON public.suppliers FOR DELETE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY suppliers_insert ON public.suppliers FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY suppliers_select ON public.suppliers FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY suppliers_update ON public.suppliers FOR UPDATE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_subscriptions_platform_admin_insert ON public.tenant_subscriptions FOR INSERT WITH CHECK (public.is_platform_admin());

CREATE POLICY tenant_subscriptions_platform_admin_read ON public.tenant_subscriptions FOR SELECT USING (public.is_platform_admin());

CREATE POLICY tenant_subscriptions_platform_admin_update ON public.tenant_subscriptions FOR UPDATE USING (public.is_platform_admin());

CREATE POLICY tenant_subscriptions_restaurant_read ON public.tenant_subscriptions FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));
-- END supabase/sql/50_finance_billing/policies.sql

-- BEGIN supabase/sql/40_people_attendance/policies.sql
-- 40_people_attendance/policies.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE POLICY "Employee can SELECT their own attendance events" ON public.attendance_events FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));

CREATE POLICY "Employee can SELECT their own attendance_records" ON public.attendance_records FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));

CREATE POLICY "Employee can SELECT their own daily summaries" ON public.attendance_daily_summaries FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));

CREATE POLICY "Tenant can INSERT attendance_events" ON public.attendance_events FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can SELECT attendance_events" ON public.attendance_events FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can manage attendance_approvals" ON public.attendance_approvals USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can manage attendance_daily_summaries" ON public.attendance_daily_summaries USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can manage attendance_records" ON public.attendance_records USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can manage employee_qr_credentials" ON public.employee_qr_credentials USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.attendance_approvals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_daily_summaries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employee_qr_credentials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.restaurant_role_pay_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_pay_rates_read ON public.restaurant_role_pay_rates FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY role_pay_rates_update ON public.restaurant_role_pay_rates FOR UPDATE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY role_pay_rates_write ON public.restaurant_role_pay_rates FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));
-- END supabase/sql/40_people_attendance/policies.sql

-- BEGIN supabase/sql/60_platform_admin_support/policies.sql
-- 60_platform_admin_support/policies.sql
-- Canonical baseline generated from the verified local Supabase state.


ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_admins_insert_policy ON public.platform_admins FOR INSERT WITH CHECK (public.check_is_platform_admin());

CREATE POLICY platform_admins_read_policy ON public.platform_admins FOR SELECT USING (public.check_is_platform_admin());

CREATE POLICY platform_admins_update_policy ON public.platform_admins FOR UPDATE USING (public.check_is_platform_admin());

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_audit_logs_insert ON public.platform_audit_logs FOR INSERT WITH CHECK (public.is_platform_admin());

CREATE POLICY platform_audit_logs_read ON public.platform_audit_logs FOR SELECT USING (public.is_platform_admin());

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_ticket_messages_platform_admin_all ON public.support_ticket_messages USING (public.is_platform_admin());

CREATE POLICY support_ticket_messages_restaurant_insert ON public.support_ticket_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.support_tickets st
  WHERE ((st.id = support_ticket_messages.ticket_id) AND (st.restaurant_id = public.get_user_restaurant_id())))));

CREATE POLICY support_ticket_messages_restaurant_read ON public.support_ticket_messages FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.support_tickets st
  WHERE ((st.id = support_ticket_messages.ticket_id) AND (st.restaurant_id = public.get_user_restaurant_id())))) AND (is_internal_note = false)));

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_tickets_platform_admin_all ON public.support_tickets USING (public.is_platform_admin());

CREATE POLICY support_tickets_restaurant_insert ON public.support_tickets FOR INSERT WITH CHECK ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY support_tickets_restaurant_read ON public.support_tickets FOR SELECT USING ((restaurant_id = public.get_user_restaurant_id()));

ALTER TABLE public.tenant_usage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_usage_snapshots_platform_admin_all ON public.tenant_usage_snapshots USING (public.is_platform_admin());

CREATE POLICY tenant_usage_snapshots_restaurant_read ON public.tenant_usage_snapshots FOR SELECT USING ((restaurant_id = public.get_user_restaurant_id()));
-- END supabase/sql/60_platform_admin_support/policies.sql

-- BEGIN supabase/sql/20_ordering_customer/policies.sql
-- 20_ordering_customer/policies.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE POLICY "Anonymous can view gallery images" ON public.restaurant_gallery_images FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Tenant can manage gallery images" ON public.restaurant_gallery_images USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.order_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_discounts_select ON public.order_discounts FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY promotions_delete ON public.promotions FOR DELETE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY promotions_insert ON public.promotions FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY promotions_select ON public.promotions FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY promotions_update ON public.promotions FOR UPDATE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.restaurant_gallery_images ENABLE ROW LEVEL SECURITY;
-- END supabase/sql/20_ordering_customer/policies.sql

-- BEGIN supabase/sql/10_branch_core/triggers.sql
-- 10_branch_core/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TRIGGER restaurant_suspended_email_trigger AFTER UPDATE ON public.restaurants FOR EACH ROW WHEN (((new.suspended_at IS NOT NULL) AND (old.suspended_at IS NULL))) EXECUTE FUNCTION public.trigger_restaurant_suspended_email();

CREATE TRIGGER restaurant_unsuspended_email_trigger AFTER UPDATE ON public.restaurants FOR EACH ROW WHEN (((new.suspended_at IS NULL) AND (old.suspended_at IS NOT NULL))) EXECUTE FUNCTION public.trigger_restaurant_unsuspended_email();

CREATE TRIGGER restaurant_verified_email_trigger AFTER UPDATE ON public.restaurants FOR EACH ROW WHEN (((new.is_verified = true) AND (old.is_verified = false))) EXECUTE FUNCTION public.trigger_restaurant_verified_email();

CREATE TRIGGER sync_restaurant_verification_trigger BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.sync_restaurant_verification();

CREATE TRIGGER trg_bookings_audit AFTER INSERT OR DELETE OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_inventory_audit AFTER INSERT OR DELETE OR UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_menu_items_audit AFTER INSERT OR DELETE OR UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_orders_audit AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_update_order_total AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER trigger_update_order_status_on_item_change AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_status_on_item_change();

CREATE TRIGGER trigger_update_order_total_amount AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_total_amount();

CREATE TRIGGER trigger_update_table_status_on_order_change AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_table_status_on_order_change();
-- END supabase/sql/10_branch_core/triggers.sql

-- BEGIN supabase/sql/30_founder_control/triggers.sql
-- 30_founder_control/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TRIGGER trg_organization_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_owner_organizations_updated_at BEFORE UPDATE ON public.owner_organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- END supabase/sql/30_founder_control/triggers.sql

-- BEGIN supabase/sql/50_finance_billing/triggers.sql
-- 50_finance_billing/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TRIGGER subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_subscription_plans_updated_at();

CREATE TRIGGER subscription_receipts_updated_at BEFORE UPDATE ON public.subscription_receipts FOR EACH ROW EXECUTE FUNCTION public.update_subscription_receipts_updated_at();

CREATE TRIGGER tenant_subscriptions_updated_at BEFORE UPDATE ON public.tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_tenant_subscriptions_updated_at();

CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_org_finance_expenses_updated_at BEFORE UPDATE ON public.organization_finance_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- END supabase/sql/50_finance_billing/triggers.sql

-- BEGIN supabase/sql/40_people_attendance/triggers.sql
-- 40_people_attendance/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TRIGGER trg_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_attendance_records_updated_at();
-- END supabase/sql/40_people_attendance/triggers.sql

-- BEGIN supabase/sql/60_platform_admin_support/triggers.sql
-- 60_platform_admin_support/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TRIGGER set_ticket_sla_targets_trigger BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_ticket_sla_targets();

CREATE TRIGGER support_ticket_messages_first_response AFTER INSERT ON public.support_ticket_messages FOR EACH ROW EXECUTE FUNCTION public.set_first_response_timestamp();

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_support_tickets_updated_at();

CREATE TRIGGER update_ticket_sla_targets_trigger BEFORE UPDATE ON public.support_tickets FOR EACH ROW WHEN ((new.priority IS DISTINCT FROM old.priority)) EXECUTE FUNCTION public.update_ticket_sla_targets();
-- END supabase/sql/60_platform_admin_support/triggers.sql

-- BEGIN supabase/sql/20_ordering_customer/triggers.sql
-- 20_ordering_customer/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.


CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- END supabase/sql/20_ordering_customer/triggers.sql

-- BEGIN supabase/sql/00_foundation/grants.sql
-- 00_foundation/grants.sql
-- Explicit execute permissions for canonical helper functions.


REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_request_restaurant_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_restaurant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_service_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_restaurant_role(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_current_restaurant_id_for_session(uuid) TO anon, authenticated, service_role;
-- END supabase/sql/00_foundation/grants.sql

-- BEGIN supabase/sql/30_founder_control/grants.sql
-- 30_founder_control/grants.sql
-- Founder and organization helpers must remain callable from authenticated server contexts.


GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_founder(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member_for_restaurant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_can_access_restaurant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_restaurant_context(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_restaurant_onboarding(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text[]) TO authenticated, service_role;
-- END supabase/sql/30_founder_control/grants.sql

-- BEGIN supabase/sql/10_branch_core/grants.sql
-- 10_branch_core/grants.sql
-- Keep branch operational RPCs behind trusted server routes by default.


GRANT EXECUTE ON FUNCTION public.get_top_sellers_7days(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_recommendations(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_session_by_code(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_order_session_info(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_order_session_passcode(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_item_to_order(uuid, uuid, integer, text, uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_order_item_status(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_sales_analytics(uuid, date) TO service_role;
-- END supabase/sql/10_branch_core/grants.sql

-- BEGIN supabase/sql/20_ordering_customer/grants.sql
-- 20_ordering_customer/grants.sql
-- Public restaurant entry stays readable, while write-side ordering RPCs stay server-owned.


GRANT EXECUTE ON FUNCTION public.get_active_orders_with_details(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, uuid, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_item_counts_for_categories(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_restaurant_homepage_data(text) TO anon, authenticated, service_role;
-- END supabase/sql/20_ordering_customer/grants.sql

-- BEGIN supabase/sql/50_finance_billing/grants.sql
-- 50_finance_billing/grants.sql
-- Billing and trial RPCs are callable only from authenticated control-plane paths or internal jobs.


GRANT EXECUTE ON FUNCTION public.get_restaurant_subscription_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_restaurant_quota(uuid, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trials_expiring_soon(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_trial_expiration_warnings(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_expired_trials() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extend_trial(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trial_statistics() TO authenticated, service_role;
-- END supabase/sql/50_finance_billing/grants.sql

-- BEGIN supabase/sql/60_platform_admin_support/grants.sql
-- 60_platform_admin_support/grants.sql
-- Platform RPCs are explicitly callable only by authenticated admin contexts or internal jobs.


GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_internal_operator() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_admin_permissions(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.queue_email_notification(text, text, text, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_platform_action(text, text, uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_restaurant_summary(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_restaurant(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.suspend_restaurant(uuid, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unsuspend_restaurant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_support_ticket_summary(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_restaurant_application(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_sla_breaches() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_escalate_tickets() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sla_performance(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_daily_usage_snapshot(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_all_usage_snapshots(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_usage_trends(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_usage_summary(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_top_seller_for_day(uuid, text) TO authenticated, service_role;
-- END supabase/sql/60_platform_admin_support/grants.sql

-- BEGIN supabase/sql/70_storage/storage.sql
-- 70_storage/storage.sql
-- Canonical storage bucket and object access rules.


CREATE OR REPLACE FUNCTION public.storage_object_restaurant_id(object_name text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT CASE
    WHEN split_part(object_name, '/', 1) = 'restaurants'
      AND split_part(object_name, '/', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
    THEN split_part(object_name, '/', 2)::uuid
    ELSE NULL
  END;
$function$;

CREATE OR REPLACE FUNCTION public.storage_object_organization_id(object_name text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT CASE
    WHEN split_part(object_name, '/', 1) = 'organizations'
      AND split_part(object_name, '/', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
    THEN split_part(object_name, '/', 2)::uuid
    ELSE NULL
  END;
$function$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-uploads', 'restaurant-uploads', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

DROP POLICY IF EXISTS "Users can view own restaurant files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own restaurant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own restaurant files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own restaurant files" ON storage.objects;

CREATE POLICY "Users can view own restaurant files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  );

CREATE POLICY "Users can upload to own restaurant folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  );

CREATE POLICY "Users can update own restaurant files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  )
  WITH CHECK (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  );

CREATE POLICY "Users can delete own restaurant files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  );
-- END supabase/sql/70_storage/storage.sql
