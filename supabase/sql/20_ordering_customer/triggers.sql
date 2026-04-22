-- 20_ordering_customer/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '20_ordering_customer/triggers.sql'

CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
