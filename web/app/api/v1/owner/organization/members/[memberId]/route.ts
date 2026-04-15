// PATCH  /api/v1/owner/organization/members/[memberId] – update member role/scope (founder only)
// DELETE /api/v1/owner/organization/members/[memberId] – remove a member (founder only)

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext, removeMember, editMember } from '@/lib/server/organizations/service';
import { buildAuthorizationService, requireOrgContext, forbidden } from '@/lib/server/authorization/service';
import { createClient } from '@/lib/supabase/server';
import { updateMemberSchema } from '@/lib/server/organizations/schemas';
import { ZodError } from 'zod';

interface Params {
  params: Promise<{ memberId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { memberId } = await params;

  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);

  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can edit members');
  }

  // Prevent self-role-change
  if (memberId === ctx!.member.id) {
    return NextResponse.json(
      { error: 'You cannot edit your own membership' },
      { status: 400 }
    );
  }

  // Verify the target member belongs to this organization
  const supabase = await createClient();
  const { data: targetMember, error: fetchError } = await supabase
    .from('organization_members')
    .select('id, organization_id')
    .eq('id', memberId)
    .eq('organization_id', ctx!.organization.id)
    .eq('is_active', true)
    .single();

  if (fetchError || !targetMember) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const input = updateMemberSchema.parse(body);

    const result = await editMember(memberId, ctx!.organization.id, input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, member: result.member });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Edit member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
