// GET /api/v1/owner/organization/menu/compare?branch_a=<id>&branch_b=<id>
//
// Returns menu snapshots for two branches so the UI can show a side-by-side
// comparison of categories, items, and prices.
// Both branches must belong to the caller's organization scope.

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { requireOrgContext } from '@/lib/server/authorization/service';
import { compareMenusBetweenBranches } from '@/lib/server/organizations/branch-menu';

export async function GET(req: NextRequest) {
  const ctx = await resolveOrgContext();
  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const { searchParams } = new URL(req.url);
  const branchA = searchParams.get('branch_a');
  const branchB = searchParams.get('branch_b');

  if (!branchA || !branchB) {
    return NextResponse.json(
      { error: 'branch_a and branch_b query params are required' },
      { status: 400 }
    );
  }

  if (branchA === branchB) {
    return NextResponse.json(
      { error: 'branch_a and branch_b must be different' },
      { status: 400 }
    );
  }

  const accessible = new Set(ctx!.accessibleRestaurantIds);

  if (!accessible.has(branchA)) {
    return NextResponse.json({ error: 'branch_a not accessible' }, { status: 403 });
  }
  if (!accessible.has(branchB)) {
    return NextResponse.json({ error: 'branch_b not accessible' }, { status: 403 });
  }

  try {
    const result = await compareMenusBetweenBranches(branchA, branchB);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Menu compare failed';
    console.error('[menu/compare]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
