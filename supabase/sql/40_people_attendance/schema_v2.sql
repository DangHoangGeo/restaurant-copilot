-- 40_people_attendance/schema_v2.sql
-- Employee management expansion: checkin codes, restaurant QR, bank accounts,
-- leave requests, and payroll records.

\echo '40_people_attendance/schema_v2.sql'

-- Employee short checkin code (4-6 uppercase chars, unique per branch).
-- Employees use this code at the restaurant QR kiosk to clock in/out.
CREATE TABLE IF NOT EXISTS public.employee_checkin_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    code varchar(6) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_checkin_codes_pkey PRIMARY KEY (id),
    CONSTRAINT employee_checkin_codes_code_length CHECK (char_length(code) BETWEEN 4 AND 6),
    CONSTRAINT employee_checkin_codes_code_format CHECK (code ~ '^[A-Z0-9]+$'),
    CONSTRAINT employee_checkin_codes_unique_per_branch UNIQUE (restaurant_id, code)
);

COMMENT ON TABLE public.employee_checkin_codes IS 'Short 4-6 character code per employee for branch clock-in kiosk.';

-- Restaurant-level QR token. Employees scan this QR, then enter their short code.
-- Manager rotates it monthly to prevent code reuse by former employees.
CREATE TABLE IF NOT EXISTS public.restaurant_checkin_qr (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone,
    rotated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT restaurant_checkin_qr_pkey PRIMARY KEY (id),
    CONSTRAINT restaurant_checkin_qr_restaurant_unique UNIQUE (restaurant_id)
);

COMMENT ON TABLE public.restaurant_checkin_qr IS 'Monthly rotating QR token for the branch checkin kiosk. Employees scan this QR then enter their personal code.';

-- Employee bank account details (for payroll processing).
CREATE TABLE IF NOT EXISTS public.employee_bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    restaurant_id uuid NOT NULL,
    bank_name text NOT NULL,
    branch_name text,
    account_type text DEFAULT 'checking' NOT NULL,
    account_number text NOT NULL,
    account_holder text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_bank_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT employee_bank_accounts_employee_unique UNIQUE (employee_id),
    CONSTRAINT employee_bank_accounts_account_type_check CHECK (account_type = ANY (ARRAY['checking'::text, 'savings'::text, 'current'::text]))
);

COMMENT ON TABLE public.employee_bank_accounts IS 'Bank account details per employee for payroll transfers.';

-- Employee leave requests (days off, sick leave, vacation).
CREATE TABLE IF NOT EXISTS public.employee_leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    leave_date date NOT NULL,
    leave_type text DEFAULT 'day_off' NOT NULL,
    reason text,
    status text DEFAULT 'pending' NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_leave_requests_pkey PRIMARY KEY (id),
    CONSTRAINT employee_leave_requests_leave_type_check CHECK (leave_type = ANY (ARRAY['day_off'::text, 'sick'::text, 'vacation'::text, 'personal'::text])),
    CONSTRAINT employee_leave_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);

COMMENT ON TABLE public.employee_leave_requests IS 'Employee-submitted days off and leave requests.';

-- Payroll records for monthly salary approval and bonus recording.
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    pay_period_start date NOT NULL,
    pay_period_end date NOT NULL,
    total_hours numeric(8,2) DEFAULT 0 NOT NULL,
    hourly_rate numeric(10,2),
    base_pay numeric(10,2),
    bonus numeric(10,2) DEFAULT 0 NOT NULL,
    deductions numeric(10,2) DEFAULT 0 NOT NULL,
    total_pay numeric(10,2),
    currency text DEFAULT 'JPY' NOT NULL,
    status text DEFAULT 'draft' NOT NULL,
    notes text,
    bonus_reason text,
    approved_by uuid,
    approved_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payroll_records_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_records_status_check CHECK (status = ANY (ARRAY['draft'::text, 'approved'::text, 'paid'::text])),
    CONSTRAINT payroll_records_total_hours_check CHECK (total_hours >= 0),
    CONSTRAINT payroll_records_bonus_check CHECK (bonus >= 0),
    CONSTRAINT payroll_records_deductions_check CHECK (deductions >= 0),
    CONSTRAINT payroll_records_period_unique UNIQUE (restaurant_id, employee_id, pay_period_start, pay_period_end)
);

COMMENT ON TABLE public.payroll_records IS 'Monthly payroll records including base pay, bonus, and final approval by owner.';
