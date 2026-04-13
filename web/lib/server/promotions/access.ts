// Promotions access resolution — same pattern as purchasing/access.ts.

import { USER_ROLES } from '@/lib/constants';
import { buildAuthorizationService } from '@/lib/server/authorization/service';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { getActiveBranchId } from '@/lib/server/organizations/active-branch';
import { resolveOrgContext } from '@/lib/server/organizations/service';

export interface PromotionsAccess {
  restaurantId: string;
  userId: string;
  canWrite: boolean;
}

export async function resolvePromotionsAccess(): Promise<PromotionsAccess | null> {
  const user = await getUserFromRequest();

  if (
    user?.restaurantId &&
    [USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as 'owner' | 'manager')
  ) {
    return {
      restaurantId: user.restaurantId,
      userId: user.userId,
      canWrite: true,
    };
  }

  const ctx = await resolveOrgContext();
  const authz = buildAuthorizationService(ctx);
  if (!ctx || !authz) return null;

  const activeBranchId = await getActiveBranchId(ctx);
  if (!activeBranchId || !authz.canAccessRestaurant(activeBranchId)) return null;

  const canRead = authz.can('reports') || authz.can('finance_exports');
  if (!canRead) return null;

  return {
    restaurantId: activeBranchId,
    userId: ctx.member.user_id,
    canWrite: authz.can('purchases'),
  };
}
