// GET /api/v1/owner/organization/restaurants
// Returns the restaurants in the caller's organization, filtered to only those
// the caller has access to (respects shop_scope).

import { NextResponse } from 'next/server';
import { resolveOrgContext, getOrganizationBranches } from '@/lib/server/organizations/service';
import { requireOrgContext } from '@/lib/server/authorization/service';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const orgBranches = await getOrganizationBranches(ctx!.organization.id);

  // Filter to the restaurants this member can access
  const accessibleIds = new Set(ctx!.accessibleRestaurantIds);
  const accessibleBranches = orgBranches.filter((b) =>
    accessibleIds.has(b.restaurant_id)
  );

  if (accessibleBranches.length === 0) {
    return NextResponse.json({ restaurants: [] });
  }

  // Enrich with restaurant name and subdomain
  const supabase = await createClient();
  const restaurantIds = accessibleBranches.map((b) => b.restaurant_id);

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, subdomain, is_active, timezone, currency')
    .in('id', restaurantIds);

  if (error) {
    return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 });
  }

  return NextResponse.json({ restaurants: restaurants ?? [] });
}
