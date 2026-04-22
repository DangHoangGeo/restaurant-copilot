-- 60_platform_admin_support/keys.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '60_platform_admin_support/keys.sql'

ALTER SEQUENCE public.support_tickets_ticket_number_seq OWNED BY public.support_tickets.ticket_number;

ALTER TABLE ONLY public.support_tickets ALTER COLUMN ticket_number SET DEFAULT nextval('public.support_tickets_ticket_number_seq'::regclass);

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_email_key UNIQUE (email);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.platform_audit_logs
    ADD CONSTRAINT platform_audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sla_config
    ADD CONSTRAINT sla_config_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sla_config
    ADD CONSTRAINT sla_config_ticket_priority_key UNIQUE (ticket_priority);

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_number_key UNIQUE (ticket_number);

ALTER TABLE ONLY public.tenant_usage_snapshots
    ADD CONSTRAINT tenant_usage_snapshots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant_usage_snapshots
    ADD CONSTRAINT tenant_usage_snapshots_restaurant_id_snapshot_date_key UNIQUE (restaurant_id, snapshot_date);

CREATE INDEX idx_email_notifications_pending ON public.email_notifications USING btree (status, created_at) WHERE (status = 'pending'::text);

CREATE INDEX idx_platform_admins_email ON public.platform_admins USING btree (email) WHERE (is_active = true);

CREATE INDEX idx_platform_admins_user_id ON public.platform_admins USING btree (user_id) WHERE (is_active = true);

CREATE INDEX idx_platform_audit_logs_action ON public.platform_audit_logs USING btree (action);

CREATE INDEX idx_platform_audit_logs_admin_id ON public.platform_audit_logs USING btree (admin_id, created_at DESC);

CREATE INDEX idx_platform_audit_logs_created_at ON public.platform_audit_logs USING btree (created_at DESC);

CREATE INDEX idx_platform_audit_logs_resource ON public.platform_audit_logs USING btree (resource_type, resource_id);

CREATE INDEX idx_platform_audit_logs_restaurant_id ON public.platform_audit_logs USING btree (restaurant_id, created_at DESC);

CREATE INDEX idx_support_ticket_messages_posted_by ON public.support_ticket_messages USING btree (posted_by);

CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages USING btree (ticket_id, created_at);

CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);

CREATE INDEX idx_support_tickets_category ON public.support_tickets USING btree (category);

CREATE INDEX idx_support_tickets_created_at ON public.support_tickets USING btree (created_at DESC);

CREATE INDEX idx_support_tickets_priority ON public.support_tickets USING btree (priority);

CREATE INDEX idx_support_tickets_restaurant_id ON public.support_tickets USING btree (restaurant_id);

CREATE INDEX idx_support_tickets_sla_breach ON public.support_tickets USING btree (resolution_sla_breach, status) WHERE (status <> ALL (ARRAY['resolved'::text, 'closed'::text]));

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);

CREATE INDEX idx_tenant_usage_snapshots_date ON public.tenant_usage_snapshots USING btree (snapshot_date DESC);

CREATE INDEX idx_tenant_usage_snapshots_restaurant_date ON public.tenant_usage_snapshots USING btree (restaurant_id, snapshot_date DESC);
