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
  public_subdomain: string | null;
  onboarding_completed_at: string | null;
}

export async function getRootDashboardAccess(
  userId: string
): Promise<RootDashboardAccess | null> {
  const { data: memberships, error } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id, role, created_at, owner_organizations(public_subdomain, onboarding_completed_at)')
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

  const ownerOrganization = Array.isArray(rootAccessMembership.owner_organizations)
    ? rootAccessMembership.owner_organizations[0]
    : (rootAccessMembership.owner_organizations as { public_subdomain?: string | null } | null | undefined);

  return {
    organization_id: rootAccessMembership.organization_id,
    role: rootAccessMembership.role as OrgMemberRole,
    public_subdomain: ownerOrganization?.public_subdomain ?? null,
    onboarding_completed_at:
      (ownerOrganization as { onboarding_completed_at?: string | null } | null | undefined)
        ?.onboarding_completed_at ?? null,
  };
}

function buildSubdomainUrl(subdomain: string, fullPath: string): string {
  if (process.env.NEXT_PRIVATE_DEVELOPMENT === 'true') {
    return `http://${subdomain}.localhost:3000${fullPath}`;
  }

  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai';
  return `https://${subdomain}.${productionUrl}${fullPath}`;
}

export function buildRootControlSectionUrl(
  locale: string,
  path: string,
  subdomain?: string | null
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = `/${locale}${normalizedPath}`;

  if (subdomain) {
    return buildSubdomainUrl(subdomain, fullPath);
  }

  if (process.env.NEXT_PRIVATE_DEVELOPMENT === 'true') {
    return `http://localhost:3000${fullPath}`;
  }

  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai';
  return `https://${productionUrl}${fullPath}`;
}

export function buildRootControlUrl(
  locale: string,
  subdomain?: string | null
): string {
  return buildRootControlSectionUrl(locale, '/control/overview', subdomain);
}

export function buildBranchDashboardUrl(
  subdomain: string,
  locale: string
): string {
  const path = `/${locale}/branch`;

  return buildSubdomainUrl(subdomain, path);
}
