import { notFound, redirect } from 'next/navigation';
import { buildAuthorizationService } from '@/lib/server/authorization/service';
import { getUserFromRequest, type AuthUser } from '@/lib/server/getUserFromRequest';
import { buildBranchPath } from '@/lib/branch-paths';
import { resolveOrgContext } from './service';
import type { OrgContext } from './types';

interface BranchRouteAccess {
  user: AuthUser;
  organizationContext: OrgContext | null;
  branchId: string;
}

export async function resolveScopedBranchRouteAccess(
  branchId: string
): Promise<BranchRouteAccess | null> {
  const user = await getUserFromRequest();

  if (!user) {
    return null;
  }

  const isLegacyBranchScopedUser =
    user.restaurantId === branchId &&
    (user.role === 'owner' || user.role === 'manager');

  if (isLegacyBranchScopedUser) {
    return {
      user,
      organizationContext: null,
      branchId,
    };
  }

  const organizationContext = await resolveOrgContext();
  const authz = buildAuthorizationService(organizationContext);

  if (!organizationContext || !authz?.canAccessRestaurant(branchId)) {
    return null;
  }

  return {
    user,
    organizationContext,
    branchId,
  };
}

export async function ensureBranchRouteContext(params: {
  locale: string;
  branchId: string;
  suffix?: string;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<BranchRouteAccess> {
  const access = await resolveScopedBranchRouteAccess(params.branchId);

  if (!access?.user) {
    redirect(`/${params.locale}/login`);
  }

  if (!access) {
    notFound();
  }

  if (access.user.restaurantId !== params.branchId) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params.searchParams ?? {})) {
      if (typeof value === 'string' && value.length > 0) {
        search.set(key, value);
      }
    }

    const targetPath = buildBranchPath(params.locale, params.branchId, params.suffix);
    const nextPath = search.size > 0 ? `${targetPath}?${search.toString()}` : targetPath;

    redirect(
      `/api/v1/owner/branch-route/activate?restaurantId=${encodeURIComponent(params.branchId)}&next=${encodeURIComponent(nextPath)}`
    );
  }

  return access;
}
