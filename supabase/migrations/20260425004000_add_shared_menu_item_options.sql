CREATE TABLE IF NOT EXISTS public.organization_menu_item_sizes (
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
    CONSTRAINT organization_menu_item_sizes_pkey PRIMARY KEY (id),
    CONSTRAINT organization_menu_item_sizes_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT organization_menu_item_sizes_size_key_check CHECK ((size_key = ANY (ARRAY['S'::text, 'M'::text, 'L'::text, 'XL'::text]))),
    CONSTRAINT organization_menu_item_sizes_item_id_fkey FOREIGN KEY (organization_menu_item_id) REFERENCES public.organization_menu_items(id) ON DELETE CASCADE,
    CONSTRAINT organization_menu_item_sizes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.organization_menu_item_toppings (
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
    CONSTRAINT organization_menu_item_toppings_pkey PRIMARY KEY (id),
    CONSTRAINT organization_menu_item_toppings_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT organization_menu_item_toppings_item_id_fkey FOREIGN KEY (organization_menu_item_id) REFERENCES public.organization_menu_items(id) ON DELETE CASCADE,
    CONSTRAINT organization_menu_item_toppings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_menu_item_sizes_item_position
    ON public.organization_menu_item_sizes USING btree (organization_menu_item_id, "position");

CREATE INDEX IF NOT EXISTS idx_organization_menu_item_toppings_item_position
    ON public.organization_menu_item_toppings USING btree (organization_menu_item_id, "position");

COMMENT ON TABLE public.organization_menu_item_sizes IS 'Organization-level shared menu item sizes copied into branch menu_item_sizes during inheritance sync.';

COMMENT ON TABLE public.organization_menu_item_toppings IS 'Organization-level shared menu item toppings copied into branch toppings during inheritance sync.';
