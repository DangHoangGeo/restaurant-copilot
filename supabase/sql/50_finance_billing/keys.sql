-- 50_finance_billing/keys.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '50_finance_billing/keys.sql'

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
