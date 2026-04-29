import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, AuthUser } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES, EMPLOYEE_JOB_TITLES } from "@/lib/constants";

const createEmployeeSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  name: z.string().min(1, { message: "Name cannot be empty" }),
  employee_job_title: z.enum([
    EMPLOYEE_JOB_TITLES.MANAGER,
    EMPLOYEE_JOB_TITLES.CHEF,
    EMPLOYEE_JOB_TITLES.SERVER,
    EMPLOYEE_JOB_TITLES.CASHIER,
    EMPLOYEE_JOB_TITLES.PART_TIME,
  ]),
});

export async function GET() {
  let user;
  try {
    user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("employees")
      .select(
        `id, role, user_id, is_active, deactivated_at, users:users!employees_user_id_fkey(id, email, name, role)`
      )
      .eq("restaurant_id", user.restaurantId)
      .eq("is_active", true);

    if (error) {
      await logger.error('employees-api-get', 'Error fetching employees', {
        error: error.message,
        restaurantId: user.restaurantId
      }, user.restaurantId);
      return NextResponse.json(
        { message: "Error fetching employees", details: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend expectations
    const employees = data?.map((emp: {
      id: string;
      role: string;
      user_id: string;
      users: { id: string; email: string; name: string; role: string }[] | { id: string; email: string; name: string; role: string };
    }) => {
      // users is returned as an array from Supabase, but we expect a single user
      const user = Array.isArray(emp.users) ? emp.users[0] : emp.users;
      return {
        id: emp.id,
        role: emp.role, // This is the employee job title from employees.role
        user_id: emp.user_id,
        users: user, // Transform array to single object to match ApiEmployee interface
      };
    }) || [];

    return NextResponse.json({ employees }, { status: 200 });
  } catch (error) {
    await logger.error('employees-api-get', 'API Error in GET employees', {
      error: error instanceof Error ? error.message : 'Unknown error',
      restaurantId: user?.restaurantId || 'unknown'
    }, user?.restaurantId || undefined, error instanceof Error ? error.stack : undefined);
    return NextResponse.json(
      {
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error!",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  if (!callingUser || !callingUser.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID" },
      { status: 401 },
    );
  }

  // Ensure the calling user has a role that allows creating employees (e.g. owner or manager)
  // This check might need to be more sophisticated based on app requirements
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body: Must be valid JSON' }, { status: 400 });
    }

    const validationResult = createEmployeeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.flatten() },
        { status: 400 },
      );
    }
    const { email, name, employee_job_title } = validationResult.data;
    const restaurantId = callingUser.restaurantId;

    // Step 1: Invite the user via Supabase Auth Admin to create an auth.users entry
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name, // This sets raw_user_meta_data.name in auth.users
        role: USER_ROLES.EMPLOYEE, // All employees get 'employee' role in auth.users meta_data
        restaurant_id: restaurantId,
      },
    });

    if (inviteError) {
      await logger.error('employees-api-post-invite', 'Error inviting employee user', {
        error: inviteError.message,
        restaurantId: restaurantId,
        invitedEmail: email,
      }, restaurantId, callingUser.userId);
      if (inviteError.message.includes('User already registered')) {
         // If user is registered but not in our system, we might want to link them.
         // For now, this flow assumes we invite new users.
         // Alternative: Query users table by email. If exists and matches restaurant, use that user_id.
         // If exists but different restaurant, error. If not exists, invite.
        return NextResponse.json({ error: 'User already has an account. Please use a different email or link existing user (not implemented).', details: inviteError.message }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to invite employee user', details: inviteError.message }, { status: 500 });
    }

    if (!inviteData || !inviteData.user) {
      await logger.error('employees-api-post-invite', 'No user data returned from invite', {
        invitedEmail: email,
        restaurantId: restaurantId,
      }, restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Failed to invite employee: No user data returned' }, { status: 500 });
    }

    const invitedAuthUser = inviteData.user;
    const invitedUserId = invitedAuthUser.id;

    // Step 2: Insert a corresponding record into the public.users table
    const { data: newUserRecord, error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: invitedUserId,
        restaurant_id: restaurantId,
        email: email, // Use the original email from request
        name: name, // Name from the request body
        role: USER_ROLES.EMPLOYEE, // Assign 'employee' role in the public.users table
      })
      .select('id, email, name, role') // Select fields to return or use later
      .single();

    if (userInsertError) {
      await logger.error('employees-api-post-user-insert', 'Error inserting employee into public.users', {
        error: userInsertError.message,
        restaurantId: restaurantId,
        invitedUserId: invitedUserId,
        email: email,
      }, restaurantId, callingUser.userId);
      // Rollback auth user? Difficult. Log and alert.
      return NextResponse.json({ error: 'Failed to save employee user data', details: userInsertError.message }, { status: 500 });
    }

    // Step 3: Create the employee record in the 'employees' table
    const { data: createdEmployee, error: employeeInsertError } = await supabaseAdmin
      .from("employees")
      .insert({
        restaurant_id: restaurantId,
        user_id: invitedUserId, // Link to the new user created
        role: employee_job_title, // This is the job title like 'chef', 'server'
      })
      .select('id, user_id, role, created_at, users:users!employees_user_id_fkey(email, name, role)') // Fetch related user data
      .single();

    if (employeeInsertError) {
      await logger.error('employees-api-post-employee-insert', 'Error creating employee record', {
        error: employeeInsertError.message,
        restaurantId: restaurantId,
        user_id: invitedUserId,
        employee_job_title: employee_job_title,
      }, restaurantId, callingUser.userId);
      // Rollback user and auth user? Complex. Log and alert.
      return NextResponse.json(
        { message: "Error creating employee record", details: employeeInsertError.message },
        { status: 500 },
      );
    }

    // Construct a response object that includes details from both employee and user records
    const responsePayload = {
      id: createdEmployee.id, // Employee ID
      user_id: createdEmployee.user_id,
      email: newUserRecord.email,
      name: newUserRecord.name,
      employee_job_title: createdEmployee.role, // from employees table
      user_app_role: newUserRecord.role, // from users table (should be 'employee')
      created_at: createdEmployee.created_at,
    };

    return NextResponse.json(responsePayload, { status: 201 });

  } catch (error) {
    await logger.error('employees-api-post', 'API Error in POST employee', {
      error: error instanceof Error ? error.message : 'Unknown error',
      restaurantId: callingUser?.restaurantId
    }, callingUser?.restaurantId, callingUser?.userId);
    return NextResponse.json(
      {
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error!",
      },
      { status: 500 },
    );
  }
}
