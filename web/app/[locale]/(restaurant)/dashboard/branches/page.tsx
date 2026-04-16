// Branches management page
// Phase 3: shows all org branches, active-branch switcher,
// menu copy tool, and menu comparison tool.

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import { listOrganizationBranches } from "@/lib/server/organizations/queries";
import { getActiveBranchId } from "@/lib/server/organizations/active-branch";
import { BranchesClient } from "./branches-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.branches" });
  return { title: t("pageTitle") };
}

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const ctx = await resolveOrgContext();
  if (!ctx) {
    redirect(`/${locale}/login`);
  }

  const authz = buildAuthorizationService(ctx);
  const canManageMenu = authz?.canManageMembers() ?? false;
  const canAddBranch = authz?.canManageMembers() ?? false;

  const allBranches = await listOrganizationBranches(ctx.organization.id);

  // Filter to what this member can access
  const accessibleIds = new Set(ctx.accessibleRestaurantIds);
  const branches = allBranches.filter((b) => accessibleIds.has(b.id));

  const activeBranchId = await getActiveBranchId(ctx);

  return (
    <BranchesClient
      branches={branches}
      activeBranchId={activeBranchId}
      canManageMenu={canManageMenu}
      canAddBranch={canAddBranch}
    />
  );
}
