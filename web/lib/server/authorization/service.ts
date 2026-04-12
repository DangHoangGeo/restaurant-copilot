// Centralized authorization service
//
// All org-level permission checks go through this module.
// Route handlers must NOT implement their own role/permission logic.
//
// Usage:
//   const ctx = await resolveOrgContext();
//   const authz = buildAuthorizationService(ctx);
//   if (!authz.can('finance_exports')) return forbidden();

import { NextResponse } from 'next/server';
import type { OrgContext, OrgPermission, OrgMemberRole } from '../organizations/types';
import {
  ROLE_DEFAULT_PERMISSIONS,
  ROLES_THAT_CAN_MANAGE_MEMBERS,
  ROLES_THAT_CAN_CHANGE_ORG_SETTINGS,
} from './types';

export interface AuthorizationService {
  /** True if the member has the given permission (role default + override). */
  can(permission: OrgPermission): boolean;

  /** True if the member can access the given restaurant. */
  canAccessRestaurant(restaurantId: string): boolean;

  /** True if the member can manage (invite/remove) org members. */
  canManageMembers(): boolean;

  /** True if the member can change organization settings. */
  canChangeOrgSettings(): boolean;

  /** The member's role. */
  role: OrgMemberRole;

  /** The organization ID. */
  organizationId: string;

  /** Restaurant IDs this member may access. */
  accessibleRestaurantIds: string[];
}

/**
 * Build an authorization service from a resolved org context.
 * Returns null if ctx is null (unauthenticated or no org).
 */
export function buildAuthorizationService(
  ctx: OrgContext | null
): AuthorizationService | null {
  if (!ctx) return null;

  const { member, organization, accessibleRestaurantIds, permissionOverrides } = ctx;
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[member.role];

  return {
    role: member.role,
    organizationId: organization.id,
    accessibleRestaurantIds,

    can(permission: OrgPermission): boolean {
      // Explicit override takes precedence over role default
      if (permissionOverrides.has(permission)) {
        return permissionOverrides.get(permission)!;
      }
      return roleDefaults[permission] ?? false;
    },

    canAccessRestaurant(restaurantId: string): boolean {
      return accessibleRestaurantIds.includes(restaurantId);
    },

    canManageMembers(): boolean {
      return ROLES_THAT_CAN_MANAGE_MEMBERS.includes(member.role);
    },

    canChangeOrgSettings(): boolean {
      return ROLES_THAT_CAN_CHANGE_ORG_SETTINGS.includes(member.role);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Response helpers
// ─────────────────────────────────────────────────────────────────────────────

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden: insufficient permissions'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Require an org context or return 401.
 * Pattern:
 *   const ctx = await resolveOrgContext();
 *   const authzError = requireOrgContext(ctx);
 *   if (authzError) return authzError;
 */
export function requireOrgContext(ctx: OrgContext | null): NextResponse | null {
  if (!ctx) return unauthorized('No organization membership found');
  return null;
}

/**
 * Require a specific permission or return 403.
 * Pattern:
 *   const permError = requirePermission(authz, 'finance_exports');
 *   if (permError) return permError;
 */
export function requirePermission(
  authz: AuthorizationService | null,
  permission: OrgPermission
): NextResponse | null {
  if (!authz) return unauthorized();
  if (!authz.can(permission)) {
    return forbidden(`Requires '${permission}' permission`);
  }
  return null;
}

/**
 * Require access to a specific restaurant or return 403.
 */
export function requireRestaurantAccess(
  authz: AuthorizationService | null,
  restaurantId: string
): NextResponse | null {
  if (!authz) return unauthorized();
  if (!authz.canAccessRestaurant(restaurantId)) {
    return forbidden('Access to this branch is not allowed');
  }
  return null;
}
