import { USER_ROLES } from '@/lib/constants';
import { buildAuthorizationService } from '@/lib/server/authorization/service';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { getActiveBranchId } from '@/lib/server/organizations/active-branch';
import { resolveOrgContext } from '@/lib/server/organizations/service';

export interface PurchasingAccess {
  restaurantId: string;
  userId: string | null;
  canWrite: boolean;
}

export async function resolvePurchasingAccess(): Promise<PurchasingAccess | null> {
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

  const canRead =
    authz.can('purchases') ||
    authz.can('reports') ||
    authz.can('finance_exports');

  if (!canRead) return null;

  return {
    restaurantId: activeBranchId,
    userId: ctx.member.user_id,
    canWrite: authz.can('purchases'),
  };
}

export async function resolveScopedBranchPurchasingAccess(
  restaurantId: string
): Promise<PurchasingAccess | null> {
  const ctx = await resolveOrgContext();
  const authz = buildAuthorizationService(ctx);
  if (!ctx || !authz) return null;

  if (!authz.canAccessRestaurant(restaurantId)) return null;

  const canRead =
    authz.can('purchases') ||
    authz.can('reports') ||
    authz.can('finance_exports');

  if (!canRead) return null;

  return {
    restaurantId,
    userId: ctx.member.user_id,
    canWrite: authz.can('purchases'),
  };
}
