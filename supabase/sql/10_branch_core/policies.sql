-- 10_branch_core/policies.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '10_branch_core/policies.sql'

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

CREATE POLICY "Authenticated users can SELECT employee private profiles" ON public.employee_private_profiles FOR SELECT TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

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

CREATE POLICY "Managers can manage employee private profiles" ON public.employee_private_profiles TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

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

CREATE POLICY "Staff can DELETE order_items" ON public.order_items FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

CREATE POLICY "Staff can DELETE orders" ON public.orders FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

CREATE POLICY "Staff can DELETE reviews" ON public.reviews FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE tables" ON public.tables FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can DELETE toppings" ON public.toppings FOR DELETE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can INSERT bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text])));

CREATE POLICY "Staff can INSERT categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT inventory_items" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT menu_item_sizes" ON public.menu_item_sizes FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can INSERT menu_items" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can INSERT order_items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

CREATE POLICY "Staff can INSERT orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

CREATE POLICY "Staff can INSERT reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT tables" ON public.tables FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can INSERT toppings" ON public.toppings FOR INSERT TO authenticated WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can UPDATE bookings" ON public.bookings FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'server'::text])));

CREATE POLICY "Staff can UPDATE categories" ON public.categories FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can UPDATE feedback" ON public.feedback FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can UPDATE inventory_items" ON public.inventory_items FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Staff can UPDATE menu_item_sizes" ON public.menu_item_sizes FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can UPDATE menu_items" ON public.menu_items FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text, 'chef'::text])));

CREATE POLICY "Staff can UPDATE order_items" ON public.order_items FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

CREATE POLICY "Staff can UPDATE orders" ON public.orders FOR UPDATE TO authenticated USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_service_access(restaurant_id)));

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

ALTER TABLE public.employee_private_profiles ENABLE ROW LEVEL SECURITY;

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
