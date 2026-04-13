// DELETE /api/v1/owner/organization/invites/[inviteId]  – revoke a pending invite

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { buildAuthorizationService, requireOrgContext, forbidden } from '@/lib/server/authorization/service';
import { revokePendingInvite } from '@/lib/server/organizations/invites';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can revoke invites');
  }

  const { inviteId } = await params;

  // Verify the invite belongs to this org before revoking
  const { data: invite, error } = await supabaseAdmin
    .from('organization_pending_invites')
    .select('id, organization_id')
    .eq('id', inviteId)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.organization_id !== ctx!.organization.id) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  const ok = await revokePendingInvite(inviteId);
  if (!ok) {
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
