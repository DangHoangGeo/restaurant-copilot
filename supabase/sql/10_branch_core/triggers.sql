-- 10_branch_core/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '10_branch_core/triggers.sql'

CREATE TRIGGER restaurant_suspended_email_trigger AFTER UPDATE ON public.restaurants FOR EACH ROW WHEN (((new.suspended_at IS NOT NULL) AND (old.suspended_at IS NULL))) EXECUTE FUNCTION public.trigger_restaurant_suspended_email();

CREATE TRIGGER restaurant_unsuspended_email_trigger AFTER UPDATE ON public.restaurants FOR EACH ROW WHEN (((new.suspended_at IS NULL) AND (old.suspended_at IS NOT NULL))) EXECUTE FUNCTION public.trigger_restaurant_unsuspended_email();

CREATE TRIGGER restaurant_verified_email_trigger AFTER UPDATE ON public.restaurants FOR EACH ROW WHEN (((new.is_verified = true) AND (old.is_verified = false))) EXECUTE FUNCTION public.trigger_restaurant_verified_email();

CREATE TRIGGER sync_restaurant_verification_trigger BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.sync_restaurant_verification();

CREATE TRIGGER trg_bookings_audit AFTER INSERT OR DELETE OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_inventory_audit AFTER INSERT OR DELETE OR UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_menu_items_audit AFTER INSERT OR DELETE OR UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_orders_audit AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_update_order_total AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER trigger_update_order_status_on_item_change AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_status_on_item_change();

CREATE TRIGGER trigger_update_order_total_amount AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_total_amount();

CREATE TRIGGER trigger_update_table_status_on_order_change AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_table_status_on_order_change();
