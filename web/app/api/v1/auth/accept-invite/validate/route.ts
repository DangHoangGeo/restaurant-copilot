// GET /api/v1/auth/accept-invite/validate?token=<hex>
//
// Validates a pending invite token and returns public metadata about it
// (email, role, whether the invitee already has an auth account).
// Does NOT expose the token itself or any secret fields.

import { NextRequest, NextResponse } from 'next/server';
import { getPendingInviteByToken } from '@/lib/server/organizations/invites';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const invite = await getPendingInviteByToken(token);
  if (!invite) {
    return NextResponse.json(
      { error: 'Invite not found, expired, or already used' },
      { status: 404 }
    );
  }

  // Check if the invited email already has a Supabase auth account
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = users?.users?.find(
    (u) => u.email?.toLowerCase() === invite.email.toLowerCase()
  );

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    shop_scope: invite.shop_scope,
    expires_at: invite.expires_at,
    is_new_user: !existingUser,
  });
}
