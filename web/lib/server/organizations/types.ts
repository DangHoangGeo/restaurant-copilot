// Organization domain types
// These types mirror the database schema added in migration 037_organization_foundation.

export type OrgMemberRole =
  | "founder_full_control"
  | "founder_operations"
  | "founder_finance"
  | "accountant_readonly"
  | "branch_general_manager";

export type ShopScope = "all_shops" | "selected_shops";

export type OrgPermission =
  | "reports"
  | "finance_exports"
  | "purchases"
  | "promotions"
  | "employees"
  | "attendance_approvals"
  | "restaurant_settings"
  | "organization_settings"
  | "billing";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  public_subdomain: string;
  approval_status: "pending" | "approved" | "rejected";
  approved_at?: string | null;
  approved_by?: string | null;
  approval_notes?: string | null;
  requested_plan?: string | null;
  onboarding_completed_at?: string | null;
  country: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Shared branding (migration 043) — inherited by all branches unless overridden
  logo_url?: string | null;
  brand_color?: string | null;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgMemberRole;
  shop_scope: ShopScope;
  invited_by: string | null;
  joined_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRestaurant {
  id: string;
  organization_id: string;
  restaurant_id: string;
  added_by: string | null;
  added_at: string;
}

export interface OrganizationMemberShopScope {
  id: string;
  organization_id: string;
  member_id: string;
  restaurant_id: string;
  created_at: string;
}

export interface OrganizationMemberPermission {
  id: string;
  organization_id: string;
  member_id: string;
  permission: OrgPermission;
  granted: boolean;
  granted_by: string | null;
  created_at: string;
}

// Enriched member with user info for display
export interface OrganizationMemberWithUser extends OrganizationMember {
  email: string;
  name: string | null;
  /** Populated only when shop_scope === 'selected_shops'; undefined for all_shops members. */
  accessible_restaurant_ids?: string[];
}

// Full org context loaded for an authenticated user
export interface OrgContext {
  organization: Organization;
  member: OrganizationMember;
  /** restaurants this member may access (respects shop_scope) */
  accessibleRestaurantIds: string[];
  /** explicit permission overrides — null means use role default */
  permissionOverrides: Map<OrgPermission, boolean>;
}

// Payload for creating a new organization
export interface CreateOrganizationInput {
  name: string;
  slug: string;
  requested_plan?: "starter" | "growth" | "enterprise";
  country?: string;
  timezone?: string;
  currency?: string;
}

// Payload for inviting an org member
export interface InviteOrgMemberInput {
  email: string;
  role: OrgMemberRole;
  shop_scope: ShopScope;
  selected_restaurant_ids?: string[];
}

// Payload for adding a new branch/restaurant to an existing org
export interface AddBranchInput {
  name: string;
  subdomain: string;
  default_language: "en" | "ja" | "vi";
  brand_color?: string;
  tax?: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

// Pending invite (stored in organization_pending_invites)
export interface PendingInvite {
  id: string;
  organization_id: string;
  invited_by: string;
  email: string;
  role: OrgMemberRole;
  shop_scope: ShopScope;
  selected_restaurant_ids: string[] | null;
  invite_token: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  is_active: boolean;
  created_at: string;
  /** Populated after migration 042 */
  last_resent_at?: string | null;
  resend_count?: number;
}
