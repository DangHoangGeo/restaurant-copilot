// GET  /api/v1/owner/organization  – return the caller's organization summary
// No write endpoint here; org name/settings update is deferred to Phase 2

import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { requireOrgContext } from '@/lib/server/authorization/service';

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
