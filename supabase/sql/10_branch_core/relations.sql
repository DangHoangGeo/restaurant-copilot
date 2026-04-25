-- 10_branch_core/relations.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '10_branch_core/relations.sql'

ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_top_seller_item_fkey FOREIGN KEY (top_seller_item) REFERENCES public.menu_items(id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_organization_menu_category_id_fkey FOREIGN KEY (organization_menu_category_id) REFERENCES public.organization_menu_categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_logs
    ADD CONSTRAINT chat_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_logs
    ADD CONSTRAINT chat_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_private_profiles
    ADD CONSTRAINT employee_private_profiles_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_private_profiles
    ADD CONSTRAINT employee_private_profiles_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_private_profiles
    ADD CONSTRAINT employee_private_profiles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.menu_item_sizes
    ADD CONSTRAINT menu_item_sizes_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.menu_item_sizes
    ADD CONSTRAINT menu_item_sizes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_organization_menu_item_id_fkey FOREIGN KEY (organization_menu_item_id) REFERENCES public.organization_menu_items(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_size_id_fkey FOREIGN KEY (menu_item_size_id) REFERENCES public.menu_item_sizes(id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES public.platform_admins(id);

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.platform_admins(id);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.toppings
    ADD CONSTRAINT toppings_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.toppings
    ADD CONSTRAINT toppings_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
