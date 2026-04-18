import { resolveOrgContext } from '@/lib/server/organizations/service';
import type { OrgContext, OrgMemberRole } from '@/lib/server/organizations/types';

export const FOUNDER_CONTROL_ROLES: OrgMemberRole[] = [
  'founder_full_control',
  'founder_operations',
  'founder_finance',
  'accountant_readonly',
];

export async function resolveFounderControlContext(): Promise<OrgContext | null> {
  const ctx = await resolveOrgContext();

  if (!ctx) {
    return null;
  }

  return FOUNDER_CONTROL_ROLES.includes(ctx.member.role) ? ctx : null;
}
