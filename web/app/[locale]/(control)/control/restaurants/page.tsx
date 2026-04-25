import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ControlRestaurantsClient } from "@/components/features/admin/control/control-restaurants-client";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { getActiveBranchId } from "@/lib/server/organizations/active-branch";
import { getFounderControlOverview } from "@/lib/server/control/overview";
import { listOrganizationBranches } from "@/lib/server/organizations/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.branches" });
  return { title: t("pageTitle") };
}

export default async function ControlRestaurantsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ctx = await resolveFounderControlContext();

  if (!ctx) {
    notFound();
  }

  const authz = buildAuthorizationService(ctx);
  const canAddBranch = authz?.canManageMembers() ?? false;
  const [allBranches, overview] = await Promise.all([
    listOrganizationBranches(ctx.organization.id),
    getFounderControlOverview({
      organizationId: ctx.organization.id,
      accessibleRestaurantIds: ctx.accessibleRestaurantIds,
      timezone: ctx.organization.timezone,
      locale,
    }),
  ]);
  const accessibleIds = new Set(ctx.accessibleRestaurantIds);
  const branches = allBranches.filter((branch) => accessibleIds.has(branch.id));

  const activeBranchId = await getActiveBranchId(ctx);
  const overviewBranchById = new Map(
    overview.branches.map((branch) => [branch.restaurant_id, branch]),
  );

  const branchesWithMeta = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    subdomain: branch.subdomain,
    branchCode: branch.branch_code ?? branch.subdomain,
    employeeCount: overviewBranchById.get(branch.id)?.employee_count ?? 0,
    isActive: branch.id === activeBranchId,
    onboarded: branch.onboarded ?? false,
    address: branch.address ?? null,
    phone: branch.phone ?? null,
    email: branch.email ?? null,
  }));

  return (
    <ControlRestaurantsClient
      branches={branchesWithMeta}
      overview={overview}
      canAddBranch={canAddBranch}
      companyPublicSubdomain={ctx.organization.public_subdomain ?? null}
      currency={ctx.organization.currency}
    />
  );
}
