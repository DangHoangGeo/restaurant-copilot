-- 60_platform_admin_support/policies.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '60_platform_admin_support/policies.sql'

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_admins_insert_policy ON public.platform_admins FOR INSERT WITH CHECK (public.check_is_platform_admin());

CREATE POLICY platform_admins_read_policy ON public.platform_admins FOR SELECT USING (public.check_is_platform_admin());

CREATE POLICY platform_admins_update_policy ON public.platform_admins FOR UPDATE USING (public.check_is_platform_admin());

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_audit_logs_insert ON public.platform_audit_logs FOR INSERT WITH CHECK (public.is_platform_admin());

CREATE POLICY platform_audit_logs_read ON public.platform_audit_logs FOR SELECT USING (public.is_platform_admin());

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_ticket_messages_platform_admin_all ON public.support_ticket_messages USING (public.is_platform_admin());

CREATE POLICY support_ticket_messages_restaurant_insert ON public.support_ticket_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.support_tickets st
  WHERE ((st.id = support_ticket_messages.ticket_id) AND (st.restaurant_id = public.get_user_restaurant_id())))));

CREATE POLICY support_ticket_messages_restaurant_read ON public.support_ticket_messages FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.support_tickets st
  WHERE ((st.id = support_ticket_messages.ticket_id) AND (st.restaurant_id = public.get_user_restaurant_id())))) AND (is_internal_note = false)));

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_tickets_platform_admin_all ON public.support_tickets USING (public.is_platform_admin());

CREATE POLICY support_tickets_restaurant_insert ON public.support_tickets FOR INSERT WITH CHECK ((restaurant_id = public.get_user_restaurant_id()));

CREATE POLICY support_tickets_restaurant_read ON public.support_tickets FOR SELECT USING ((restaurant_id = public.get_user_restaurant_id()));

ALTER TABLE public.tenant_usage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_usage_snapshots_platform_admin_all ON public.tenant_usage_snapshots USING (public.is_platform_admin());

CREATE POLICY tenant_usage_snapshots_restaurant_read ON public.tenant_usage_snapshots FOR SELECT USING ((restaurant_id = public.get_user_restaurant_id()));
