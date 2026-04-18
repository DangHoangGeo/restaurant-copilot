// GET /api/v1/owner/organization/overview
// Returns per-branch KPIs: today's revenue, open order count.
// Restricted to members who can access the org (founders with any scope).

import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { buildAuthorizationService, requireOrgContext } from '@/lib/server/authorization/service';
import { listOrganizationBranches } from '@/lib/server/organizations/queries';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { OrgOverviewResponse, OrgBranchOverview } from '@/shared/types/organization';

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
    const empty: OrgOverviewResponse = {
      branches: [],
      total_today_revenue: 0,
      total_open_orders: 0,
    };
    return NextResponse.json(empty);
  }

  const restaurantIds = branches.map((b) => b.id);
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's completed-order revenue and open order counts in parallel
  const [salesResult, openOrdersResult, restaurantResult] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('restaurant_id, total_amount')
      .in('restaurant_id', restaurantIds)
      .eq('status', 'completed')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`),

    supabaseAdmin
      .from('orders')
      .select('restaurant_id')
      .in('restaurant_id', restaurantIds)
      .not('status', 'in', '("completed","canceled")'),

    supabaseAdmin
      .from('restaurants')
      .select('id, name, subdomain')
      .in('id', restaurantIds),
  ]);

  // Build lookup maps
  const revenueByBranch = new Map<string, number>();
  for (const order of salesResult.data ?? []) {
    const prev = revenueByBranch.get(order.restaurant_id) ?? 0;
    revenueByBranch.set(order.restaurant_id, prev + (order.total_amount ?? 0));
  }

  const openOrdersByBranch = new Map<string, number>();
  for (const order of openOrdersResult.data ?? []) {
    const prev = openOrdersByBranch.get(order.restaurant_id) ?? 0;
    openOrdersByBranch.set(order.restaurant_id, prev + 1);
  }

  const restaurantMap = new Map(
    (restaurantResult.data ?? []).map((r) => [r.id, r])
  );

  const branchOverviews: OrgBranchOverview[] = branches.map((b) => {
    const restaurant = restaurantMap.get(b.id);
    return {
      restaurant_id: b.id,
      name: restaurant?.name ?? b.name,
      subdomain: restaurant?.subdomain ?? b.subdomain,
      today_revenue: revenueByBranch.get(b.id) ?? 0,
      open_orders_count: openOrdersByBranch.get(b.id) ?? 0,
    };
  });

  const total_today_revenue = branchOverviews.reduce(
    (sum, b) => sum + b.today_revenue,
    0
  );
  const total_open_orders = branchOverviews.reduce(
    (sum, b) => sum + b.open_orders_count,
    0
  );

  const response: OrgOverviewResponse = {
    branches: branchOverviews,
    total_today_revenue,
    total_open_orders,
  };

  return NextResponse.json(response);
}
