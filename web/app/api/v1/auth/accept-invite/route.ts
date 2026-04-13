// POST /api/v1/auth/accept-invite
//
// Accepts a pending org invite. Handles two cases:
//   1. User already has a Supabase auth account → add them as org member
//   2. User is new (no auth account) → create account, create users row, add org member
//
// This route uses the admin client because the caller is NOT yet an org member
// at the time of acceptance — RLS would block reading the invite row.
//
// Request body:
//   { token: string, name?: string, password?: string }
//
// - name and password are required for new users (case 2)
// - for existing users, they sign in normally after acceptance

import { NextRequest, NextResponse } from 'next/server';
import { acceptPendingInvite } from '@/lib/server/organizations/invites';
import { acceptInviteSchema } from '@/lib/server/organizations/schemas';
import { ZodError } from 'zod';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { token, name, password } = acceptInviteSchema.parse(body);
    const result = await acceptPendingInvite(token, name, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user_id: result.user_id,
      new_user_created: result.new_user_created ?? false,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
