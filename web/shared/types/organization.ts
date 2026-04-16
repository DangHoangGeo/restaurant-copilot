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

/** Request body for PATCH /api/v1/owner/organization */
export interface UpdateOrganizationRequest {
  name?: string;
  timezone?: string;
  currency?: string;
}

/** Response shape for PATCH /api/v1/owner/organization */
export interface UpdateOrganizationResponse {
  success: true;
  organization: ApiOrganization;
}

/** Request body for PATCH /api/v1/owner/organization/members/[id] */
export interface UpdateMemberRequest {
  role?: OrgMemberRole;
  shop_scope?: ShopScope;
  selected_restaurant_ids?: string[];
}

/** Response shape for PATCH /api/v1/owner/organization/members/[id] */
export interface UpdateMemberResponse {
  success: true;
  member: ApiOrganizationMember;
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

/** Response shape for POST /api/v1/owner/organization/invites/[id]/resend */
export interface ResendInviteResponse {
  success: true;
  invite_token: string;
  expires_at: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Add branch types (Sprint 2)
// ─────────────────────────────────────────────────────────────────────────────

/** Request body for POST /api/v1/owner/organization/restaurants */
export interface AddBranchRequest {
  name: string;
  subdomain: string;
  default_language: 'en' | 'ja' | 'vi';
  brand_color: string;
  tax?: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

/** Response shape for POST /api/v1/owner/organization/restaurants */
export interface AddBranchResponse {
  success: true;
  restaurant: {
    id: string;
    name: string;
    subdomain: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Organization overview types (Sprint 2)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgBranchOverview {
  restaurant_id: string;
  name: string;
  subdomain: string;
  today_revenue: number;
  open_orders_count: number;
}

/** Response shape for GET /api/v1/owner/organization/overview */
export interface OrgOverviewResponse {
  branches: OrgBranchOverview[];
  total_today_revenue: number;
  total_open_orders: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission override types (Sprint 3 — B2)
// ─────────────────────────────────────────────────────────────────────────────

/** One permission entry returned by GET /api/v1/owner/organization/members/[id]/permissions */
export interface MemberPermissionState {
  permission: OrgPermission;
  /** Effective value — override when present, otherwise role default */
  granted: boolean;
  /** True when an explicit override row exists in organization_member_permissions */
  is_override: boolean;
  /** The value that role defaults would give without any override */
  role_default: boolean;
}

/** Response shape for GET /api/v1/owner/organization/members/[id]/permissions */
export interface GetMemberPermissionsResponse {
  permissions: MemberPermissionState[];
}

/** Request body for PATCH /api/v1/owner/organization/members/[id]/permissions */
export interface UpdateMemberPermissionsRequest {
  /** Partial map of permissions to set as explicit overrides */
  permissions?: Partial<Record<OrgPermission, boolean>>;
  /** When true, removes ALL override rows — restores role defaults */
  reset?: boolean;
}

/** Response shape for PATCH /api/v1/owner/organization/members/[id]/permissions */
export interface UpdateMemberPermissionsResponse {
  success: true;
  permissions: MemberPermissionState[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-branch employee types (Sprint 3 — B3)
// ─────────────────────────────────────────────────────────────────────────────

/** One employee row returned by GET /api/v1/owner/organization/employees */
export interface OrgEmployee {
  employee_id: string;
  user_id: string;
  name: string;
  email: string;
  job_title: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_subdomain: string;
}

/** Response shape for GET /api/v1/owner/organization/employees */
export interface GetOrgEmployeesResponse {
  employees: OrgEmployee[];
  total_count: number;
}


/** Request body for POST /api/v1/owner/organization/menu/copy */
export interface CopyMenuRequest {
  source_restaurant_id: string;
  target_restaurant_id: string;
}

/** Response shape for POST /api/v1/owner/organization/menu/copy */
export interface CopyMenuResponse {
  success: true;
  categories_copied: number;
  items_copied: number;
}

/** Response shape for GET /api/v1/owner/organization/menu/compare */
export interface MenuCompareResponse {
  branchA: {
    restaurantId: string;
    categories: Array<{
      id: string;
      name_en: string;
      name_ja: string | null;
      name_vi: string | null;
      position: number;
      items: Array<{
        id: string;
        name_en: string;
        name_ja: string | null;
        name_vi: string | null;
        price: number;
        available: boolean;
        position: number;
      }>;
    }>;
  };
  branchB: {
    restaurantId: string;
    categories: Array<{
      id: string;
      name_en: string;
      name_ja: string | null;
      name_vi: string | null;
      position: number;
      items: Array<{
        id: string;
        name_en: string;
        name_ja: string | null;
        name_vi: string | null;
        price: number;
        available: boolean;
        position: number;
      }>;
    }>;
  };
}
