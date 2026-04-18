// GET  /api/v1/owner/organization/restaurants — list accessible branches
// POST /api/v1/owner/organization/restaurants — add a new branch to the org

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveOrgContext,
  getOrganizationBranches,
  addBranchToOrganization,
} from '@/lib/server/organizations/service';
import {
  buildAuthorizationService,
  requireOrgContext,
  forbidden,
} from '@/lib/server/authorization/service';
import { addBranchSchema } from '@/lib/server/organizations/schemas';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(_req: NextRequest) {
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

export async function POST(req: NextRequest) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);

  // Only founder_full_control may add new branches
  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can add new branches');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = addBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // Check subdomain uniqueness before delegating to service
  const { data: existing } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('subdomain', input.subdomain)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 });
  }

  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  const result = await addBranchToOrganization(
    ctx!.organization.id,
    supabaseUser!.id,
    input
  );

  if (!result.success || !result.restaurant) {
    return NextResponse.json({ error: result.error ?? 'Failed to create branch' }, { status: 500 });
  }

  return NextResponse.json(
    { success: true, restaurant: result.restaurant },
    { status: 201 }
  );
}
