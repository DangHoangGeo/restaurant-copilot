-- 30_founder_control/schema.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '30_founder_control/schema.sql'

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

CREATE TABLE public.organization_role_pay_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    job_title text NOT NULL,
    hourly_rate numeric(12,2) NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_role_pay_rates_hourly_rate_check CHECK ((hourly_rate >= (0)::numeric)),
    CONSTRAINT organization_role_pay_rates_job_title_check CHECK ((job_title = ANY (ARRAY['manager'::text, 'chef'::text, 'server'::text, 'cashier'::text, 'part_time'::text])))
);

CREATE TABLE public.organization_menu_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name_en text NOT NULL,
    name_ja text,
    name_vi text,
    is_active boolean DEFAULT true NOT NULL,
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
    weekday_visibility integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7] NOT NULL,
    stock_level integer,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.organization_menu_items IS 'Organization-level shared menu items. Branch menus remain independent until copied or applied separately.';
COMMENT ON COLUMN public.organization_menu_items.weekday_visibility IS 'Default visible weekdays for organization shared menu inheritance. Branch menu items may override after sync.';
COMMENT ON COLUMN public.organization_menu_items.stock_level IS 'Default stock value for organization shared menu inheritance. Branch inventory remains branch-local after sync.';

CREATE TABLE public.organization_menu_item_sizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    organization_menu_item_id uuid NOT NULL,
    size_key text NOT NULL,
    name_en text NOT NULL,
    name_ja text,
    name_vi text,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_menu_item_sizes_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT organization_menu_item_sizes_size_key_check CHECK ((size_key = ANY (ARRAY['S'::text, 'M'::text, 'L'::text, 'XL'::text])))
);

COMMENT ON TABLE public.organization_menu_item_sizes IS 'Organization-level shared menu item sizes copied into branch menu_item_sizes during inheritance sync.';

CREATE TABLE public.organization_menu_item_toppings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    organization_menu_item_id uuid NOT NULL,
    name_en text NOT NULL,
    name_ja text,
    name_vi text,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_menu_item_toppings_price_check CHECK ((price >= (0)::numeric))
);

COMMENT ON TABLE public.organization_menu_item_toppings IS 'Organization-level shared menu item toppings copied into branch toppings during inheritance sync.';

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
