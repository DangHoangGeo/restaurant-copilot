import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // Assuming this is the correct path
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest'; // Assuming this is the correct path
import { USER_ROLES } from '@/lib/constants'; // Assuming a constants file for roles might exist

// Define a schema for the request body
const inviteUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  target_role: z.enum([USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER, USER_ROLES.CHEF, USER_ROLES.SERVER, USER_ROLES.CASHIER, USER_ROLES.OWNER]), // Add other roles if they can be invited directly
});

// Define allowed roles for inviting users
const ALLOWED_INVITER_ROLES = [USER_ROLES.OWNER, USER_ROLES.MANAGER];

export async function POST(request: NextRequest) {
  try {
    const callingUser: AuthUser | null = await getUserFromRequest();

    if (!callingUser) {
      return NextResponse.json({ error: 'Unauthorized: No user session found' }, { status: 401 });
    }

    if (!callingUser.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized: User is not associated with a restaurant' }, { status: 403 });
    }

    if (!callingUser.role || !ALLOWED_INVITER_ROLES.includes(callingUser.role as (typeof ALLOWED_INVITER_ROLES)[number])) {
      return NextResponse.json({ error: 'Forbidden: User does not have permission to invite new users' }, { status: 403 });
    }

    let reqBody;
    try {
      reqBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body: Must be valid JSON' }, { status: 400 });
    }

    const validationResult = inviteUserSchema.safeParse(reqBody);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validationResult.error.flatten() }, { status: 400 });
    }

    const { email, target_role } = validationResult.data;
    const restaurantId = callingUser.restaurantId;

    // Step 1: Invite user via Supabase Auth Admin
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        role: target_role, // This sets raw_user_meta_data.role in auth.users
        restaurant_id: restaurantId, // This sets raw_user_meta_data.restaurant_id in auth.users
      },
      // redirectTo: 'path-to-your-app-set-password-page' // Optional: if you have a specific flow
    });

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      // Check for specific errors, e.g., user already registered
      if (inviteError.message.includes('User already registered')) {
        return NextResponse.json({ error: 'User already registered', details: inviteError.message }, { status: 409 }); // 409 Conflict
      }
      return NextResponse.json({ error: 'Failed to invite user', details: inviteError.message }, { status: 500 });
    }

    if (!inviteData || !inviteData.user) {
      console.error('No user data returned from invite');
      return NextResponse.json({ error: 'Failed to invite user: No user data returned' }, { status: 500 });
    }

    const invitedUser = inviteData.user;
    const invitedUserId = invitedUser.id;
    const invitedUserEmail = invitedUser.email;

    // Step 2: Insert record into public.users table
    // Name is set to a default 'Invited User'. Could be enhanced to take name from request body.
    const { data: newUserRecord, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: invitedUserId,
        restaurant_id: restaurantId,
        email: invitedUserEmail,
        name: 'Invited User', // Or take from request if added to schema
        role: target_role, // This is the role within the application context (users.role)
      })
      .select('id, email, name, role, restaurant_id')
      .single();

    if (insertError) {
      console.error('Error inserting user into public.users table:', insertError);
      // Potentially, you might want to delete the auth user if this step fails,
      // or handle it as a pending state. For now, return an error.
      return NextResponse.json({ error: 'Failed to save invited user data', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json(newUserRecord, { status: 201 });

  } catch (error: unknown) {
    console.error('Unexpected error in invite endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}
