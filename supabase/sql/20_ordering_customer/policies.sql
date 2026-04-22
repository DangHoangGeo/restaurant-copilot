-- 20_ordering_customer/policies.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '20_ordering_customer/policies.sql'

CREATE POLICY "Anonymous can view gallery images" ON public.restaurant_gallery_images FOR SELECT TO anon USING ((restaurant_id = public.get_request_restaurant_id()));

CREATE POLICY "Tenant can manage gallery images" ON public.restaurant_gallery_images USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.order_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_discounts_select ON public.order_discounts FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY promotions_delete ON public.promotions FOR DELETE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY promotions_insert ON public.promotions FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY promotions_select ON public.promotions FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY promotions_update ON public.promotions FOR UPDATE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.restaurant_gallery_images ENABLE ROW LEVEL SECURITY;
