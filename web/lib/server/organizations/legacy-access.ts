import type { OrgMemberRole } from "./types";

export type LegacyUserRole = "owner" | "manager" | "staff";

export interface LegacyUserAccess {
  role: LegacyUserRole;
  restaurantId: string | null;
  grantsBranchAccess: boolean;
}

export function mapOrgRoleToLegacyUserAccess(
  orgRole: OrgMemberRole,
  restaurantId: string | null,
): LegacyUserAccess {
  switch (orgRole) {
    case "founder_full_control":
    case "founder_operations":
      return {
        role: "owner",
        restaurantId,
        grantsBranchAccess: restaurantId !== null,
      };
    case "founder_finance":
    case "branch_general_manager":
      return {
        role: "manager",
        restaurantId,
        grantsBranchAccess: restaurantId !== null,
      };
    case "accountant_readonly":
      return {
        role: "staff",
        restaurantId: null,
        grantsBranchAccess: false,
      };
  }
}
