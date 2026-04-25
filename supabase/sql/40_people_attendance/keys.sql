-- 40_people_attendance/keys.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '40_people_attendance/keys.sql'

ALTER TABLE ONLY public.attendance_approvals
    ADD CONSTRAINT attendance_approvals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_employee_id_work_date_key UNIQUE (employee_id, work_date);

ALTER TABLE ONLY public.attendance_daily_summaries
    ADD CONSTRAINT attendance_daily_summaries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_work_date_key UNIQUE (employee_id, work_date);

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employee_qr_credentials
    ADD CONSTRAINT employee_qr_credentials_token_key UNIQUE (token);

ALTER TABLE ONLY public.branch_salary_month_closes
    ADD CONSTRAINT branch_salary_month_closes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.branch_salary_month_closes
    ADD CONSTRAINT branch_salary_month_closes_restaurant_month_key UNIQUE (restaurant_id, month_key);

ALTER TABLE ONLY public.restaurant_role_pay_rates
    ADD CONSTRAINT restaurant_role_pay_rates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.restaurant_role_pay_rates
    ADD CONSTRAINT restaurant_role_pay_rates_restaurant_id_job_title_key UNIQUE (restaurant_id, job_title);

CREATE INDEX idx_aa_acted_by ON public.attendance_approvals USING btree (acted_by);

CREATE INDEX idx_aa_restaurant_date ON public.attendance_approvals USING btree (restaurant_id, work_date);

CREATE INDEX idx_aa_summary_id ON public.attendance_approvals USING btree (summary_id);

CREATE INDEX idx_ads_employee_work_date ON public.attendance_daily_summaries USING btree (employee_id, work_date);

CREATE INDEX idx_ads_restaurant_status ON public.attendance_daily_summaries USING btree (restaurant_id, status);

CREATE INDEX idx_ads_work_date ON public.attendance_daily_summaries USING btree (work_date);

CREATE INDEX idx_ae_employee_work_date ON public.attendance_events USING btree (employee_id, work_date);

CREATE INDEX idx_ae_restaurant_id ON public.attendance_events USING btree (restaurant_id);

CREATE INDEX idx_ae_work_date ON public.attendance_events USING btree (work_date);

CREATE INDEX idx_attendance_records_employee_work_date ON public.attendance_records USING btree (employee_id, work_date DESC);

CREATE INDEX idx_attendance_records_restaurant_work_date ON public.attendance_records USING btree (restaurant_id, work_date DESC);

CREATE INDEX idx_eqr_employee_id ON public.employee_qr_credentials USING btree (employee_id);

CREATE INDEX idx_eqr_restaurant_id ON public.employee_qr_credentials USING btree (restaurant_id);

CREATE INDEX idx_eqr_token_active ON public.employee_qr_credentials USING btree (token) WHERE (is_active = true);

CREATE INDEX idx_branch_salary_month_closes_restaurant_month ON public.branch_salary_month_closes USING btree (restaurant_id, month_key);

CREATE INDEX idx_restaurant_role_pay_rates_restaurant ON public.restaurant_role_pay_rates USING btree (restaurant_id);
