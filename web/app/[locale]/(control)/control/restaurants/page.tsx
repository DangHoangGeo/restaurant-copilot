import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ControlRestaurantsClient } from '@/components/features/admin/control/control-restaurants-client';
import { buildAuthorizationService } from '@/lib/server/authorization/service';
import { getActiveBranchId } from '@/lib/server/organizations/active-branch';
import {
  listOrganizationBranches,
  listOrganizationEmployees,
} from '@/lib/server/organizations/queries';
import { resolveOrgContext } from '@/lib/server/organizations/service';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.branches' });
  return { title: t('pageTitle') };
}

export default async function ControlRestaurantsPage({
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
  const canManageMenu = authz?.can('restaurant_settings') ?? false;
  const canAddBranch = authz?.canManageMembers() ?? false;
  const canViewEmployees = authz?.can('employees') ?? false;

  const allBranches = await listOrganizationBranches(ctx.organization.id);
  const accessibleIds = new Set(ctx.accessibleRestaurantIds);
  const branches = allBranches.filter((branch) => accessibleIds.has(branch.id));

  const activeBranchId = await getActiveBranchId(ctx);

  const employees = canViewEmployees
    ? await listOrganizationEmployees(ctx.accessibleRestaurantIds)
    : [];

  const employeeCountByBranch = new Map<string, number>();
  for (const emp of employees) {
    employeeCountByBranch.set(emp.restaurant_id, (employeeCountByBranch.get(emp.restaurant_id) ?? 0) + 1);
  }

  const branchesWithMeta = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    subdomain: branch.subdomain,
    employeeCount: employeeCountByBranch.get(branch.id) ?? 0,
    isActive: branch.id === activeBranchId,
  }));

  return (
    <ControlRestaurantsClient
      branches={branchesWithMeta}
      canManageMenu={canManageMenu}
      canAddBranch={canAddBranch}
    />
  );
}
