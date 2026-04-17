import { supabaseAdmin } from '@/lib/supabaseAdmin';
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

export interface RootDashboardAccess {
  organization_id: string;
  role: OrgMemberRole;
}

export async function getRootDashboardAccess(
  userId: string
): Promise<RootDashboardAccess | null> {
  const { data: memberships, error } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id, role, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error || !memberships) {
    return null;
  }

  const rootAccessMembership = memberships.find((membership) =>
    canUseRootDashboard(membership.role)
  );

  if (!rootAccessMembership) {
    return null;
  }

  return {
    organization_id: rootAccessMembership.organization_id,
    role: rootAccessMembership.role as OrgMemberRole,
  };
}

export function buildRootControlUrl(locale: string): string {
  return buildRootControlSectionUrl(locale, '/control/overview');
}

export function buildRootControlSectionUrl(
  locale: string,
  path: string
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = `/${locale}${normalizedPath}`;

  if (process.env.NEXT_PRIVATE_DEVELOPMENT === 'true') {
    return `http://localhost:3000${fullPath}`;
  }

  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai';
  return `https://${productionUrl}${fullPath}`;
}

export function buildBranchDashboardUrl(
  subdomain: string,
  locale: string
): string {
  const path = `/${locale}/branch`;

  if (process.env.NEXT_PRIVATE_DEVELOPMENT === 'true') {
    return `http://${subdomain}.localhost:3000${path}`;
  }

  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai';
  return `https://${subdomain}.${productionUrl}${path}`;
}
