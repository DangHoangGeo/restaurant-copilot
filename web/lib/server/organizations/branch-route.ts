import { notFound, redirect } from "next/navigation";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import {
  getUserFromRequest,
  type AuthUser,
} from "@/lib/server/getUserFromRequest";
import { buildBranchPath } from "@/lib/branch-paths";
import { getRequiredBranchRoutePermission } from "@/lib/branch-route-permissions";
import { resolveOrgContext } from "./service";
import type { OrgContext } from "./types";

interface BranchRouteAccess {
  user: AuthUser;
  organizationContext: OrgContext | null;
  branchId: string;
}

interface BranchRouteAccessDecision {
  user: AuthUser | null;
  access: BranchRouteAccess | null;
  reason: "unauthenticated" | "forbidden" | null;
}

export async function resolveScopedBranchRouteAccess(
  branchId: string,
  suffix?: string,
): Promise<BranchRouteAccess | null> {
  const decision = await resolveBranchRouteAccessDecision(branchId, suffix);

  return decision.access;
}

export async function resolveBranchRouteAccessDecision(
  branchId: string,
  suffix?: string,
): Promise<BranchRouteAccessDecision> {
  const user = await getUserFromRequest();

  if (!user) {
    return {
      user: null,
      access: null,
      reason: "unauthenticated",
    };
  }

  const organizationContext = await resolveOrgContext();
  const authz = buildAuthorizationService(organizationContext);

  if (organizationContext) {
    if (!authz?.canAccessRestaurant(branchId)) {
      return {
        user,
        access: null,
        reason: "forbidden",
      };
    }

    const requiredPermission = getRequiredBranchRoutePermission(suffix);
    if (requiredPermission && !authz.can(requiredPermission)) {
      return {
        user,
        access: null,
        reason: "forbidden",
      };
    }

    return {
      user,
      access: {
        user,
        organizationContext,
        branchId,
      },
      reason: null,
    };
  }

  const isLegacyBranchScopedUser =
    user.restaurantId === branchId &&
    (user.role === "owner" || user.role === "manager");

  if (isLegacyBranchScopedUser) {
    return {
      user,
      access: {
        user,
        organizationContext: null,
        branchId,
      },
      reason: null,
    };
  }

  return {
    user,
    access: null,
    reason: "forbidden",
  };
}

export async function ensureBranchRouteContext(params: {
  locale: string;
  branchId: string;
  suffix?: string;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<BranchRouteAccess> {
  const decision = await resolveBranchRouteAccessDecision(
    params.branchId,
    params.suffix,
  );
  const access = decision.access;

  if (decision.reason === "unauthenticated") {
    redirect(`/${params.locale}/login`);
  }

  if (!access) {
    notFound();
  }

  if (access.user.restaurantId !== params.branchId) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params.searchParams ?? {})) {
      if (typeof value === "string" && value.length > 0) {
        search.set(key, value);
      }
    }

    const targetPath = buildBranchPath(
      params.locale,
      params.branchId,
      params.suffix,
    );
    const nextPath =
      search.size > 0 ? `${targetPath}?${search.toString()}` : targetPath;

    redirect(
      `/api/v1/owner/branch-route/activate?restaurantId=${encodeURIComponent(params.branchId)}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  return access;
}
