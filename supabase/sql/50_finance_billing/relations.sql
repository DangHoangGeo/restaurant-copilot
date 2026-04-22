-- 50_finance_billing/relations.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '50_finance_billing/relations.sql'

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
