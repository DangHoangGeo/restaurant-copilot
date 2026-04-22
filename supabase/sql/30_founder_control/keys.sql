-- 30_founder_control/keys.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '30_founder_control/keys.sql'

ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_member_id_permission_key UNIQUE (member_id, permission);

ALTER TABLE ONLY public.organization_member_permissions
    ADD CONSTRAINT organization_member_permissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_member_id_restaurant_id_key UNIQUE (member_id, restaurant_id);

ALTER TABLE ONLY public.organization_member_shop_scopes
    ADD CONSTRAINT organization_member_shop_scopes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_menu_categories
    ADD CONSTRAINT organization_menu_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_menu_items
    ADD CONSTRAINT organization_menu_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_invite_token_key UNIQUE (invite_token);

ALTER TABLE ONLY public.organization_pending_invites
    ADD CONSTRAINT organization_pending_invites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_organization_id_restaurant_id_key UNIQUE (organization_id, restaurant_id);

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_restaurants
    ADD CONSTRAINT organization_restaurants_restaurant_id_key UNIQUE (restaurant_id);

ALTER TABLE ONLY public.owner_organizations
    ADD CONSTRAINT owner_organizations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.owner_organizations
    ADD CONSTRAINT owner_organizations_slug_key UNIQUE (slug);

CREATE INDEX idx_org_member_permissions_member_id ON public.organization_member_permissions USING btree (member_id);

CREATE INDEX idx_org_member_shop_scopes_member_id ON public.organization_member_shop_scopes USING btree (member_id);

CREATE INDEX idx_org_members_org_id ON public.organization_members USING btree (organization_id);

CREATE INDEX idx_org_members_user_id ON public.organization_members USING btree (user_id);

CREATE INDEX idx_org_restaurants_org_id ON public.organization_restaurants USING btree (organization_id);

CREATE INDEX idx_org_restaurants_restaurant_id ON public.organization_restaurants USING btree (restaurant_id);

CREATE INDEX idx_organization_menu_categories_org_position ON public.organization_menu_categories USING btree (organization_id, "position");

CREATE INDEX idx_organization_menu_items_org_category_position ON public.organization_menu_items USING btree (organization_id, category_id, "position");

CREATE INDEX idx_owner_organizations_created_by ON public.owner_organizations USING btree (created_by);

CREATE UNIQUE INDEX idx_owner_organizations_public_subdomain_unique ON public.owner_organizations USING btree (public_subdomain);

CREATE INDEX idx_pending_invites_email ON public.organization_pending_invites USING btree (email);

CREATE INDEX idx_pending_invites_is_active ON public.organization_pending_invites USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_pending_invites_org_id ON public.organization_pending_invites USING btree (organization_id);

CREATE INDEX idx_pending_invites_token ON public.organization_pending_invites USING btree (invite_token);
