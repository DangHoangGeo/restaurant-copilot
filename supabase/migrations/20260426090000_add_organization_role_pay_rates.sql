CREATE TABLE IF NOT EXISTS public.organization_role_pay_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    job_title text NOT NULL,
    hourly_rate numeric(12,2) NOT NULL,
    currency text DEFAULT 'JPY'::text NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_role_pay_rates_hourly_rate_check CHECK ((hourly_rate >= (0)::numeric)),
    CONSTRAINT organization_role_pay_rates_job_title_check CHECK ((job_title = ANY (ARRAY['manager'::text, 'chef'::text, 'server'::text, 'cashier'::text])))
);

ALTER TABLE ONLY public.organization_role_pay_rates
    ADD CONSTRAINT organization_role_pay_rates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_role_pay_rates
    ADD CONSTRAINT organization_role_pay_rates_organization_id_job_title_key UNIQUE (organization_id, job_title);

ALTER TABLE ONLY public.organization_role_pay_rates
    ADD CONSTRAINT organization_role_pay_rates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.owner_organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_role_pay_rates
    ADD CONSTRAINT organization_role_pay_rates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

CREATE INDEX idx_organization_role_pay_rates_org ON public.organization_role_pay_rates USING btree (organization_id);

INSERT INTO public.organization_role_pay_rates (
    organization_id,
    job_title,
    hourly_rate,
    currency,
    updated_by,
    created_at,
    updated_at
)
SELECT DISTINCT ON (org_restaurants.organization_id, branch_rates.job_title)
    org_restaurants.organization_id,
    branch_rates.job_title,
    branch_rates.hourly_rate,
    branch_rates.currency,
    branch_rates.updated_by,
    now(),
    now()
FROM public.restaurant_role_pay_rates branch_rates
JOIN public.organization_restaurants org_restaurants
    ON org_restaurants.restaurant_id = branch_rates.restaurant_id
ORDER BY
    org_restaurants.organization_id,
    branch_rates.job_title,
    branch_rates.updated_at DESC
ON CONFLICT (organization_id, job_title) DO NOTHING;

ALTER TABLE public.organization_role_pay_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view role pay rates in their organization"
ON public.organization_role_pay_rates
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Org founders can manage role pay rates"
ON public.organization_role_pay_rates
USING (public.is_org_founder(organization_id))
WITH CHECK (public.is_org_founder(organization_id));

CREATE TRIGGER trg_organization_role_pay_rates_updated_at
BEFORE UPDATE ON public.organization_role_pay_rates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
