ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_role_check CHECK ((role = ANY (ARRAY['chef'::text, 'server'::text, 'cashier'::text, 'manager'::text, 'part_time'::text])));

ALTER TABLE public.restaurant_role_pay_rates DROP CONSTRAINT IF EXISTS restaurant_role_pay_rates_job_title_check;
ALTER TABLE public.restaurant_role_pay_rates
  ADD CONSTRAINT restaurant_role_pay_rates_job_title_check CHECK ((job_title = ANY (ARRAY['manager'::text, 'chef'::text, 'server'::text, 'cashier'::text, 'part_time'::text])));

ALTER TABLE public.organization_role_pay_rates DROP CONSTRAINT IF EXISTS organization_role_pay_rates_job_title_check;
ALTER TABLE public.organization_role_pay_rates
  ADD CONSTRAINT organization_role_pay_rates_job_title_check CHECK ((job_title = ANY (ARRAY['manager'::text, 'chef'::text, 'server'::text, 'cashier'::text, 'part_time'::text])));

CREATE TABLE IF NOT EXISTS public.employee_private_profiles (
    employee_id uuid NOT NULL,
    restaurant_id uuid NOT NULL,
    gender text,
    phone text,
    contact_email text,
    address text,
    facebook_url text,
    bank_name text,
    bank_branch_name text,
    bank_account_type text,
    bank_account_number text,
    bank_account_holder text,
    tax_social_number text,
    insurance_number text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_private_profiles_pkey PRIMARY KEY (employee_id),
    CONSTRAINT employee_private_profiles_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
    CONSTRAINT employee_private_profiles_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE,
    CONSTRAINT employee_private_profiles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_employee_private_profiles_restaurant ON public.employee_private_profiles USING btree (restaurant_id);

ALTER TABLE public.employee_private_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can SELECT employee private profiles" ON public.employee_private_profiles;
CREATE POLICY "Authenticated users can SELECT employee private profiles"
ON public.employee_private_profiles
FOR SELECT TO authenticated
USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

DROP POLICY IF EXISTS "Managers can manage employee private profiles" ON public.employee_private_profiles;
CREATE POLICY "Managers can manage employee private profiles"
ON public.employee_private_profiles
TO authenticated
USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])))
WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));

CREATE TABLE IF NOT EXISTS public.branch_salary_month_closes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    month_key text NOT NULL,
    approved_hours numeric(10,2) DEFAULT 0 NOT NULL,
    salary_total numeric(12,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    expense_id uuid,
    closed_by uuid,
    closed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT branch_salary_month_closes_pkey PRIMARY KEY (id),
    CONSTRAINT branch_salary_month_closes_restaurant_month_key UNIQUE (restaurant_id, month_key),
    CONSTRAINT branch_salary_month_closes_month_key_check CHECK ((month_key ~ '^\d{4}-\d{2}$'::text)),
    CONSTRAINT branch_salary_month_closes_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id),
    CONSTRAINT branch_salary_month_closes_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE SET NULL,
    CONSTRAINT branch_salary_month_closes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_branch_salary_month_closes_restaurant_month ON public.branch_salary_month_closes USING btree (restaurant_id, month_key);

ALTER TABLE public.branch_salary_month_closes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant can manage branch salary month closes" ON public.branch_salary_month_closes;
CREATE POLICY "Tenant can manage branch salary month closes"
ON public.branch_salary_month_closes
USING (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])))
WITH CHECK (((restaurant_id = public.get_user_restaurant_id()) AND public.user_has_restaurant_role(restaurant_id, ARRAY['owner'::text, 'manager'::text])));
