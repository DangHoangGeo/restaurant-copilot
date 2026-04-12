// Organization domain: database queries
// All queries are scoped to the calling user via RLS.
// Use supabaseAdmin only in server-side admin contexts (e.g. registration).

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberWithUser,
  OrganizationRestaurant,
  OrgMemberRole,
  ShopScope,
  OrgPermission,
  CreateOrganizationInput,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Read queries (use RLS-scoped client)
// ─────────────────────────────────────────────────────────────────────────────

/** Get the organization the calling user belongs to (first active membership). */
export async function getMyOrganization(): Promise<Organization | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, owner_organizations(*)')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !data) return null;

  const org = Array.isArray(data.owner_organizations)
    ? data.owner_organizations[0]
    : data.owner_organizations;

  return (org as Organization) ?? null;
}

/** Get organization by ID (RLS ensures the caller is a member). */
export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('owner_organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error || !data) return null;
  return data as Organization;
}

/** List all members of an organization (RLS-scoped). */
export async function listOrganizationMembers(
  orgId: string
): Promise<OrganizationMemberWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  // Enrich with user email/name via admin client (users table is RLS-restricted)
  const userIds = (data as OrganizationMember[]).map((m) => m.user_id);
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .in('id', userIds);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return (data as OrganizationMember[]).map((member) => {
    const u = userMap.get(member.user_id);
    return {
      ...member,
      email: u?.email ?? '',
      name: u?.name ?? null,
    };
  });
}

/** List restaurants belonging to an organization (RLS-scoped). */
export async function listOrganizationRestaurants(
  orgId: string
): Promise<OrganizationRestaurant[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_restaurants')
    .select('*')
    .eq('organization_id', orgId)
    .order('added_at', { ascending: true });

  if (error || !data) return [];
  return data as OrganizationRestaurant[];
}

/** Get the list of restaurant IDs the calling member is allowed to access. */
export async function getAccessibleRestaurantIds(
  orgId: string,
  memberId: string,
  shopScope: ShopScope
): Promise<string[]> {
  if (shopScope === 'all_shops') {
    const restaurants = await listOrganizationRestaurants(orgId);
    return restaurants.map((r) => r.restaurant_id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organization_member_shop_scopes')
    .select('restaurant_id')
    .eq('member_id', memberId);

  if (error || !data) return [];
  return data.map((row: { restaurant_id: string }) => row.restaurant_id);
}

/** Get explicit permission overrides for a member. */
export async function getMemberPermissionOverrides(
  memberId: string
): Promise<Map<OrgPermission, boolean>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_member_permissions')
    .select('permission, granted')
    .eq('member_id', memberId);

  const map = new Map<OrgPermission, boolean>();
  if (error || !data) return map;

  for (const row of data as { permission: OrgPermission; granted: boolean }[]) {
    map.set(row.permission, row.granted);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Write queries (admin client for server-side use during registration)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an organization, add the user as founder_full_control, and link
 * the restaurant. Called during registration; uses the admin client because
 * RLS is not set up for the new user yet.
 */
export async function createOrganizationForNewRestaurant(
  userId: string,
  restaurantId: string,
  input: CreateOrganizationInput
): Promise<{ organizationId: string; memberId: string } | null> {
  // 1. Create organization
  const { data: org, error: orgError } = await supabaseAdmin
    .from('owner_organizations')
    .insert({
      name: input.name,
      slug: input.slug,
      country: input.country ?? 'JP',
      timezone: input.timezone ?? 'Asia/Tokyo',
      currency: input.currency ?? 'JPY',
      created_by: userId,
    })
    .select('id')
    .single();

  if (orgError || !org) {
    console.error('Failed to create organization:', orgError);
    return null;
  }

  // 2. Add user as founder_full_control
  const { data: member, error: memberError } = await supabaseAdmin
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: userId,
      role: 'founder_full_control' as OrgMemberRole,
      shop_scope: 'all_shops' as ShopScope,
      joined_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (memberError || !member) {
    console.error('Failed to create organization member:', memberError);
    return null;
  }

  // 3. Link restaurant to organization
  const { error: linkError } = await supabaseAdmin
    .from('organization_restaurants')
    .insert({
      organization_id: org.id,
      restaurant_id: restaurantId,
      added_by: userId,
    });

  if (linkError) {
    console.error('Failed to link restaurant to organization:', linkError);
    return null;
  }

  return { organizationId: org.id, memberId: member.id };
}

/** Invite a new member by user_id (assumes user already exists). */
export async function addOrganizationMember(
  orgId: string,
  targetUserId: string,
  invitedByUserId: string,
  role: OrgMemberRole,
  shopScope: ShopScope,
  selectedRestaurantIds?: string[]
): Promise<OrganizationMember | null> {
  const { data: member, error } = await supabaseAdmin
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: targetUserId,
      role,
      shop_scope: shopScope,
      invited_by: invitedByUserId,
      joined_at: null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error || !member) {
    console.error('Failed to add org member:', error);
    return null;
  }

  // If selected_shops, insert scope rows
  if (shopScope === 'selected_shops' && selectedRestaurantIds?.length) {
    const scopeRows = selectedRestaurantIds.map((rid) => ({
      organization_id: orgId,
      member_id: member.id,
      restaurant_id: rid,
    }));
    const { error: scopeError } = await supabaseAdmin
      .from('organization_member_shop_scopes')
      .insert(scopeRows);

    if (scopeError) {
      console.error('Failed to insert shop scopes:', scopeError);
    }
  }

  return member as OrganizationMember;
}

/** Deactivate an organization member (soft delete). */
export async function deactivateOrganizationMember(memberId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('organization_members')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  return !error;
}
