-- 50_finance_billing/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '50_finance_billing/triggers.sql'

CREATE TRIGGER subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_subscription_plans_updated_at();

CREATE TRIGGER subscription_receipts_updated_at BEFORE UPDATE ON public.subscription_receipts FOR EACH ROW EXECUTE FUNCTION public.update_subscription_receipts_updated_at();

CREATE TRIGGER tenant_subscriptions_updated_at BEFORE UPDATE ON public.tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_tenant_subscriptions_updated_at();

CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_org_finance_expenses_updated_at BEFORE UPDATE ON public.organization_finance_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
