-- 30_founder_control/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '30_founder_control/triggers.sql'

CREATE TRIGGER trg_organization_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_owner_organizations_updated_at BEFORE UPDATE ON public.owner_organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
