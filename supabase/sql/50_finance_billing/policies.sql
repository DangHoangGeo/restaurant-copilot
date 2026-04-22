-- 50_finance_billing/policies.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '50_finance_billing/policies.sql'

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
