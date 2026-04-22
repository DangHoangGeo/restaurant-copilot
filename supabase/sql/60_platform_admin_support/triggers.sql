-- 60_platform_admin_support/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '60_platform_admin_support/triggers.sql'

CREATE TRIGGER set_ticket_sla_targets_trigger BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_ticket_sla_targets();

CREATE TRIGGER support_ticket_messages_first_response AFTER INSERT ON public.support_ticket_messages FOR EACH ROW EXECUTE FUNCTION public.set_first_response_timestamp();

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_support_tickets_updated_at();

CREATE TRIGGER update_ticket_sla_targets_trigger BEFORE UPDATE ON public.support_tickets FOR EACH ROW WHEN ((new.priority IS DISTINCT FROM old.priority)) EXECUTE FUNCTION public.update_ticket_sla_targets();
