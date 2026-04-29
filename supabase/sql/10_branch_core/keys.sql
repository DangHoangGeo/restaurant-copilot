-- 10_branch_core/keys.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '10_branch_core/keys.sql'

ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_public_lookup_token_key UNIQUE (public_lookup_token);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_logs
    ADD CONSTRAINT chat_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employee_private_profiles
    ADD CONSTRAINT employee_private_profiles_pkey PRIMARY KEY (employee_id);

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

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id, created_at);

ALTER TABLE public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id, created_at);

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

CREATE INDEX idx_bookings_pii_expiry ON public.bookings USING btree (pii_expires_at) WHERE (pii_expires_at IS NOT NULL);

CREATE INDEX idx_bookings_restaurant_public_lookup_token ON public.bookings USING btree (restaurant_id, public_lookup_token);

CREATE INDEX idx_categories_restaurant_org_menu_category ON public.categories USING btree (restaurant_id, organization_menu_category_id);

CREATE UNIQUE INDEX idx_categories_restaurant_position ON public.categories USING btree (restaurant_id, "position");

CREATE INDEX idx_chat_logs_restaurant_created ON public.chat_logs USING btree (restaurant_id, created_at);

CREATE INDEX idx_employees_is_active ON public.employees USING btree (restaurant_id, is_active);

CREATE INDEX idx_employees_restaurant_role ON public.employees USING btree (restaurant_id, role);

CREATE INDEX idx_employee_private_profiles_restaurant ON public.employee_private_profiles USING btree (restaurant_id);

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

CREATE INDEX idx_order_items_order_created_at ON public.order_items USING btree (order_id, order_created_at);

CREATE INDEX idx_order_items_order_status ON public.order_items USING btree (order_id, status);

CREATE INDEX idx_order_items_orders_reporting ON public.order_items USING btree (restaurant_id, created_at DESC);

CREATE INDEX idx_order_items_restaurant_menu_item ON public.order_items USING btree (restaurant_id, menu_item_id);

COMMENT ON INDEX public.idx_order_items_restaurant_menu_item IS 'Optimizes popular items analysis and menu item performance queries';

CREATE INDEX idx_order_items_restaurant_price ON public.order_items USING btree (restaurant_id, price_at_order);

CREATE INDEX idx_order_items_restaurant_status ON public.order_items USING btree (restaurant_id, status);

CREATE INDEX idx_order_items_topping_ids ON public.order_items USING gin (topping_ids);

CREATE INDEX idx_orders_completed_date ON public.orders USING btree (restaurant_id, created_at DESC) WHERE (status = 'completed'::text);

CREATE INDEX idx_orders_id ON public.orders USING btree (id);

CREATE INDEX idx_orders_restaurant_created ON public.orders USING btree (restaurant_id, created_at DESC);

CREATE INDEX idx_orders_restaurant_status ON public.orders USING btree (restaurant_id, status);

CREATE INDEX idx_orders_session_id ON public.orders USING btree (session_id);

CREATE INDEX idx_orders_single_active_session_per_table ON public.orders USING btree (restaurant_id, table_id) WHERE (status = ANY (ARRAY['new'::text, 'serving'::text]));

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
