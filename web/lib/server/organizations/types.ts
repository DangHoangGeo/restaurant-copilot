// Organization domain types
// These types mirror the database schema added in migration 037_organization_foundation.

export type OrgMemberRole =
  | 'founder_full_control'
  | 'founder_operations'
  | 'founder_finance'
  | 'accountant_readonly'
  | 'branch_general_manager';

export type ShopScope = 'all_shops' | 'selected_shops';

export type OrgPermission =
  | 'reports'
  | 'finance_exports'
  | 'purchases'
  | 'promotions'
  | 'employees'
  | 'attendance_approvals'
  | 'restaurant_settings'
  | 'organization_settings'
  | 'billing';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
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
}
