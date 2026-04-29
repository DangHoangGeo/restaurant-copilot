-- 20_ordering_customer/relations.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '20_ordering_customer/relations.sql'

ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_order_id_fkey FOREIGN KEY (order_id, order_created_at) REFERENCES public.orders(id, created_at) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.restaurant_gallery_images
    ADD CONSTRAINT restaurant_gallery_images_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
