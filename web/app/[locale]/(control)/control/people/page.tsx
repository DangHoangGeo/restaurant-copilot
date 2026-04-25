import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ControlPeopleClient } from "@/components/features/admin/control/control-people-client";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { getBranchTeamPayrollData } from "@/lib/server/control/branch-team";
import { listPendingInvites } from "@/lib/server/organizations/invites";
import {
  listOrganizationBranches,
  listOrganizationEmployees,
  listOrganizationMembers,
} from "@/lib/server/organizations/queries";
import type {
  ApiOrganizationMember,
  ApiPendingInvite,
} from "@/shared/types/organization";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.control" });
  return { title: t("people.title") };
}

export default async function ControlPeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ branch?: string; month?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const ctx = await resolveFounderControlContext();

  if (!ctx) {
    notFound();
  }

  const authz = buildAuthorizationService(ctx);
  const canManage = authz?.canManageMembers() ?? false;
  const canViewEmployees = authz?.can("employees") ?? false;
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
    ctx.accessibleRestaurantIds.includes(branch.id),
  );
  const requestedBranchId = query?.branch ?? null;
  const requestedMonth =
    query?.month && /^\d{4}-\d{2}$/.test(query.month) ? query.month : null;
  const selectedBranch =
    accessibleBranches.find((branch) => branch.id === requestedBranchId) ??
    accessibleBranches[0] ??
    null;
  const selectedBranchEmployees = selectedBranch
    ? employees.filter(
        (employee) => employee.restaurant_id === selectedBranch.id,
      )
    : [];
  const selectedTeamPayroll =
    selectedBranch && canViewEmployees
      ? await getBranchTeamPayrollData({
          branchId: selectedBranch.id,
          employees: selectedBranchEmployees,
          timezone: ctx.organization.timezone,
          currency: ctx.organization.currency,
          monthKey: requestedMonth,
        })
      : null;

  return (
    <ControlPeopleClient
      locale={locale}
      members={mappedMembers}
      pendingInvites={mappedInvites}
      branches={accessibleBranches}
      employees={employees}
      selectedBranchId={selectedBranch?.id ?? null}
      selectedTeamPayroll={selectedTeamPayroll}
      currency={ctx.organization.currency}
      canManage={canManage}
      canViewEmployees={canViewEmployees}
    />
  );
}
