// Shared organization types for use on both client and server

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

export interface ApiOrganization {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface ApiOrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgMemberRole;
  shop_scope: ShopScope;
  joined_at: string | null;
  is_active: boolean;
  email: string;
  name: string | null;
}

/** Response shape for GET /api/v1/owner/organization */
export interface GetOrganizationResponse {
  organization: ApiOrganization;
  member: {
    id: string;
    role: OrgMemberRole;
    shop_scope: ShopScope;
    joined_at: string | null;
  };
  accessible_restaurant_count: number;
}

/** Response shape for GET /api/v1/owner/organization/members */
export interface GetOrganizationMembersResponse {
  members: ApiOrganizationMember[];
}

/** Request body for POST /api/v1/owner/organization/members */
export interface InviteOrganizationMemberRequest {
  email: string;
  role: OrgMemberRole;
  shop_scope: ShopScope;
  selected_restaurant_ids?: string[];
}

/** Response shape for GET /api/v1/owner/organization/restaurants */
export interface GetOrganizationRestaurantsResponse {
  restaurants: Array<{
    id: string;
    name: string;
    subdomain: string;
    is_active: boolean;
    timezone: string;
    currency: string;
  }>;
}

/** Human-readable labels for each org role */
export const ORG_ROLE_LABELS: Record<OrgMemberRole, string> = {
  founder_full_control:   'Founder (Full Control)',
  founder_operations:     'Founder (Operations)',
  founder_finance:        'Founder (Finance)',
  accountant_readonly:    'Accountant (Read Only)',
  branch_general_manager: 'Branch General Manager',
};

// ─────────────────────────────────────────────────────────────────────────────
// Pending invite types (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiPendingInvite {
  id: string;
  organization_id: string;
  invited_by: string;
  email: string;
  role: OrgMemberRole;
  shop_scope: ShopScope;
  selected_restaurant_ids: string[] | null;
  expires_at: string;
  accepted_at: string | null;
  is_active: boolean;
  created_at: string;
}

/** Response shape for GET /api/v1/owner/organization/invites */
export interface GetPendingInvitesResponse {
  invites: ApiPendingInvite[];
}

/** Request body for POST /api/v1/owner/organization/invites */
export interface CreatePendingInviteRequest {
  email: string;
  role: OrgMemberRole;
  shop_scope: ShopScope;
  selected_restaurant_ids?: string[];
}

/** Response shape for POST /api/v1/owner/organization/invites */
export interface CreatePendingInviteResponse {
  success: true;
  invite_id: string;
  /** Token returned to caller for manual distribution (email not yet implemented). */
  invite_token: string;
}

/** Request body for POST /api/v1/auth/accept-invite */
export interface AcceptInviteRequest {
  token: string;
  /** Required for new users who do not yet have a Supabase auth account. */
  name?: string;
  password?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Active branch types (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────

/** Response shape for GET /api/v1/owner/organization/active-branch */
export interface GetActiveBranchResponse {
  restaurant_id: string | null;
}

/** Request body for PUT /api/v1/owner/organization/active-branch */
export interface SetActiveBranchRequest {
  restaurant_id: string;
}
