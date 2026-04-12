// DELETE /api/v1/owner/organization/members/[memberId] – remove a member (founder only)

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext, removeMember } from '@/lib/server/organizations/service';
import { buildAuthorizationService, requireOrgContext, forbidden } from '@/lib/server/authorization/service';
import { createClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ memberId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { memberId } = await params;

  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);

  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can remove members');
  }

  // Prevent self-removal
  if (memberId === ctx!.member.id) {
    return NextResponse.json(
      { error: 'You cannot remove yourself from the organization' },
      { status: 400 }
    );
  }

  // Verify the target member belongs to this organization
  const supabase = await createClient();
  const { data: targetMember, error } = await supabase
    .from('organization_members')
    .select('id, organization_id')
    .eq('id', memberId)
    .eq('organization_id', ctx!.organization.id)
    .single();

  if (error || !targetMember) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const result = await removeMember(memberId);

  if (!result.success) {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
