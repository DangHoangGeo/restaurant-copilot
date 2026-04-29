-- 20_ordering_customer/schema.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '20_ordering_customer/schema.sql'

CREATE TABLE public.order_discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    order_id uuid NOT NULL,
    order_created_at timestamp with time zone NOT NULL,
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
