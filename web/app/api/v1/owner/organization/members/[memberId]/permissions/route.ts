// GET  /api/v1/owner/organization/members/[memberId]/permissions
//   Returns all 9 permissions for the given member, showing effective value
//   and whether each is a role default or an explicit override.
//
// PATCH /api/v1/owner/organization/members/[memberId]/permissions
//   Upserts permission overrides. Pass { permissions: { reports: true, ... } }
//   to set specific overrides, or { reset: true } to clear all overrides.
//   Requires canManageMembers() (founder_full_control only).

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import {
  buildAuthorizationService,
  requireOrgContext,
  forbidden,
} from '@/lib/server/authorization/service';
import {
  getMemberPermissionsWithOverrides,
  upsertMemberPermissions,
  resetMemberPermissions,
} from '@/lib/server/organizations/queries';
import { updateMemberPermissionsSchema } from '@/lib/server/organizations/schemas';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { OrgMemberRole } from '@/lib/server/organizations/types';
import { ZodError } from 'zod';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can view permission overrides');
  }

  const { memberId } = await params;

  // Verify the member belongs to this org
  const { data: memberRow, error: memberError } = await supabaseAdmin
    .from('organization_members')
    .select('id, role')
    .eq('id', memberId)
    .eq('organization_id', ctx!.organization.id)
    .eq('is_active', true)
    .single();

  if (memberError || !memberRow) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const permissions = await getMemberPermissionsWithOverrides(
    memberId,
    memberRow.role as OrgMemberRole
  );

  return NextResponse.json({ permissions });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canManageMembers()) {
    return forbidden('Only founders with full control can update permission overrides');
  }

  const { memberId } = await params;

  // Prevent modifying own permissions
  if (memberId === ctx!.member.id) {
    return forbidden('You cannot modify your own permissions');
  }

  // Verify the member belongs to this org
  const { data: memberRow, error: memberError } = await supabaseAdmin
    .from('organization_members')
    .select('id, role')
    .eq('id', memberId)
    .eq('organization_id', ctx!.organization.id)
    .eq('is_active', true)
    .single();

  if (memberError || !memberRow) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const input = updateMemberPermissionsSchema.parse(body);

    if (input.reset) {
      const ok = await resetMemberPermissions(memberId);
      if (!ok) {
        return NextResponse.json({ error: 'Failed to reset permissions' }, { status: 500 });
      }
    } else if (input.permissions && Object.keys(input.permissions).length > 0) {
      const ok = await upsertMemberPermissions(
        ctx!.organization.id,
        memberId,
        ctx!.member.user_id,
        input.permissions as Record<string, boolean>
      );
      if (!ok) {
        return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
      }
    }

    // Return updated state
    const permissions = await getMemberPermissionsWithOverrides(
      memberId,
      memberRow.role as OrgMemberRole
    );

    return NextResponse.json({ success: true, permissions });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
