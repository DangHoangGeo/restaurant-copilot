-- 30_founder_control/policies.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '30_founder_control/policies.sql'

CREATE POLICY "Org founders can add restaurants to their organization" ON public.organization_restaurants FOR INSERT WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can create pending invites" ON public.organization_pending_invites FOR INSERT WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can delete members" ON public.organization_members FOR DELETE USING (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can insert members" ON public.organization_members FOR INSERT WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can manage permissions" ON public.organization_member_permissions USING (public.is_org_founder(organization_id)) WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can manage shop scopes" ON public.organization_member_shop_scopes USING (public.is_org_founder(organization_id)) WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can remove restaurants from their organization" ON public.organization_restaurants FOR DELETE USING (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can revoke pending invites" ON public.organization_pending_invites FOR UPDATE USING (public.is_org_founder(organization_id)) WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can update members" ON public.organization_members FOR UPDATE USING (public.is_org_founder(organization_id)) WITH CHECK (public.is_org_founder(organization_id));

CREATE POLICY "Org founders can update their organization" ON public.owner_organizations FOR UPDATE USING (public.is_org_founder(id)) WITH CHECK (public.is_org_founder(id));

CREATE POLICY "Org members can view members of their organization" ON public.organization_members FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view pending invites" ON public.organization_pending_invites FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view permissions in their organization" ON public.organization_member_permissions FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view restaurants in their organization" ON public.organization_restaurants FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view shop scopes in their organization" ON public.organization_member_shop_scopes FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view their organization" ON public.owner_organizations FOR SELECT USING (public.is_org_member(id));

ALTER TABLE public.organization_member_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_member_shop_scopes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_pending_invites ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_restaurants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.owner_organizations ENABLE ROW LEVEL SECURITY;
