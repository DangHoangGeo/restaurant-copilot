// GET  /api/v1/owner/organization/members  – list org members
// POST /api/v1/owner/organization/members  – invite a new member (founder only)

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext, getOrganizationMembers, inviteOrganizationMember } from '@/lib/server/organizations/service';
import { buildAuthorizationService, requireOrgContext, forbidden } from '@/lib/server/authorization/service';
import { inviteOrgMemberSchema } from '@/lib/server/organizations/schemas';
import { ZodError } from 'zod';

export async function GET() {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const members = await getOrganizationMembers(ctx!.organization.id);

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);

  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can invite members');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const input = inviteOrgMemberSchema.parse(body);

    const result = await inviteOrganizationMember(
      ctx!.organization.id,
      ctx!.member.user_id,
      input
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Invite member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
