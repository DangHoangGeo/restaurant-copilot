// GET  /api/v1/owner/organization/invites  – list pending invites (org members)
// POST /api/v1/owner/organization/invites  – create a pending invite (founder only)

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { buildAuthorizationService, requireOrgContext, forbidden } from '@/lib/server/authorization/service';
import { createPendingInvite, listPendingInvites } from '@/lib/server/organizations/invites';
import { createPendingInviteSchema } from '@/lib/server/organizations/schemas';
import { ZodError } from 'zod';

export async function GET() {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const invites = await listPendingInvites(ctx!.organization.id);
  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can create invites');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const input = createPendingInviteSchema.parse(body);

    // Check via admin if user exists with this email and is already a member
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
    const { data: userCheck } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', input.email.toLowerCase().trim())
      .single();

    if (userCheck) {
      const { data: memberCheck } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('organization_id', ctx!.organization.id)
        .eq('user_id', userCheck.id)
        .eq('is_active', true)
        .single();

      if (memberCheck) {
        return NextResponse.json(
          { error: 'This person is already an active member of your organization' },
          { status: 409 }
        );
      }
    }

    const invite = await createPendingInvite(
      ctx!.organization.id,
      ctx!.member.user_id,
      input.email,
      input.role,
      input.shop_scope,
      input.selected_restaurant_ids
    );

    if (!invite) {
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        invite_id: invite.id,
        invite_token: invite.invite_token,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Create invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
