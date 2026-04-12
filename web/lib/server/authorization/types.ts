// Centralized authorization types
// This module is the single source of truth for what org-level roles can do.

import type { OrgMemberRole, OrgPermission } from '../organizations/types';

// Default permissions granted by each role.
// true = granted by default, false = denied by default.
// Individual overrides in organization_member_permissions can flip these.
export const ROLE_DEFAULT_PERMISSIONS: Record<OrgMemberRole, Record<OrgPermission, boolean>> = {
  founder_full_control: {
    reports:               true,
    finance_exports:       true,
    purchases:             true,
    promotions:            true,
    employees:             true,
    attendance_approvals:  true,
    restaurant_settings:   true,
    organization_settings: true,
    billing:               true,
  },
  founder_operations: {
    reports:               true,
    finance_exports:       false,
    purchases:             true,
    promotions:            true,
    employees:             true,
    attendance_approvals:  true,
    restaurant_settings:   true,
    organization_settings: false,
    billing:               false,
  },
  founder_finance: {
    reports:               true,
    finance_exports:       true,
    purchases:             true,
    promotions:            false,
    employees:             false,
    attendance_approvals:  false,
    restaurant_settings:   false,
    organization_settings: false,
    billing:               true,
  },
  accountant_readonly: {
    reports:               true,
    finance_exports:       true,
    purchases:             false,
    promotions:            false,
    employees:             false,
    attendance_approvals:  false,
    restaurant_settings:   false,
    organization_settings: false,
    billing:               false,
  },
  branch_general_manager: {
    reports:               true,
    finance_exports:       false,
    purchases:             true,
    promotions:            true,
    employees:             true,
    attendance_approvals:  true,
    restaurant_settings:   true,
    organization_settings: false,
    billing:               false,
  },
};

// Roles that can manage (invite/remove) org members
export const ROLES_THAT_CAN_MANAGE_MEMBERS: OrgMemberRole[] = [
  'founder_full_control',
];

// Roles that can modify organization settings
export const ROLES_THAT_CAN_CHANGE_ORG_SETTINGS: OrgMemberRole[] = [
  'founder_full_control',
];
