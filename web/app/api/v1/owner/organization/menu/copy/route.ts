// POST /api/v1/owner/organization/menu/copy
//
// Copy all categories, items, sizes, and toppings from one branch to another.
// Both branches must belong to the caller's organization scope.
//
// Request body:
//   { source_restaurant_id: string, target_restaurant_id: string }
//
// The target branch's existing menu is deleted before the copy. This is
// intentional — the UI must confirm before calling this endpoint.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { copyMenuToTargetBranch } from '@/lib/server/organizations/branch-menu';

const copyMenuSchema = z.object({
  source_restaurant_id: z.string().uuid('Valid source restaurant ID required'),
  target_restaurant_id: z.string().uuid('Valid target restaurant ID required'),
}).refine(
  (data) => data.source_restaurant_id !== data.target_restaurant_id,
  { message: 'Source and target branches must be different', path: ['target_restaurant_id'] }
);

export async function POST(req: NextRequest) {
  const ctx = await resolveOrgContext();
  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can copy menus between branches');
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = copyMenuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { source_restaurant_id, target_restaurant_id } = parsed.data;
  const accessible = new Set(ctx!.accessibleRestaurantIds);

  // Both branches must be in the caller's org scope
  if (!accessible.has(source_restaurant_id)) {
    return NextResponse.json({ error: 'Source branch not accessible' }, { status: 403 });
  }
  if (!accessible.has(target_restaurant_id)) {
    return NextResponse.json({ error: 'Target branch not accessible' }, { status: 403 });
  }

  try {
    const result = await copyMenuToTargetBranch(source_restaurant_id, target_restaurant_id);
    return NextResponse.json({
      success: true,
      categories_copied: result.categoriesCopied,
      items_copied: result.itemsCopied,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Menu copy failed';
    console.error('[menu/copy]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
