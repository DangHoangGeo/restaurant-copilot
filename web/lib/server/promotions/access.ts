// Promotions access resolution — same pattern as purchasing/access.ts.

import { USER_ROLES } from "@/lib/constants";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { getActiveBranchId } from "@/lib/server/organizations/active-branch";
import { resolveOrgContext } from "@/lib/server/organizations/service";

export interface PromotionsAccess {
  restaurantId: string;
  userId: string;
  canWrite: boolean;
}

export async function resolvePromotionsAccess(): Promise<PromotionsAccess | null> {
  const user = await getUserFromRequest();
  const ctx = await resolveOrgContext();
  const authz = buildAuthorizationService(ctx);

  if (ctx && authz) {
    const activeBranchId = await getActiveBranchId(ctx);
    if (!activeBranchId || !authz.canAccessRestaurant(activeBranchId))
      return null;

    if (!authz.can("promotions")) return null;

    return {
      restaurantId: activeBranchId,
      userId: ctx.member.user_id,
      canWrite: authz.can("promotions"),
    };
  }

  // Legacy branch-scoped path remains only for users without org membership.
  if (
    user?.restaurantId &&
    [USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(
      user.role as "owner" | "manager",
    )
  ) {
    return {
      restaurantId: user.restaurantId,
      userId: user.userId,
      canWrite: true,
    };
  }

  return null;
}

export async function resolveScopedBranchPromotionsAccess(
  restaurantId: string,
): Promise<PromotionsAccess | null> {
  const ctx = await resolveOrgContext();
  const authz = buildAuthorizationService(ctx);
  if (!ctx || !authz) return null;

  if (!authz.canAccessRestaurant(restaurantId)) return null;

  if (!authz.can("promotions")) return null;

  return {
    restaurantId,
    userId: ctx.member.user_id,
    canWrite: authz.can("promotions"),
  };
}
