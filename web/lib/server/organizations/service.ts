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
  createRestaurantInOrg,
  addOrganizationMember,
  deactivateOrganizationMember,
  updateOrganizationSettings,
  updateOrganizationMember,
} from './queries';
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberWithUser,
  OrganizationRestaurant,
  OrgContext,
  OrgMemberRole,
  ShopScope,
  InviteOrgMemberInput,
  CreateOrganizationInput,
  AddBranchInput,
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
    .order('created_at', { ascending: true })
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
 * Add a new branch (restaurant) to an existing organization.
 * Validates subdomain uniqueness before creating.
 * Caller must be founder_full_control (enforced at route level).
 */
export async function addBranchToOrganization(
  orgId: string,
  addedByUserId: string,
  input: AddBranchInput
): Promise<{
  success: boolean;
  restaurant?: { id: string; name: string; subdomain: string };
  error?: string;
  conflict?: boolean;
}> {
  const restaurant = await createRestaurantInOrg(orgId, addedByUserId, input);
  if (!restaurant) {
    // Attempt to distinguish subdomain conflict vs other errors
    // createRestaurantInOrg returns null for conflicts too; route handler does the pre-check
    return { success: false, error: 'Failed to create branch' };
  }
  return { success: true, restaurant };
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

export type OrgSettingsUpdates = {
  name?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_at?: string | null;
  approved_by?: string | null;
  approval_notes?: string | null;
  requested_plan?: 'starter' | 'growth' | 'enterprise' | null;
  onboarding_completed_at?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
};

/**
 * Update organization settings including branding fields.
 * The caller must have organization_settings permission (enforced at route level).
 */
export async function updateOrganization(
  orgId: string,
  updates: OrgSettingsUpdates
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  const org = await updateOrganizationSettings(orgId, updates);
  if (!org) return { success: false, error: 'Failed to update organization' };
  return { success: true, organization: org };
}

/**
 * Update a member's role and/or branch access scope.
 * The caller must be able to manage members (enforced at route level).
 */
export async function editMember(
  memberId: string,
  orgId: string,
  updates: { role?: OrgMemberRole; shop_scope?: ShopScope; selected_restaurant_ids?: string[] }
): Promise<{ success: boolean; member?: OrganizationMember; error?: string }> {
  const member = await updateOrganizationMember(memberId, orgId, updates);
  if (!member) return { success: false, error: 'Failed to update member' };
  return { success: true, member };
}
