// GET   /api/v1/owner/organization  – return the caller's organization summary
// PATCH /api/v1/owner/organization  – update organization settings (org_settings permission)

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext, updateOrganization } from '@/lib/server/organizations/service';
import {
  buildAuthorizationService,
  requireOrgContext,
  forbidden,
} from '@/lib/server/authorization/service';
import { updateOrgSchema } from '@/lib/server/organizations/schemas';
import { ZodError } from 'zod';

export async function GET() {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  return NextResponse.json({
    organization: ctx!.organization,
    member: {
      id: ctx!.member.id,
      role: ctx!.member.role,
      shop_scope: ctx!.member.shop_scope,
      joined_at: ctx!.member.joined_at,
    },
    accessible_restaurant_count: ctx!.accessibleRestaurantIds.length,
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canChangeOrgSettings()) {
    return forbidden('Requires organization_settings permission');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const input = updateOrgSchema.parse(body);

    if (!input.name && !input.timezone && !input.currency) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const result = await updateOrganization(ctx!.organization.id, input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, organization: result.organization });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update organization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
