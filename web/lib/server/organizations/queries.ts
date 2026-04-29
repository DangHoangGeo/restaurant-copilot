// Organization domain: database queries
// All queries are scoped to the calling user via RLS.
// Use supabaseAdmin only in server-side admin contexts (e.g. registration).

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/server/authorization/types";
import { mapOrgRoleToLegacyUserAccess } from "./legacy-access";
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
} from "./types";

async function listOrganizationRestaurantIdsForAdmin(
  orgId: string,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("organization_restaurants")
    .select("restaurant_id")
    .eq("organization_id", orgId);

  if (error || !data) {
    console.error("Failed to list organization restaurant IDs:", error);
    return [];
  }

  return (data as Array<{ restaurant_id: string }>).map(
    (row) => row.restaurant_id,
  );
}

export async function validateOrganizationRestaurantScope(
  orgId: string,
  restaurantIds: string[] | undefined,
): Promise<{ valid: boolean; invalidRestaurantIds: string[] }> {
  const requestedRestaurantIds = Array.from(new Set(restaurantIds ?? []));
  if (requestedRestaurantIds.length === 0) {
    return { valid: false, invalidRestaurantIds: [] };
  }

  const organizationRestaurantIds = new Set(
    await listOrganizationRestaurantIdsForAdmin(orgId),
  );
  const invalidRestaurantIds = requestedRestaurantIds.filter(
    (restaurantId) => !organizationRestaurantIds.has(restaurantId),
  );

  return {
    valid: invalidRestaurantIds.length === 0,
    invalidRestaurantIds,
  };
}

export async function resolveLegacyRestaurantIdForOrgMember(
  orgId: string,
  shopScope: ShopScope,
  selectedRestaurantIds?: string[],
): Promise<string | null> {
  if (shopScope === "selected_shops") {
    return selectedRestaurantIds?.[0] ?? null;
  }

  const restaurantIds = await listOrganizationRestaurantIdsForAdmin(orgId);
  return restaurantIds[0] ?? null;
}

async function listMemberScopedRestaurantIdsForAdmin(
  memberId: string,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("organization_member_shop_scopes")
    .select("restaurant_id")
    .eq("member_id", memberId);

  if (error || !data) {
    console.error("Failed to list member scoped restaurants:", error);
    return [];
  }

  return (data as Array<{ restaurant_id: string }>).map(
    (row) => row.restaurant_id,
  );
}

async function syncLegacyUserAccessForOrganizationMember(
  member: Pick<
    OrganizationMember,
    "id" | "organization_id" | "user_id" | "role" | "shop_scope"
  >,
  selectedRestaurantIds?: string[],
): Promise<boolean> {
  const effectiveSelectedRestaurantIds =
    member.shop_scope === "selected_shops"
      ? (selectedRestaurantIds ??
        (await listMemberScopedRestaurantIdsForAdmin(member.id)))
      : undefined;
  const legacyRestaurantId = await resolveLegacyRestaurantIdForOrgMember(
    member.organization_id,
    member.shop_scope,
    effectiveSelectedRestaurantIds,
  );
  const legacyAccess = mapOrgRoleToLegacyUserAccess(
    member.role,
    legacyRestaurantId,
  );

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      role: legacyAccess.role,
      restaurant_id: legacyAccess.restaurantId,
    })
    .eq("id", member.user_id);

  if (error) {
    console.error("Failed to sync legacy user access:", error);
    return false;
  }

  return true;
}

async function clearLegacyOrgAccessForUser(
  userId: string,
  orgId: string,
): Promise<boolean> {
  const organizationRestaurantIds = await listOrganizationRestaurantIdsForAdmin(
    orgId,
  );

  if (organizationRestaurantIds.length === 0) {
    return true;
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("restaurant_id")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    console.error("Failed to load user before clearing legacy access:", userError);
    return false;
  }

  const restaurantId = userRow?.restaurant_id as string | null | undefined;
  if (!restaurantId || !organizationRestaurantIds.includes(restaurantId)) {
    return true;
  }

  const { data: activeEmployee, error: employeeError } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (employeeError) {
    console.error(
      "Failed to check employee access before clearing legacy access:",
      employeeError,
    );
    return false;
  }

  if (activeEmployee) {
    return true;
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      role: "staff",
      restaurant_id: null,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to clear legacy organization access:", error);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read queries (use RLS-scoped client)
// ─────────────────────────────────────────────────────────────────────────────

/** Get the organization the calling user belongs to (first active membership). */
export async function getMyOrganization(): Promise<Organization | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, owner_organizations(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;

  const org = Array.isArray(data.owner_organizations)
    ? data.owner_organizations[0]
    : data.owner_organizations;

  return (org as Organization) ?? null;
}

/** Get organization by ID (RLS ensures the caller is a member). */
export async function getOrganizationById(
  orgId: string,
): Promise<Organization | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("owner_organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error || !data) return null;
  return data as Organization;
}

/** List all members of an organization (RLS-scoped). */
export async function listOrganizationMembers(
  orgId: string,
): Promise<OrganizationMemberWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  // Enrich with user email/name via admin client (users table is RLS-restricted)
  const members = data as OrganizationMember[];
  const userIds = members.map((m) => m.user_id);
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, name")
    .in("id", userIds);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  // Fetch shop scopes for members with selected_shops scope
  const selectedShopsMemberIds = members
    .filter((m) => m.shop_scope === "selected_shops")
    .map((m) => m.id);

  const scopeMap = new Map<string, string[]>();
  if (selectedShopsMemberIds.length > 0) {
    const { data: scopes } = await supabaseAdmin
      .from("organization_member_shop_scopes")
      .select("member_id, restaurant_id")
      .in("member_id", selectedShopsMemberIds);

    for (const row of (scopes ?? []) as {
      member_id: string;
      restaurant_id: string;
    }[]) {
      const existing = scopeMap.get(row.member_id) ?? [];
      existing.push(row.restaurant_id);
      scopeMap.set(row.member_id, existing);
    }
  }

  return members.map((member) => {
    const u = userMap.get(member.user_id);
    return {
      ...member,
      email: u?.email ?? "",
      name: u?.name ?? null,
      accessible_restaurant_ids:
        member.shop_scope === "selected_shops"
          ? (scopeMap.get(member.id) ?? [])
          : undefined,
    };
  });
}

export interface OrgBranch {
  id: string;
  name: string;
  subdomain: string;
  branch_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  onboarded?: boolean | null;
}

/**
 * List org branches with their display names and subdomains.
 * Used anywhere the UI needs to show a branch picker with real labels.
 */
export async function listOrganizationBranches(
  orgId: string,
): Promise<OrgBranch[]> {
  const supabase = await createClient();

  // Fetch restaurant IDs from organization_restaurants using RLS-scoped client
  // (ensures the caller is a member of this org)
  const { data, error } = await supabase
    .from("organization_restaurants")
    .select("restaurant_id")
    .eq("organization_id", orgId)
    .order("added_at", { ascending: true });

  if (error || !data) return [];

  const restaurantIds = (data as Array<{ restaurant_id: string }>).map(
    (r) => r.restaurant_id,
  );
  if (restaurantIds.length === 0) return [];

  // Use admin client to fetch restaurant details so RLS on the restaurants
  // table (which is keyed to the user's primary restaurant) doesn't hide
  // newly-added org branches.
  const { data: restaurants } = await supabaseAdmin
    .from("restaurants")
    .select(
      "id, name, subdomain, branch_code, address, phone, email, onboarded",
    )
    .in("id", restaurantIds);

  const restaurantMap = new Map(
    (restaurants ?? []).map((r) => [
      r.id,
      r as {
        id: string;
        name: string;
        subdomain: string;
        branch_code?: string | null;
        address?: string | null;
        phone?: string | null;
        email?: string | null;
        onboarded?: boolean | null;
      },
    ]),
  );

  // Preserve the ordering returned by organization_restaurants
  return restaurantIds.flatMap((id) => {
    const r = restaurantMap.get(id);
    if (!r) return [];
    return [
      {
        id: r.id,
        name: r.name,
        subdomain: r.subdomain,
        branch_code: r.branch_code ?? null,
        address: r.address ?? null,
        phone: r.phone ?? null,
        email: r.email ?? null,
        onboarded: r.onboarded ?? null,
      },
    ];
  });
}

/** List restaurants belonging to an organization (RLS-scoped). */
export async function listOrganizationRestaurants(
  orgId: string,
): Promise<OrganizationRestaurant[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_restaurants")
    .select("*")
    .eq("organization_id", orgId)
    .order("added_at", { ascending: true });

  if (error || !data) return [];
  return data as OrganizationRestaurant[];
}

/** Get the list of restaurant IDs the calling member is allowed to access. */
export async function getAccessibleRestaurantIds(
  orgId: string,
  memberId: string,
  shopScope: ShopScope,
): Promise<string[]> {
  if (shopScope === "all_shops") {
    const restaurants = await listOrganizationRestaurants(orgId);
    return restaurants.map((r) => r.restaurant_id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_member_shop_scopes")
    .select("restaurant_id")
    .eq("member_id", memberId);

  if (error || !data) return [];
  return data.map((row: { restaurant_id: string }) => row.restaurant_id);
}

/** Get explicit permission overrides for a member. */
export async function getMemberPermissionOverrides(
  memberId: string,
): Promise<Map<OrgPermission, boolean>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_member_permissions")
    .select("permission, granted")
    .eq("member_id", memberId);

  const map = new Map<OrgPermission, boolean>();
  if (error || !data) return map;

  for (const row of data as { permission: OrgPermission; granted: boolean }[]) {
    map.set(row.permission, row.granted);
  }
  return map;
}

/**
 * Get all 9 permissions for a member, showing the effective value and whether
 * it is an explicit override or the role default.
 * Used by the B2 permission editor UI.
 */
export async function getMemberPermissionsWithOverrides(
  memberId: string,
  role: OrgMemberRole,
): Promise<
  Array<{
    permission: OrgPermission;
    granted: boolean;
    is_override: boolean;
    role_default: boolean;
  }>
> {
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[role];
  const ALL_PERMISSIONS: OrgPermission[] = [
    "reports",
    "finance_exports",
    "purchases",
    "promotions",
    "employees",
    "attendance_approvals",
    "restaurant_settings",
    "organization_settings",
    "billing",
  ];

  // Fetch explicit overrides from DB
  const { data, error } = await supabaseAdmin
    .from("organization_member_permissions")
    .select("permission, granted")
    .eq("member_id", memberId);

  const overrideMap = new Map<OrgPermission, boolean>();
  if (!error && data) {
    for (const row of data as {
      permission: OrgPermission;
      granted: boolean;
    }[]) {
      overrideMap.set(row.permission, row.granted);
    }
  }

  return ALL_PERMISSIONS.map((permission) => {
    const roleDefault = roleDefaults[permission] ?? false;
    const isOverride = overrideMap.has(permission);
    const granted = isOverride ? overrideMap.get(permission)! : roleDefault;
    return {
      permission,
      granted,
      is_override: isOverride,
      role_default: roleDefault,
    };
  });
}

/**
 * Upsert permission overrides for a member.
 * Pass a partial record; permissions not in the map are left unchanged.
 * To reset a permission to role default, delete its row — use resetMemberPermission instead.
 */
export async function upsertMemberPermissions(
  orgId: string,
  memberId: string,
  grantedByUserId: string,
  permissions: Partial<Record<OrgPermission, boolean>>,
): Promise<boolean> {
  const rows = Object.entries(permissions).map(([permission, granted]) => ({
    organization_id: orgId,
    member_id: memberId,
    permission: permission as OrgPermission,
    granted,
    granted_by: grantedByUserId,
  }));

  if (rows.length === 0) return true;

  const { error } = await supabaseAdmin
    .from("organization_member_permissions")
    .upsert(rows, { onConflict: "member_id,permission" });

  if (error) {
    console.error("Failed to upsert member permissions:", error);
    return false;
  }
  return true;
}

/**
 * Delete all permission overrides for a member, restoring role defaults.
 */
export async function resetMemberPermissions(
  memberId: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("organization_member_permissions")
    .delete()
    .eq("member_id", memberId);

  if (error) {
    console.error("Failed to reset member permissions:", error);
    return false;
  }
  return true;
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
  input: CreateOrganizationInput,
): Promise<{ organizationId: string; memberId: string } | null> {
  let organizationId: string | null = null;
  let memberId: string | null = null;

  // 1. Create organization
  const { data: org, error: orgError } = await supabaseAdmin
    .from("owner_organizations")
    .insert({
      name: input.name,
      slug: input.slug,
      public_subdomain: input.slug,
      approval_status: "pending",
      requested_plan: input.requested_plan ?? null,
      requested_billing_cycle: input.requested_billing_cycle ?? "monthly",
      country: input.country ?? "JP",
      timezone: input.timezone ?? "Asia/Tokyo",
      currency: input.currency ?? "JPY",
      created_by: userId,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    console.error("Failed to create organization:", orgError);
    return null;
  }
  organizationId = org.id;

  // 2. Add user as founder_full_control
  const { data: member, error: memberError } = await supabaseAdmin
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: userId,
      role: "founder_full_control" as OrgMemberRole,
      shop_scope: "all_shops" as ShopScope,
      joined_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (memberError || !member) {
    console.error("Failed to create organization member:", memberError);
    if (organizationId) {
      await supabaseAdmin
        .from("owner_organizations")
        .delete()
        .eq("id", organizationId);
    }
    return null;
  }
  memberId = member.id;

  // 3. Link restaurant to organization
  const { error: linkError } = await supabaseAdmin
    .from("organization_restaurants")
    .insert({
      organization_id: org.id,
      restaurant_id: restaurantId,
      added_by: userId,
    });

  if (linkError) {
    console.error("Failed to link restaurant to organization:", linkError);
    if (memberId) {
      await supabaseAdmin
        .from("organization_members")
        .delete()
        .eq("id", memberId);
    }
    if (organizationId) {
      await supabaseAdmin
        .from("owner_organizations")
        .delete()
        .eq("id", organizationId);
    }
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
  selectedRestaurantIds?: string[],
): Promise<OrganizationMember | null> {
  if (shopScope === "selected_shops") {
    const scopeValidation = await validateOrganizationRestaurantScope(
      orgId,
      selectedRestaurantIds,
    );

    if (!scopeValidation.valid) {
      console.error("Invalid organization member shop scope:", {
        orgId,
        invalidRestaurantIds: scopeValidation.invalidRestaurantIds,
      });
      return null;
    }
  }

  const { data: member, error } = await supabaseAdmin
    .from("organization_members")
    .insert({
      organization_id: orgId,
      user_id: targetUserId,
      role,
      shop_scope: shopScope,
      invited_by: invitedByUserId,
      joined_at: null,
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !member) {
    console.error("Failed to add org member:", error);
    return null;
  }

  // If selected_shops, insert scope rows
  if (shopScope === "selected_shops" && selectedRestaurantIds?.length) {
    const scopeRows = Array.from(new Set(selectedRestaurantIds)).map((rid) => ({
      organization_id: orgId,
      member_id: member.id,
      restaurant_id: rid,
    }));
    const { error: scopeError } = await supabaseAdmin
      .from("organization_member_shop_scopes")
      .insert(scopeRows);

    if (scopeError) {
      console.error("Failed to insert shop scopes:", scopeError);
    }
  }

  await syncLegacyUserAccessForOrganizationMember(
    member as OrganizationMember,
    selectedRestaurantIds,
  );

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
  input: AddBranchInput,
): Promise<{ id: string; name: string; subdomain: string } | null> {
  // 1. Check subdomain uniqueness
  const { data: existing } = await supabaseAdmin
    .from("restaurants")
    .select("id")
    .eq("subdomain", input.subdomain)
    .single();

  if (existing) return null; // caller should surface a 409

  const { data: organization } = await supabaseAdmin
    .from("owner_organizations")
    .select("logo_url, brand_color")
    .eq("id", orgId)
    .maybeSingle();

  // 2. Create the restaurant row
  const insert: Record<string, unknown> = {
    name: input.name,
    subdomain: input.subdomain,
    branch_code: input.subdomain,
    default_language: input.default_language,
    logo_url: organization?.logo_url ?? null,
    brand_color: organization?.brand_color ?? input.brand_color ?? "#EA580C",
    // Branches added to an approved organization can start operating
    // immediately after the founder finishes branch-specific setup.
    is_active: true,
    is_verified: true,
    onboarded: false,
  };
  if (input.tax !== undefined) insert.tax = input.tax;
  if (input.address) insert.address = input.address;
  if (input.phone) insert.phone = input.phone;
  if (input.email) insert.email = input.email;
  if (input.website) insert.website = input.website;

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from("restaurants")
    .insert(insert)
    .select("id, name, subdomain")
    .single();

  if (restaurantError || !restaurant) {
    console.error("Failed to create restaurant:", restaurantError);
    return null;
  }

  // 3. Link restaurant to organization
  const { error: linkError } = await supabaseAdmin
    .from("organization_restaurants")
    .insert({
      organization_id: orgId,
      restaurant_id: restaurant.id,
      added_by: addedByUserId,
    });

  if (linkError) {
    console.error("Failed to link restaurant to org:", linkError);
    // Attempt cleanup — best effort
    await supabaseAdmin.from("restaurants").delete().eq("id", restaurant.id);
    return null;
  }

  return restaurant as { id: string; name: string; subdomain: string };
}

/** Deactivate an organization member (soft delete). */
export async function deactivateOrganizationMember(
  memberId: string,
): Promise<boolean> {
  const { data: memberBeforeDeactivate, error: fetchError } = await supabaseAdmin
    .from("organization_members")
    .select("user_id, organization_id")
    .eq("id", memberId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to load org member before deactivation:", fetchError);
    return false;
  }

  const { error } = await supabaseAdmin
    .from("organization_members")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  if (error) {
    console.error("Failed to deactivate org member:", error);
    return false;
  }

  if (memberBeforeDeactivate?.user_id && memberBeforeDeactivate.organization_id) {
    await clearLegacyOrgAccessForUser(
      memberBeforeDeactivate.user_id as string,
      memberBeforeDeactivate.organization_id as string,
    );
  }

  return true;
}

async function syncOrganizationBrandingToRestaurants(
  orgId: string,
  previousBranding: {
    logo_url?: string | null;
    brand_color?: string | null;
  },
  updates: { logo_url?: string | null; brand_color?: string | null },
): Promise<void> {
  const shouldSyncLogo =
    "logo_url" in updates && updates.logo_url !== previousBranding.logo_url;
  const shouldSyncBrandColor =
    "brand_color" in updates &&
    updates.brand_color !== previousBranding.brand_color;

  if (!shouldSyncLogo && !shouldSyncBrandColor) {
    return;
  }

  const { data: orgRestaurants, error: orgRestaurantsError } =
    await supabaseAdmin
      .from("organization_restaurants")
      .select("restaurant_id")
      .eq("organization_id", orgId);

  if (orgRestaurantsError || !orgRestaurants?.length) {
    if (orgRestaurantsError) {
      console.error(
        "Failed to load organization restaurants for brand sync:",
        orgRestaurantsError,
      );
    }
    return;
  }

  const restaurantIds = orgRestaurants.map(
    (row) => row.restaurant_id as string,
  );
  const { data: restaurants, error: restaurantsError } = await supabaseAdmin
    .from("restaurants")
    .select("id, logo_url, brand_color")
    .in("id", restaurantIds);

  if (restaurantsError || !restaurants?.length) {
    if (restaurantsError) {
      console.error(
        "Failed to load organization restaurants for selective brand sync:",
        restaurantsError,
      );
    }
    return;
  }

  const syncOperations = restaurants.flatMap((restaurant) => {
    const patch: Record<string, unknown> = {};

    if (
      shouldSyncLogo &&
      (restaurant.logo_url == null ||
        restaurant.logo_url === previousBranding.logo_url)
    ) {
      patch.logo_url = updates.logo_url ?? null;
    }

    if (
      shouldSyncBrandColor &&
      (restaurant.brand_color == null ||
        restaurant.brand_color === previousBranding.brand_color)
    ) {
      patch.brand_color = updates.brand_color ?? null;
    }

    if (Object.keys(patch).length === 0) {
      return [];
    }

    return supabaseAdmin
      .from("restaurants")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", restaurant.id);
  });

  if (syncOperations.length === 0) {
    return;
  }

  const results = await Promise.all(syncOperations);
  for (const result of results) {
    if (result.error) {
      console.error(
        "Failed to sync organization branding to restaurants:",
        result.error,
      );
    }
  }
}

/** Update organization-level settings including branding. Uses admin client. */
export async function updateOrganizationSettings(
  orgId: string,
  updates: Partial<
    Pick<
      Organization,
      | "name"
      | "country"
      | "timezone"
      | "currency"
      | "logo_url"
      | "brand_color"
      | "description_en"
      | "description_ja"
      | "description_vi"
      | "address"
      | "website"
      | "phone"
      | "email"
      | "onboarding_completed_at"
      | "approval_status"
      | "approved_at"
      | "approved_by"
      | "approval_notes"
      | "requested_plan"
    >
  >,
): Promise<Organization | null> {
  const optionalOrgColumns = new Set([
    "logo_url",
    "brand_color",
    "description_en",
    "description_ja",
    "description_vi",
    "address",
    "website",
    "phone",
    "email",
  ]);

  const extractMissingColumn = (
    error: { code?: string; message?: string } | null,
  ) => {
    if (!error || error.code !== "PGRST204" || !error.message) {
      return null;
    }

    const match = error.message.match(/Could not find the '([^']+)' column/);
    return match?.[1] ?? null;
  };

  let currentOrganization: {
    logo_url?: string | null;
    brand_color?: string | null;
  } | null = null;

  const { data: currentOrganizationData, error: currentOrganizationError } =
    await supabaseAdmin
      .from("owner_organizations")
      .select("logo_url, brand_color")
      .eq("id", orgId)
      .maybeSingle();

  if (currentOrganizationError) {
    const missingColumn = extractMissingColumn(currentOrganizationError);

    if (!missingColumn || !optionalOrgColumns.has(missingColumn)) {
      console.error(
        "Failed to load current organization branding before update:",
        currentOrganizationError,
      );
      return null;
    }

    console.warn(
      `Skipping current organization branding preload because '${missingColumn}' is not available in this database schema yet.`,
    );
  } else {
    currentOrganization = currentOrganizationData;
  }

  const patch: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  const ignoredColumns: string[] = [];

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("owner_organizations")
      .update(patch)
      .eq("id", orgId)
      .select("*")
      .single();

    if (!error && data) {
      if (ignoredColumns.length > 0) {
        console.warn(
          `Updated organization ${orgId} without unsupported columns: ${ignoredColumns.join(", ")}`,
        );
      }

      if ("logo_url" in patch || "brand_color" in patch) {
        await syncOrganizationBrandingToRestaurants(
          orgId,
          {
            logo_url: currentOrganization?.logo_url ?? null,
            brand_color: currentOrganization?.brand_color ?? null,
          },
          {
            logo_url:
              typeof patch.logo_url === "string" || patch.logo_url === null
                ? (patch.logo_url as string | null)
                : undefined,
            brand_color:
              typeof patch.brand_color === "string" ||
              patch.brand_color === null
                ? (patch.brand_color as string | null)
                : undefined,
          },
        );
      }

      return data as Organization;
    }

    const missingColumn = extractMissingColumn(error);
    if (
      !missingColumn ||
      !optionalOrgColumns.has(missingColumn) ||
      !(missingColumn in patch)
    ) {
      console.error("Failed to update organization:", error);
      return null;
    }

    ignoredColumns.push(missingColumn);
    delete patch[missingColumn];
  }
}

/**
 * Update a member's role and/or shop scope.
 * Also synchronises organization_member_shop_scopes rows when scope changes.
 */
export async function updateOrganizationMember(
  memberId: string,
  orgId: string,
  updates: {
    role?: OrgMemberRole;
    shop_scope?: ShopScope;
    selected_restaurant_ids?: string[];
  },
): Promise<OrganizationMember | null> {
  const { role, shop_scope, selected_restaurant_ids } = updates;

  if (shop_scope === "selected_shops") {
    const scopeValidation = await validateOrganizationRestaurantScope(
      orgId,
      selected_restaurant_ids,
    );

    if (!scopeValidation.valid) {
      console.error("Invalid organization member shop scope update:", {
        orgId,
        memberId,
        invalidRestaurantIds: scopeValidation.invalidRestaurantIds,
      });
      return null;
    }
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (role !== undefined) patch.role = role;
  if (shop_scope !== undefined) patch.shop_scope = shop_scope;

  const { data: member, error } = await supabaseAdmin
    .from("organization_members")
    .update(patch)
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .select("*")
    .single();

  if (error || !member) {
    console.error("Failed to update org member:", error);
    return null;
  }

  // Sync shop scope rows when scope changes
  if (shop_scope === "selected_shops" && selected_restaurant_ids?.length) {
    await supabaseAdmin
      .from("organization_member_shop_scopes")
      .delete()
      .eq("member_id", memberId);

    const scopeRows = Array.from(new Set(selected_restaurant_ids)).map((rid) => ({
      organization_id: orgId,
      member_id: memberId,
      restaurant_id: rid,
    }));
    const { error: scopeError } = await supabaseAdmin
      .from("organization_member_shop_scopes")
      .insert(scopeRows);
    if (scopeError) console.error("Failed to update shop scopes:", scopeError);
  } else if (shop_scope === "all_shops") {
    await supabaseAdmin
      .from("organization_member_shop_scopes")
      .delete()
      .eq("member_id", memberId);
  }

  const currentScopeIds =
    shop_scope === "selected_shops" ? selected_restaurant_ids : undefined;
  await syncLegacyUserAccessForOrganizationMember(
    member as OrganizationMember,
    currentScopeIds,
  );

  return member as OrganizationMember;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-branch employee queries (B3)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgEmployeeRow {
  employee_id: string;
  user_id: string;
  name: string;
  email: string;
  job_title: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_subdomain: string;
  is_active: boolean;
  created_at: string | null;
  private_profile: {
    gender: string | null;
    phone: string | null;
    contact_email: string | null;
    address: string | null;
    facebook_url: string | null;
    bank_name: string | null;
    bank_branch_name: string | null;
    bank_account_type: string | null;
    bank_account_number: string | null;
    bank_account_holder: string | null;
    tax_social_number: string | null;
    insurance_number: string | null;
  } | null;
}

/**
 * List all employees across the given restaurant IDs.
 * Uses admin client — called server-side after authorization check.
 */
export async function listOrganizationEmployees(
  restaurantIds: string[],
): Promise<OrgEmployeeRow[]> {
  if (restaurantIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("employees")
    .select(
      "id, role, user_id, restaurant_id, is_active, created_at, restaurants(id, name, subdomain), users:users!employees_user_id_fkey(id, email, name), employee_private_profiles(gender, phone, contact_email, address, facebook_url, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_holder, tax_social_number, insurance_number)",
    )
    .in("restaurant_id", restaurantIds)
    .order("restaurant_id", { ascending: true });

  if (error || !data) {
    console.error("Failed to list org employees:", error);
    return [];
  }

  return (
    data as Array<{
      id: string;
      role: string;
      user_id: string;
      restaurant_id: string;
      is_active: boolean;
      created_at: string | null;
      restaurants:
        | { id: string; name: string; subdomain: string }
        | Array<{ id: string; name: string; subdomain: string }>
        | null;
      users:
        | { id: string; email: string; name: string }
        | Array<{ id: string; email: string; name: string }>
        | null;
      employee_private_profiles:
        | OrgEmployeeRow["private_profile"]
        | Array<OrgEmployeeRow["private_profile"]>
        | null;
    }>
  ).flatMap((row) => {
    const restaurant = Array.isArray(row.restaurants)
      ? row.restaurants[0]
      : row.restaurants;
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    const profile = Array.isArray(row.employee_private_profiles)
      ? row.employee_private_profiles[0]
      : row.employee_private_profiles;
    if (!restaurant || !user) return [];
    return [
      {
        employee_id: row.id,
        user_id: row.user_id,
        name: user.name,
        email: user.email,
        job_title: row.role,
        restaurant_id: row.restaurant_id,
        restaurant_name: restaurant.name,
        restaurant_subdomain: restaurant.subdomain,
        is_active: row.is_active,
        created_at: row.created_at,
        private_profile: profile ?? null,
      },
    ];
  });
}
