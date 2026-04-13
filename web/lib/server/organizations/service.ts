// Organization domain: business logic service
// All service functions validate inputs, enforce org-level invariants,
// and delegate to queries. Route handlers call service functions, not queries directly.

import {
  getMyOrganization,
  listOrganizationMembers,
  listOrganizationRestaurants,
  getAccessibleRestaurantIds,
  getMemberPermissionOverrides,
  createOrganizationForNewRestaurant,
  addOrganizationMember,
  deactivateOrganizationMember,
} from './queries';
import type {
  Organization,
  OrganizationMemberWithUser,
  OrganizationRestaurant,
  OrgContext,
  OrgMemberRole,
  ShopScope,
  InviteOrgMemberInput,
  CreateOrganizationInput,
} from './types';
import { createClient } from '@/lib/supabase/server';

// ─────────────────────────────────────────────────────────────────────────────
// Context resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the full organization context for the currently authenticated user.
 * Returns null if the user has no org membership.
 */
export async function resolveOrgContext(): Promise<OrgContext | null> {
  const supabase = await createClient();

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  // Find the user's active org membership
  const { data: memberRows, error } = await supabase
    .from('organization_members')
    .select('*, owner_organizations(*)')
    .eq('user_id', supabaseUser.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !memberRows) return null;

  const org = Array.isArray(memberRows.owner_organizations)
    ? memberRows.owner_organizations[0]
    : memberRows.owner_organizations;

  if (!org) return null;

  const member = {
    id: memberRows.id,
    organization_id: memberRows.organization_id,
    user_id: memberRows.user_id,
    role: memberRows.role as OrgMemberRole,
    shop_scope: memberRows.shop_scope as ShopScope,
    invited_by: memberRows.invited_by,
    joined_at: memberRows.joined_at,
    is_active: memberRows.is_active,
    created_at: memberRows.created_at,
    updated_at: memberRows.updated_at,
  };

  const [accessibleRestaurantIds, permissionOverrides] = await Promise.all([
    getAccessibleRestaurantIds(org.id, member.id, member.shop_scope),
    getMemberPermissionOverrides(member.id),
  ]);

  return {
    organization: org as Organization,
    member,
    accessibleRestaurantIds,
    permissionOverrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Organization read operations
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrganizationSummary(): Promise<Organization | null> {
  return getMyOrganization();
}

export async function getOrganizationMembers(
  orgId: string
): Promise<OrganizationMemberWithUser[]> {
  return listOrganizationMembers(orgId);
}

export async function getOrganizationBranches(
  orgId: string
): Promise<OrganizationRestaurant[]> {
  return listOrganizationRestaurants(orgId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Organization write operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bootstrap an organization for a newly registered restaurant.
 * Called from the register route handler — uses admin client internally.
 */
export async function bootstrapOrganizationForRestaurant(
  userId: string,
  restaurantId: string,
  input: CreateOrganizationInput
): Promise<{ organizationId: string; memberId: string } | null> {
  return createOrganizationForNewRestaurant(userId, restaurantId, input);
}

/**
 * Invite a user into the organization.
 * The inviter must already be an org member (validated by RLS).
 * The target user must already have a Supabase auth account.
 */
export async function inviteOrganizationMember(
  orgId: string,
  inviterUserId: string,
  input: InviteOrgMemberInput
): Promise<{ success: boolean; error?: string }> {
  // Resolve the target user by email
  const supabase = await createClient();
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', input.email)
    .single();

  if (userError || !targetUser) {
    return { success: false, error: 'User with this email not found' };
  }

  // Prevent duplicate membership
  const { data: existing } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', targetUser.id)
    .single();

  if (existing) {
    return { success: false, error: 'User is already a member of this organization' };
  }

  const member = await addOrganizationMember(
    orgId,
    targetUser.id,
    inviterUserId,
    input.role,
    input.shop_scope,
    input.selected_restaurant_ids
  );

  if (!member) {
    return { success: false, error: 'Failed to add member' };
  }

  return { success: true };
}

/**
 * Remove a member from the organization (soft delete).
 * The caller must be a founder (enforced at the route/RLS level).
 */
export async function removeMember(memberId: string): Promise<{ success: boolean }> {
  const ok = await deactivateOrganizationMember(memberId);
  return { success: ok };
}
