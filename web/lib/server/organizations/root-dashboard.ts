import type { OrgMemberRole } from './types';

export const ROOT_DASHBOARD_ROLES: OrgMemberRole[] = [
  'founder_full_control',
  'founder_operations',
  'founder_finance',
  'accountant_readonly',
];

export function canUseRootDashboard(role: string | null | undefined): role is OrgMemberRole {
  return ROOT_DASHBOARD_ROLES.includes(role as OrgMemberRole);
}
