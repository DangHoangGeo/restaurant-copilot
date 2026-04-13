// GET /api/v1/owner/organization/active-branch  – return the active restaurant_id
// PUT /api/v1/owner/organization/active-branch  – set the active branch (validated)
//
// The active branch is stored in an httpOnly cookie so it survives page navigations
// without client JS holding it in memory. Every read validates the branch against
// the caller's accessible restaurant IDs — an org member cannot set a branch they
// do not have access to.

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { requireOrgContext, forbidden } from '@/lib/server/authorization/service';
import {
  getActiveBranchId,
  buildActiveBranchCookieHeader,
} from '@/lib/server/organizations/active-branch';
import { setActiveBranchSchema } from '@/lib/server/organizations/schemas';
import { ZodError } from 'zod';

export async function GET() {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const restaurantId = await getActiveBranchId(ctx!);
  return NextResponse.json({ restaurant_id: restaurantId });
}

export async function PUT(req: NextRequest) {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { restaurant_id } = setActiveBranchSchema.parse(body);

    // Validate the caller has access to the requested branch
    if (!ctx!.accessibleRestaurantIds.includes(restaurant_id)) {
      return forbidden('You do not have access to this branch');
    }

    const response = NextResponse.json({ success: true, restaurant_id });
    response.headers.set('Set-Cookie', buildActiveBranchCookieHeader(restaurant_id));
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Set active branch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
