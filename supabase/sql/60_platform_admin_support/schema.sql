-- 60_platform_admin_support/schema.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '60_platform_admin_support/schema.sql'

CREATE TABLE public.email_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_email text NOT NULL,
    recipient_name text,
    template_name text NOT NULL,
    template_data jsonb DEFAULT '{}'::jsonb,
    subject text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    CONSTRAINT email_notifications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);

COMMENT ON TABLE public.email_notifications IS 'Queue for outgoing email notifications';

CREATE TABLE public.platform_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    is_active boolean DEFAULT true NOT NULL,
    permissions jsonb DEFAULT '{"logs": ["read"], "users": ["read"], "support": ["read", "write"], "restaurants": ["read", "verify", "suspend"], "subscriptions": ["read", "update"]}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    deactivated_at timestamp with time zone,
    deactivated_by uuid,
    notes text
);

COMMENT ON TABLE public.platform_admins IS 'Platform-level administrators with cross-tenant access';

CREATE TABLE public.platform_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    restaurant_id uuid,
    changes jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.platform_audit_logs IS 'Audit trail of all platform administrator actions';

CREATE TABLE public.sla_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_priority text NOT NULL,
    first_response_hours integer NOT NULL,
    resolution_hours integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sla_config_ticket_priority_check CHECK ((ticket_priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])))
);

COMMENT ON TABLE public.sla_config IS 'SLA targets for support tickets by priority level';

CREATE TABLE public.support_ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    message text NOT NULL,
    posted_by_type text NOT NULL,
    posted_by uuid,
    poster_name text,
    is_internal_note boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    edited_by uuid,
    CONSTRAINT support_ticket_messages_posted_by_type_check CHECK ((posted_by_type = ANY (ARRAY['restaurant'::text, 'platform_admin'::text, 'system'::text])))
);

COMMENT ON TABLE public.support_ticket_messages IS 'Threaded messages within support tickets';

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    ticket_number integer NOT NULL,
    subject text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    submitted_by uuid NOT NULL,
    submitter_name text NOT NULL,
    submitter_email text NOT NULL,
    submitter_role text,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    first_response_at timestamp with time zone,
    first_response_sla_breach boolean DEFAULT false,
    resolution_sla_target timestamp with time zone,
    resolution_sla_breach boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    resolution_notes text,
    CONSTRAINT support_tickets_category_check CHECK ((category = ANY (ARRAY['billing'::text, 'technical'::text, 'feature_request'::text, 'bug_report'::text, 'account'::text, 'general'::text]))),
    CONSTRAINT support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['new'::text, 'investigating'::text, 'waiting_customer'::text, 'resolved'::text, 'closed'::text])))
);

COMMENT ON TABLE public.support_tickets IS 'Customer support tickets from restaurant tenants';

CREATE SEQUENCE public.support_tickets_ticket_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.tenant_usage_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    total_orders integer DEFAULT 0,
    total_order_items integer DEFAULT 0,
    total_revenue numeric(10,2) DEFAULT 0,
    unique_customers integer DEFAULT 0,
    active_staff_count integer DEFAULT 0,
    total_staff_hours numeric(10,2) DEFAULT 0,
    storage_used_mb bigint DEFAULT 0,
    image_count integer DEFAULT 0,
    ai_calls_count integer DEFAULT 0,
    ai_tokens_used integer DEFAULT 0,
    api_calls_count integer DEFAULT 0,
    api_errors_count integer DEFAULT 0,
    realtime_connections_peak integer DEFAULT 0,
    print_jobs_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.tenant_usage_snapshots IS 'Daily snapshots of resource usage per restaurant tenant';
