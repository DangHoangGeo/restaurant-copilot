// Finance access resolution — same pattern as purchasing/access.ts.
// Resolves the active branch and checks that the caller is owner or manager.

import { USER_ROLES } from '@/lib/constants';
import { buildAuthorizationService } from '@/lib/server/authorization/service';
import { resolveFounderControlContext } from '@/lib/server/control/access';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { getActiveBranchId } from '@/lib/server/organizations/active-branch';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface FinanceAccess {
  restaurantId: string;
  organizationId: string | null;
  userId: string;
  currency: string;
  canExport: boolean;
  /** Only owners can close a month. */
  canClose: boolean;
}

export interface OrganizationFinanceAccess {
  organizationId: string;
  userId: string;
  currency: string;
  accessibleRestaurantIds: string[];
  canExport: boolean;
  canClose: boolean;
  canViewIncome: boolean;
  canViewSpending: boolean;
  canManageExpenses: boolean;
}

export async function resolveFinanceAccess(): Promise<FinanceAccess | null> {
  // Fast path: restaurant-scoped JWT (owner or manager)
  const user = await getUserFromRequest();

  if (
    user?.restaurantId &&
    [USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as 'owner' | 'manager')
  ) {
    const orgContext = await resolveOrgContext();
    const currency = await getBranchCurrency(user.restaurantId);
    return {
      restaurantId: user.restaurantId,
      organizationId: orgContext?.organization.id ?? null,
      userId: user.userId,
      currency,
      canExport: user.role === USER_ROLES.OWNER,
      canClose: user.role === USER_ROLES.OWNER,
    };
  }

  // Org-context path (multi-branch)
  const ctx = await resolveOrgContext();
  const authz = buildAuthorizationService(ctx);
  if (!ctx || !authz) return null;

  const activeBranchId = await getActiveBranchId(ctx);
  if (!activeBranchId || !authz.canAccessRestaurant(activeBranchId)) return null;

  const canAccess = authz.can('reports') || authz.can('finance_exports');
  if (!canAccess) return null;

  const currency = await getBranchCurrency(activeBranchId);

  return {
    restaurantId: activeBranchId,
    organizationId: ctx.organization?.id ?? null,
    userId: ctx.member.user_id,
    currency,
    canExport: authz.can('finance_exports'),
    canClose:
      ctx.member.role === 'founder_full_control' &&
      authz.can('finance_exports'),
  };
}

export async function resolveScopedBranchFinanceAccess(
  restaurantId: string
): Promise<FinanceAccess | null> {
  const ctx = await resolveOrgContext();
  const authz = buildAuthorizationService(ctx);

  if (!ctx || !authz) {
    return null;
  }

  if (!authz.canAccessRestaurant(restaurantId)) {
    return null;
  }

  const canAccess = authz.can('reports') || authz.can('finance_exports');
  if (!canAccess) {
    return null;
  }

  const currency = await getBranchCurrency(restaurantId);

  return {
    restaurantId,
    organizationId: ctx.organization?.id ?? null,
    userId: ctx.member.user_id,
    currency,
    canExport: authz.can('finance_exports'),
    canClose:
      ctx.member.role === 'founder_full_control' &&
      authz.can('finance_exports'),
  };
}

export async function resolveOrganizationFinanceAccess(): Promise<OrganizationFinanceAccess | null> {
  const ctx = await resolveFounderControlContext();
  const authz = buildAuthorizationService(ctx);

  if (!ctx || !authz) {
    return null;
  }

  const canViewIncome = authz.can('reports') || authz.can('finance_exports');
  const canViewSpending = authz.can('purchases') || authz.can('finance_exports');

  if (!canViewIncome && !canViewSpending) {
    return null;
  }

  return {
    organizationId: ctx.organization.id,
    userId: ctx.member.user_id,
    currency: ctx.organization.currency,
    accessibleRestaurantIds: ctx.accessibleRestaurantIds,
    canExport: authz.can('finance_exports'),
    canClose:
      ctx.member.role === 'founder_full_control' &&
      authz.can('finance_exports'),
    canViewIncome,
    canViewSpending,
    canManageExpenses: authz.can('purchases'),
  };
}

async function getBranchCurrency(restaurantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('currency')
    .eq('id', restaurantId)
    .maybeSingle();

  return (data?.currency as string | null) ?? 'JPY';
}
