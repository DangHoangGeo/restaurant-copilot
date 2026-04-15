// POST /api/v1/owner/organization/invites/[inviteId]/resend
//
// Regenerates the invite token and extends the expiry by 7 days.
// Returns the new token so the founder can copy it again.

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import {
  buildAuthorizationService,
  requireOrgContext,
  forbidden,
} from '@/lib/server/authorization/service';
import { resendPendingInvite } from '@/lib/server/organizations/invites';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can resend invites');
  }

  const { inviteId } = await params;

  const result = await resendPendingInvite(inviteId, ctx!.organization.id);

  if (!result) {
    return NextResponse.json(
      { error: 'Invite not found, already accepted, or could not be updated' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    invite_token: result.invite_token,
    expires_at: result.expires_at,
  });
}
