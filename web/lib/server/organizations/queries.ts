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
  AddBranchInput,
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

export interface OrgBranch {
  id: string;
  name: string;
  subdomain: string;
}

/**
 * List org branches with their display names and subdomains.
 * Used anywhere the UI needs to show a branch picker with real labels.
 */
export async function listOrganizationBranches(orgId: string): Promise<OrgBranch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_restaurants')
    .select('restaurant_id, restaurants(id, name, subdomain)')
    .eq('organization_id', orgId)
    .order('added_at', { ascending: true });

  if (error || !data) return [];

  return (data as Array<{
    restaurant_id: string;
    restaurants: { id: string; name: string; subdomain: string } | Array<{ id: string; name: string; subdomain: string }> | null;
  }>).flatMap((row) => {
    const r = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
    if (!r) return [];
    return [{ id: r.id, name: r.name, subdomain: r.subdomain }];
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

/**
 * Create a new restaurant row and link it to an existing organization.
 * Uses admin client — called server-side after authorization check.
 * Returns the new restaurant id on success, null on failure.
 */
export async function createRestaurantInOrg(
  orgId: string,
  addedByUserId: string,
  input: AddBranchInput
): Promise<{ id: string; name: string; subdomain: string } | null> {
  // 1. Check subdomain uniqueness
  const { data: existing } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('subdomain', input.subdomain)
    .single();

  if (existing) return null; // caller should surface a 409

  // 2. Create the restaurant row
  const insert: Record<string, unknown> = {
    name: input.name,
    subdomain: input.subdomain,
    default_language: input.default_language,
    brand_color: input.brand_color,
  };
  if (input.tax !== undefined) insert.tax = input.tax;
  if (input.address) insert.address = input.address;
  if (input.phone) insert.phone = input.phone;
  if (input.email) insert.email = input.email;
  if (input.website) insert.website = input.website;

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .insert(insert)
    .select('id, name, subdomain')
    .single();

  if (restaurantError || !restaurant) {
    console.error('Failed to create restaurant:', restaurantError);
    return null;
  }

  // 3. Link restaurant to organization
  const { error: linkError } = await supabaseAdmin
    .from('organization_restaurants')
    .insert({
      organization_id: orgId,
      restaurant_id: restaurant.id,
      added_by: addedByUserId,
    });

  if (linkError) {
    console.error('Failed to link restaurant to org:', linkError);
    // Attempt cleanup — best effort
    await supabaseAdmin.from('restaurants').delete().eq('id', restaurant.id);
    return null;
  }

  return restaurant as { id: string; name: string; subdomain: string };
}

/** Deactivate an organization member (soft delete). */
export async function deactivateOrganizationMember(memberId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('organization_members')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  return !error;
}

/** Update organization-level settings (name, timezone, currency). Uses admin client. */
export async function updateOrganizationSettings(
  orgId: string,
  updates: { name?: string; timezone?: string; currency?: string }
): Promise<Organization | null> {
  const { data, error } = await supabaseAdmin
    .from('owner_organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', orgId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Failed to update organization:', error);
    return null;
  }
  return data as Organization;
}

/**
 * Update a member's role and/or shop scope.
 * Also synchronises organization_member_shop_scopes rows when scope changes.
 */
export async function updateOrganizationMember(
  memberId: string,
  orgId: string,
  updates: { role?: OrgMemberRole; shop_scope?: ShopScope; selected_restaurant_ids?: string[] }
): Promise<OrganizationMember | null> {
  const { role, shop_scope, selected_restaurant_ids } = updates;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (role !== undefined) patch.role = role;
  if (shop_scope !== undefined) patch.shop_scope = shop_scope;

  const { data: member, error } = await supabaseAdmin
    .from('organization_members')
    .update(patch)
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .select('*')
    .single();

  if (error || !member) {
    console.error('Failed to update org member:', error);
    return null;
  }

  // Sync shop scope rows when scope changes
  if (shop_scope === 'selected_shops' && selected_restaurant_ids?.length) {
    await supabaseAdmin
      .from('organization_member_shop_scopes')
      .delete()
      .eq('member_id', memberId);

    const scopeRows = selected_restaurant_ids.map((rid) => ({
      organization_id: orgId,
      member_id: memberId,
      restaurant_id: rid,
    }));
    const { error: scopeError } = await supabaseAdmin
      .from('organization_member_shop_scopes')
      .insert(scopeRows);
    if (scopeError) console.error('Failed to update shop scopes:', scopeError);
  } else if (shop_scope === 'all_shops') {
    await supabaseAdmin
      .from('organization_member_shop_scopes')
      .delete()
      .eq('member_id', memberId);
  }

  return member as OrganizationMember;
}
