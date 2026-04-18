// GET  /api/v1/owner/organization/employees  – list all employees across accessible branches
// POST /api/v1/owner/organization/employees  – invite a new employee to a specific branch

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import {
  buildAuthorizationService,
  requireOrgContext,
  requirePermission,
} from '@/lib/server/authorization/service';
import { listOrganizationEmployees } from '@/lib/server/organizations/queries';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/lib/logger';
import { USER_ROLES } from '@/lib/constants';

const createEmployeeSchema = z.object({
  restaurant_id: z.string().uuid('Invalid restaurant ID'),
  email: z.string().email('Valid email required'),
  name: z.string().min(1, 'Name required').max(100),
  job_title: z.enum(['manager', 'chef', 'server', 'cashier']),
});

export async function GET() {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  const permError = requirePermission(authz, 'employees');
  if (permError) return permError;

  const employees = await listOrganizationEmployees(ctx!.accessibleRestaurantIds);

  return NextResponse.json({ employees, total_count: employees.length });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  const permError = requirePermission(authz, 'employees');
  if (permError) return permError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { restaurant_id, email, name, job_title } = parsed.data;

  // Verify the caller has access to the target restaurant
  if (!ctx!.accessibleRestaurantIds.includes(restaurant_id)) {
    return NextResponse.json({ error: 'Access denied to this restaurant' }, { status: 403 });
  }

  try {
    // Invite the user via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role: USER_ROLES.EMPLOYEE,
        restaurant_id,
      },
    });

    if (inviteError) {
      // If user already exists, try to find them and link them
      if (inviteError.message.includes('already registered') || inviteError.message.includes('already been registered')) {
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (!existingUser) {
          return NextResponse.json({ error: 'User already registered but not found in system' }, { status: 409 });
        }

        // Check if already an employee at this restaurant
        const { data: existingEmp } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('restaurant_id', restaurant_id)
          .maybeSingle();

        if (existingEmp) {
          return NextResponse.json({ error: 'This person is already an employee at this restaurant' }, { status: 409 });
        }

        // Add them as employee
        const { error: empError } = await supabaseAdmin
          .from('employees')
          .insert({ user_id: existingUser.id, restaurant_id, role: job_title });

        if (empError) {
          return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Existing user added as employee' });
      }

      await logger.error('org-employees-post', 'Error inviting employee', {
        error: inviteError.message,
        restaurant_id,
        email,
      }, restaurant_id);

      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    const userId = inviteData.user?.id;

    if (!userId) {
      await logger.error('org-employees-post', 'Invite API returned missing user', {
        restaurant_id,
        email,
      }, restaurant_id);
      return NextResponse.json({ error: 'Failed to create employee from invite response' }, { status: 500 });
    }

    // Create entry in public.users if it doesn't exist
    const { error: userUpsertError } = await supabaseAdmin
      .from('users')
      .upsert({ id: userId, email, name, role: USER_ROLES.EMPLOYEE, restaurant_id }, { onConflict: 'id' });

    if (userUpsertError) {
      await logger.error('org-employees-post', 'Error upserting public user', {
        error: userUpsertError.message,
        userId,
        restaurant_id,
      }, restaurant_id);
      return NextResponse.json({ error: 'Failed to sync user profile' }, { status: 500 });
    }

    // Create employee record
    const { error: empError } = await supabaseAdmin
      .from('employees')
      .insert({ user_id: userId, restaurant_id, role: job_title });

    if (empError) {
      await logger.error('org-employees-post', 'Error creating employee record', {
        error: empError.message,
        userId,
        restaurant_id,
      }, restaurant_id);
      return NextResponse.json({ error: 'Invite sent but failed to create employee record' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Invitation sent to ' + email });
  } catch (err) {
    console.error('Create employee error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
