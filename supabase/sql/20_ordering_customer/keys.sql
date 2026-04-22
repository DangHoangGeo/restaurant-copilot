-- 20_ordering_customer/keys.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '20_ordering_customer/keys.sql'

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
