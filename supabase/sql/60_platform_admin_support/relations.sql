-- 60_platform_admin_support/relations.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '60_platform_admin_support/relations.sql'

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.platform_audit_logs
    ADD CONSTRAINT platform_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id);

ALTER TABLE ONLY public.platform_audit_logs
    ADD CONSTRAINT platform_audit_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.platform_admins(id);

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.tenant_usage_snapshots
    ADD CONSTRAINT tenant_usage_snapshots_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
