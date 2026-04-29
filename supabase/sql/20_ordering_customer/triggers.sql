-- 20_ordering_customer/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '20_ordering_customer/triggers.sql'

CREATE TRIGGER trg_order_discounts_order_created_at BEFORE INSERT OR UPDATE OF order_id, restaurant_id, order_created_at ON public.order_discounts FOR EACH ROW EXECUTE FUNCTION public.set_order_created_at_from_order();

CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
