import type { OrgPermission } from "@/lib/server/organizations/types";

export type BranchRoutePermissionMap = Partial<Record<string, OrgPermission>>;

export const BRANCH_ROUTE_PERMISSION_REQUIREMENTS: BranchRoutePermissionMap = {
  menu: "restaurant_settings",
  tables: "restaurant_settings",
  onboarding: "restaurant_settings",
  reports: "reports",
  finance: "reports",
  purchasing: "purchases",
  employees: "employees",
  staff: "employees",
  promotions: "promotions",
};

export function getRequiredBranchRoutePermission(
  suffix: string | null | undefined,
): OrgPermission | null {
  if (!suffix) {
    return null;
  }

  return BRANCH_ROUTE_PERMISSION_REQUIREMENTS[suffix] ?? null;
}
