-- 40_people_attendance/schema.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '40_people_attendance/schema.sql'

CREATE TABLE public.attendance_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    summary_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    action text NOT NULL,
    notes text,
    acted_by uuid NOT NULL,
    acted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_approvals_action_check CHECK ((action = ANY (ARRAY['approved'::text, 'rejected'::text])))
);

CREATE TABLE public.attendance_daily_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    first_check_in timestamp with time zone,
    last_check_out timestamp with time zone,
    total_hours numeric(5,2),
    status text DEFAULT 'pending'::text NOT NULL,
    has_exception boolean DEFAULT false NOT NULL,
    exception_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_daily_summaries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'correction_pending'::text])))
);

CREATE TABLE public.attendance_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    event_type text NOT NULL,
    corrected_event_type text,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    credential_id uuid,
    source text DEFAULT 'qr_self'::text NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_events_corrected_event_type_required CHECK ((((event_type = 'manual_correction'::text) AND (corrected_event_type IS NOT NULL)) OR ((event_type <> 'manual_correction'::text) AND (corrected_event_type IS NULL)))),
    CONSTRAINT attendance_events_corrected_event_type_valid CHECK (((corrected_event_type = ANY (ARRAY['check_in'::text, 'check_out'::text])) OR (corrected_event_type IS NULL))),
    CONSTRAINT attendance_events_event_type_check CHECK ((event_type = ANY (ARRAY['check_in'::text, 'check_out'::text, 'manual_correction'::text]))),
    CONSTRAINT attendance_events_source_check CHECK ((source = ANY (ARRAY['qr_self'::text, 'qr_kiosk'::text, 'manager_manual'::text])))
);

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    hours_worked numeric(6,2),
    status text DEFAULT 'recorded'::text NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_records_status_check CHECK ((status = ANY (ARRAY['recorded'::text, 'checked'::text])))
);

CREATE TABLE public.employee_qr_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    token text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    rotated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.restaurant_role_pay_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    job_title text NOT NULL,
    hourly_rate numeric(10,2) NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT restaurant_role_pay_rates_hourly_rate_check CHECK ((hourly_rate >= (0)::numeric)),
    CONSTRAINT restaurant_role_pay_rates_job_title_check CHECK ((job_title = ANY (ARRAY['manager'::text, 'chef'::text, 'server'::text, 'cashier'::text])))
);
