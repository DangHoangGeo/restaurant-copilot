import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ControlPeopleClient } from '@/components/features/admin/control/control-people-client';
import { buildAuthorizationService } from '@/lib/server/authorization/service';
import { listPendingInvites } from '@/lib/server/organizations/invites';
import {
  listOrganizationBranches,
  listOrganizationEmployees,
  listOrganizationMembers,
} from '@/lib/server/organizations/queries';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import type {
  ApiOrganizationMember,
  ApiPendingInvite,
} from '@/shared/types/organization';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.control' });
  return { title: t('people.title') };
}

export default async function ControlPeoplePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ctx = await resolveOrgContext();

  if (!ctx) {
    redirect(`/${locale}/dashboard`);
  }

  const authz = buildAuthorizationService(ctx);
  const canManage = authz?.canManageMembers() ?? false;
  const canViewEmployees = authz?.can('employees') ?? false;
  const canViewPeople = canManage || canViewEmployees;

  if (!canViewPeople) {
    redirect(`/${locale}/control/overview`);
  }

  const [members, pendingInvites, branches, employees] = await Promise.all([
    listOrganizationMembers(ctx.organization.id),
    listPendingInvites(ctx.organization.id),
    listOrganizationBranches(ctx.organization.id),
    canViewEmployees
      ? listOrganizationEmployees(ctx.accessibleRestaurantIds)
      : Promise.resolve([]),
  ]);

  const mappedMembers: ApiOrganizationMember[] = members.map((member) => ({
    id: member.id,
    organization_id: member.organization_id,
    user_id: member.user_id,
    role: member.role,
    shop_scope: member.shop_scope,
    joined_at: member.joined_at,
    is_active: member.is_active,
    email: member.email,
    name: member.name,
    accessible_restaurant_ids: member.accessible_restaurant_ids,
  }));
  const mappedInvites: ApiPendingInvite[] = pendingInvites.map((invite) => ({
    id: invite.id,
    organization_id: invite.organization_id,
    invited_by: invite.invited_by,
    email: invite.email,
    role: invite.role,
    shop_scope: invite.shop_scope,
    selected_restaurant_ids: invite.selected_restaurant_ids,
    expires_at: invite.expires_at,
    accepted_at: invite.accepted_at,
    is_active: invite.is_active,
    created_at: invite.created_at,
  }));

  const accessibleBranches = branches.filter((branch) =>
    ctx.accessibleRestaurantIds.includes(branch.id)
  );

  return (
    <ControlPeopleClient
      locale={locale}
      members={mappedMembers}
      pendingInvites={mappedInvites}
      branches={accessibleBranches}
      employees={employees}
      canManage={canManage}
      canViewEmployees={canViewEmployees}
    />
  );
}
