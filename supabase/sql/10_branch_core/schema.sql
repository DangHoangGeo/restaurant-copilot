-- 10_branch_core/schema.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '10_branch_core/schema.sql'

CREATE TABLE public.orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    table_id uuid NOT NULL,
    session_id uuid NOT NULL,
    guest_count integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    payment_method text,
    discount_amount numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    tip_amount numeric DEFAULT 0,
    total_amount numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_discount_amount_check CHECK (((discount_amount IS NULL) OR (discount_amount >= (0)::numeric))),
    CONSTRAINT orders_guest_count_check CHECK ((guest_count > 0)),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['new'::text, 'serving'::text, 'completed'::text, 'canceled'::text]))),
    CONSTRAINT orders_tax_amount_check CHECK (((tax_amount IS NULL) OR (tax_amount >= (0)::numeric))),
    CONSTRAINT orders_tip_amount_check CHECK (((tip_amount IS NULL) OR (tip_amount >= (0)::numeric))),
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
    table_id uuid,
    customer_name text NOT NULL,
    customer_contact text NOT NULL,
    customer_phone text,
    customer_email text,
    customer_note text,
    booking_date date NOT NULL,
    booking_time time without time zone NOT NULL,
    party_size integer NOT NULL,
    preorder_items jsonb DEFAULT '[]'::jsonb,
    public_lookup_token uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
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
    CONSTRAINT employees_role_check CHECK ((role = ANY (ARRAY['chef'::text, 'server'::text, 'cashier'::text, 'manager'::text, 'part_time'::text])))
);

CREATE TABLE public.employee_private_profiles (
    employee_id uuid NOT NULL,
    restaurant_id uuid NOT NULL,
    gender text,
    phone text,
    contact_email text,
    address text,
    facebook_url text,
    bank_name text,
    bank_branch_name text,
    bank_account_type text,
    bank_account_number text,
    bank_account_holder text,
    tax_social_number text,
    insurance_number text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    restaurant_id uuid,
    email text NOT NULL,
    name text,
    role text NOT NULL,
    two_factor_secret text,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    photo_url text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'chef'::text, 'server'::text, 'cashier'::text, 'manager'::text, 'part_time'::text, 'employee'::text, 'staff'::text])))
);

COMMENT ON COLUMN public.users.restaurant_id IS 'Legacy primary branch context. Nullable for organization-only members such as accountant_readonly who must not inherit branch-route authority.';
