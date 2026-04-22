-- 30_founder_control/relations.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '30_founder_control/relations.sql'

ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.organization_members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.organization_members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_menu_categories
    ADD CONSTRAINT organization_menu_categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_menu_items
    ADD CONSTRAINT organization_menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.organization_menu_categories(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_menu_items
    ADD CONSTRAINT organization_menu_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_accepted_by_user_id_fkey FOREIGN KEY (accepted_by_user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.owner_organizations
    ADD CONSTRAINT owner_organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
