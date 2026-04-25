-- 40_people_attendance/relations.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '40_people_attendance/relations.sql'

ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_acted_by_fkey FOREIGN KEY (acted_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_summary_id_fkey FOREIGN KEY (summary_id) REFERENCES public.attendance_daily_summaries(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES public.employee_qr_credentials(id);

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_rotated_by_fkey FOREIGN KEY (rotated_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.branch_salary_month_closes
    ADD CONSTRAINT branch_salary_month_closes_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.branch_salary_month_closes
    ADD CONSTRAINT branch_salary_month_closes_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.branch_salary_month_closes
    ADD CONSTRAINT branch_salary_month_closes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.restaurant_role_pay_rates
    ADD CONSTRAINT restaurant_role_pay_rates_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.restaurant_role_pay_rates
    ADD CONSTRAINT restaurant_role_pay_rates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
