// GET /api/v1/owner/organization/overview
// Returns per-branch KPIs: today's revenue, open order count.
// Restricted to members who can access the org (founders with any scope).

import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { buildAuthorizationService, requireOrgContext } from '@/lib/server/authorization/service';
import { listOrganizationBranches } from '@/lib/server/organizations/queries';
import { buildOrganizationOverview } from '@/lib/server/organizations/overview';
import { supabaseReadAdmin } from '@/lib/supabase/read-client';
import type { OrgOverviewResponse } from '@/shared/types/organization';

export async function GET() {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);

  // Only founders (all types) get the cross-branch overview
  const founderRoles = [
    'founder_full_control',
    'founder_operations',
    'founder_finance',
  ] as const;

  if (!founderRoles.includes(authz!.role as typeof founderRoles[number])) {
    return NextResponse.json({ error: 'Forbidden: founders only' }, { status: 403 });
  }

  // Get branches accessible to this member
  const allBranches = await listOrganizationBranches(ctx!.organization.id);
  const accessibleIds = new Set(ctx!.accessibleRestaurantIds);
  const branches = allBranches.filter((b) => accessibleIds.has(b.id));

  if (branches.length === 0) {
    return NextResponse.json(
      buildOrganizationOverview({
        branches: [],
        metrics: [],
      })
    );
  }

  const restaurantIds = branches.map((b) => b.id);
  const today = new Date().toISOString().split('T')[0];
  const { data: metrics, error } = await supabaseReadAdmin.rpc(
    'get_organization_branch_overview',
    {
      p_restaurant_ids: restaurantIds,
      p_target_date: today,
    },
    { get: true }
  );

  if (error) {
    console.error('Error in GET /owner/organization/overview:', error);
    return NextResponse.json({ error: 'Failed to load organization overview' }, { status: 500 });
  }

  const response: OrgOverviewResponse = buildOrganizationOverview({
    branches,
    metrics,
  });

  return NextResponse.json(response);
}
