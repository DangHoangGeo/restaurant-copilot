-- 40_people_attendance/triggers.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '40_people_attendance/triggers.sql'

CREATE TRIGGER trg_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_attendance_records_updated_at();

CREATE TRIGGER trg_organization_role_pay_rates_updated_at BEFORE UPDATE ON public.organization_role_pay_rates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
