// Active branch context model
//
// Phase 2 defines one explicit strategy for branch context in multi-branch orgs:
//
//   - The active restaurant_id is stored in a server-set httpOnly cookie
//     named ACTIVE_BRANCH_COOKIE.
//   - Routes that need branch context call getActiveBranchId(ctx).
//   - getActiveBranchId validates the cookie value against the org context's
//     accessibleRestaurantIds and falls back to the first accessible restaurant.
//   - Setting active branch goes through PUT /api/v1/owner/organization/active-branch,
//     which validates access before setting the cookie.
//
// For existing single-restaurant owners, getUserFromRequest().restaurantId continues
// to work unchanged. This module is only called by org-aware routes.
//
// Cookie is httpOnly and SameSite=Lax so it is not readable by client JS.
// The branch context is validated server-side on every read.

import { cookies } from 'next/headers';
import type { OrgContext } from './types';

export const ACTIVE_BRANCH_COOKIE = 'x-coorder-active-branch';

// Cookie options — httpOnly prevents client JS from reading the branch context.
// SameSite=Lax allows normal navigation while blocking CSRF from other origins.
export const ACTIVE_BRANCH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  // 30-day max age; cleared on logout via logout route
  maxAge: 60 * 60 * 24 * 30,
  // Secure in production, not required in development
  secure: process.env.NODE_ENV === 'production',
};

/**
 * Read the active restaurant_id for an org member.
 *
 * Resolution order:
 *   1. Cookie value — if present AND in ctx.accessibleRestaurantIds
 *   2. First element of ctx.accessibleRestaurantIds (fallback)
 *   3. null if the member has no accessible restaurants
 */
export async function getActiveBranchId(ctx: OrgContext): Promise<string | null> {
  if (ctx.accessibleRestaurantIds.length === 0) return null;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value;

  if (cookieValue && ctx.accessibleRestaurantIds.includes(cookieValue)) {
    return cookieValue;
  }

  // Fall back to first accessible restaurant
  return ctx.accessibleRestaurantIds[0];
}

/**
 * Build the Set-Cookie header value for the active branch.
 * Used in route handlers that need to set the cookie in a NextResponse.
 */
export function buildActiveBranchCookieHeader(restaurantId: string): string {
  const opts = ACTIVE_BRANCH_COOKIE_OPTIONS;
  const parts = [
    `${ACTIVE_BRANCH_COOKIE}=${restaurantId}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    'SameSite=Lax',
    'HttpOnly',
  ];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Clear the active branch cookie (e.g. on logout or branch deactivation).
 */
export function buildClearActiveBranchCookieHeader(): string {
  return `${ACTIVE_BRANCH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}
