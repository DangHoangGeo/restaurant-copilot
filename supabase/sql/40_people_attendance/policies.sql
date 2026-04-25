-- 40_people_attendance/policies.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '40_people_attendance/policies.sql'

CREATE POLICY "Employee can SELECT their own attendance events" ON public.attendance_events FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));

CREATE POLICY "Employee can SELECT their own attendance_records" ON public.attendance_records FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));

CREATE POLICY "Employee can SELECT their own daily summaries" ON public.attendance_daily_summaries FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));

CREATE POLICY "Tenant can INSERT attendance_events" ON public.attendance_events FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can SELECT attendance_events" ON public.attendance_events FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can manage attendance_approvals" ON public.attendance_approvals USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can manage attendance_daily_summaries" ON public.attendance_daily_summaries USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can manage attendance_records" ON public.attendance_records USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can manage employee_qr_credentials" ON public.employee_qr_credentials USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY "Tenant can manage branch salary month closes" ON public.branch_salary_month_closes USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

ALTER TABLE public.attendance_approvals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_daily_summaries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employee_qr_credentials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.branch_salary_month_closes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.restaurant_role_pay_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_pay_rates_read ON public.restaurant_role_pay_rates FOR SELECT USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY role_pay_rates_update ON public.restaurant_role_pay_rates FOR UPDATE USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text]))) WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE POLICY role_pay_rates_write ON public.restaurant_role_pay_rates FOR INSERT WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));
