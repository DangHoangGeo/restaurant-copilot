import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, AuthUser } from "@/lib/server/getUserFromRequest";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES, EMPLOYEE_JOB_TITLES } from "@/lib/constants";

const updateEmployeeSchema = z.object({
  name: z.string().min(1, "Name cannot be empty.").optional(),
  employee_job_title: z.enum([
    EMPLOYEE_JOB_TITLES.MANAGER,
    EMPLOYEE_JOB_TITLES.CHEF,
    EMPLOYEE_JOB_TITLES.SERVER,
    EMPLOYEE_JOB_TITLES.CASHIER,
    EMPLOYEE_JOB_TITLES.PART_TIME,
  ]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }, // Changed from Promise based on typical Next.js usage
) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  const { employeeId } = await params;

  if (!callingUser || !callingUser.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID." },
      { status: 401 },
    );
  }

  // Authorization: Ensure calling user is owner or manager
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!employeeId) {
    return NextResponse.json(
      { error: "Employee ID is required." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("employees")
      .select(
        "id, role, users:users!employees_user_id_fkey(id, email, name, role)" // Added user role for clarity
      )
      .eq("id", employeeId)
      .eq("restaurant_id", callingUser.restaurantId)
      .single();

    if (error) {
      await logger.error('employee-id-api-get', `Error fetching employee ${employeeId} for restaurant ${callingUser.restaurantId}`, {
        error: error.message,
        employeeId,
        restaurantId: callingUser.restaurantId,
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json(
        { error: "Employee not found or database error." },
        { status: error.code === 'PGRST116' ? 404 : 500 }, // PGRST116: single row not found
      );
    }
    if (!data) {
       return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error('employee-id-api-get-catch', `Unexpected error fetching employee ${employeeId}`, {
        error: errorMessage,
        employeeId,
        restaurantId: callingUser.restaurantId,
      }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: errorMessage },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }, // Changed from Promise
) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  const { employeeId } = await params;

  if (!callingUser || !callingUser.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID." },
      { status: 401 },
    );
  }

  // Authorization: Ensure calling user is owner or manager
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as 'owner' | 'manager')) {
    await logger.warn('employee-id-api-patch-auth', `User ${callingUser.userId} with role ${callingUser.role} tried to update employee ${employeeId} without permission.`,
      {}, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!employeeId) {
    return NextResponse.json(
      { error: "Employee ID is required." },
      { status: 400 },
    );
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validationResult = updateEmployeeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { name, employee_job_title } = validationResult.data;

    if (!name && !employee_job_title) {
      return NextResponse.json(
        { error: "No fields to update provided. Provide 'name' or 'employee_job_title'." },
        { status: 400 },
      );
    }

    // Fetch employee to get user_id for name update
    const { data: existingEmployee, error: fetchError } = await supabaseAdmin
      .from("employees")
      .select("user_id, role")
      .eq("id", employeeId)
      .eq("restaurant_id", callingUser.restaurantId)
      .single();

    if (fetchError || !existingEmployee) {
      await logger.error('employee-id-api-patch-fetch', `Employee ${employeeId} not found for update for restaurant ${callingUser.restaurantId}`, {
        error: fetchError?.message, employeeId, restaurantId: callingUser.restaurantId
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (name) {
      const { error: userNameUpdateError } = await supabaseAdmin
        .from("users")
        .update({ name: name, updated_at: new Date().toISOString() })
        .eq("id", existingEmployee.user_id)
        .eq("restaurant_id", callingUser.restaurantId); // Ensure user is part of the same restaurant

      if (userNameUpdateError) {
        await logger.error('employee-id-api-patch-user-update', `Failed to update name for user ${existingEmployee.user_id}`, {
          error: userNameUpdateError.message, userId: existingEmployee.user_id, employeeId, restaurantId: callingUser.restaurantId
        }, callingUser.restaurantId, callingUser.userId);
        return NextResponse.json({ error: "Failed to update employee's name" }, { status: 500 });
      }
    }

    if (employee_job_title) {
      const { error: employeeRoleUpdateError } = await supabaseAdmin
        .from("employees")
        .update({ role: employee_job_title, updated_at: new Date().toISOString() })
        .eq("id", employeeId)
        .eq("restaurant_id", callingUser.restaurantId);

      if (employeeRoleUpdateError) {
         await logger.error('employee-id-api-patch-role-update', `Failed to update role for employee ${employeeId}`, {
          error: employeeRoleUpdateError.message, employeeId, restaurantId: callingUser.restaurantId
        }, callingUser.restaurantId, callingUser.userId);
        return NextResponse.json({ error: "Failed to update employee's job title" }, { status: 500 });
      }
    }

    // Fetch the updated employee data to return
    const { data: updatedEmployeeData, error: finalFetchError } = await supabaseAdmin
      .from("employees")
      .select("id, role, users:users!employees_user_id_fkey(id, email, name, role)")
      .eq("id", employeeId)
      .eq("restaurant_id", callingUser.restaurantId)
      .single();

    if (finalFetchError || !updatedEmployeeData) {
      await logger.error('employee-id-api-patch-final-fetch', `Failed to fetch updated employee ${employeeId} after update`, {
         error: finalFetchError?.message, employeeId, restaurantId: callingUser.restaurantId
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: "Failed to retrieve updated employee details, but update might have succeeded." }, { status: 500 });
    }

    // Map to desired response structure if necessary, or return as is
    // Handle the users relation which might be an array or object
    const userInfo = Array.isArray(updatedEmployeeData.users) 
      ? updatedEmployeeData.users[0] 
      : updatedEmployeeData.users;

    const responsePayload = {
      id: updatedEmployeeData.id,
      employee_job_title: updatedEmployeeData.role,
      user: {
        id: userInfo?.id,
        email: userInfo?.email,
        name: userInfo?.name,
        role: userInfo?.role, // This is users.role (e.g., 'employee')
      }
    };

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error('employee-id-api-patch-catch', `Unexpected error updating employee ${employeeId}`, {
        error: errorMessage, employeeId, restaurantId: callingUser.restaurantId,
      }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: errorMessage },
      { status: 500 },
    );
  }
}

// DELETE — soft-deactivates the employee record and bans the auth user so they
// can no longer log in.  Hard-delete is intentionally avoided: attendance and
// schedule history must survive for payroll audit purposes.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  const { employeeId } = await params;

  if (!callingUser || !callingUser.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID." },
      { status: 401 },
    );
  }

  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as 'owner' | 'manager')) {
    await logger.warn(
      'employee-id-api-delete-auth',
      `User ${callingUser.userId} with role ${callingUser.role} tried to deactivate employee ${employeeId} without permission.`,
      {}, callingUser.restaurantId, callingUser.userId,
    );
    return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!employeeId) {
    return NextResponse.json({ error: "Employee ID is required." }, { status: 400 });
  }

  try {
    // Fetch the employee to confirm ownership and get the auth user id.
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("employees")
      .select("id, user_id, is_active")
      .eq("id", employeeId)
      .eq("restaurant_id", callingUser.restaurantId)
      .maybeSingle();

    if (fetchErr) {
      await logger.error('employee-id-api-delete-fetch', `DB error fetching employee ${employeeId}`, {
        error: fetchErr.message, employeeId, restaurantId: callingUser.restaurantId,
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Employee not found under your restaurant." },
        { status: 404 },
      );
    }

    if (!existing.is_active) {
      return NextResponse.json({ message: "Employee is already deactivated." }, { status: 200 });
    }

    // Soft-deactivate the employees row.
    const now = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin
      .from("employees")
      .update({
        is_active: false,
        deactivated_at: now,
        deactivated_by: callingUser.userId,
        updated_at: now,
      })
      .eq("id", employeeId)
      .eq("restaurant_id", callingUser.restaurantId);

    if (updateErr) {
      await logger.error('employee-id-api-delete-update', `Failed to deactivate employee ${employeeId}`, {
        error: updateErr.message, employeeId, restaurantId: callingUser.restaurantId,
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: "Failed to deactivate employee." }, { status: 500 });
    }

    // Ban the Supabase auth user for 100 years — prevents login without deleting
    // attendance history or the users row.
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(
      existing.user_id,
      { ban_duration: '876000h' },
    );

    if (banErr) {
      // Non-fatal: the employee row is already deactivated.  Log but still
      // return success so the UI doesn't retry and orphan the DB state.
      await logger.warn(
        'employee-id-api-delete-ban',
        `Auth ban failed for user ${existing.user_id} (employee ${employeeId}); employee row was deactivated.`,
        { error: banErr.message, userId: existing.user_id, employeeId },
        callingUser.restaurantId,
        callingUser.userId,
      );
    }

    await logger.info(
      'employee-deactivated',
      `Employee ${employeeId} deactivated by ${callingUser.userId}`,
      { employeeId, deactivatedBy: callingUser.userId },
      callingUser.restaurantId,
      callingUser.userId,
    );

    return NextResponse.json({ message: "Employee deactivated successfully." }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error('employee-id-api-delete-catch', `Unexpected error deactivating employee ${employeeId}`, {
      error: errorMessage, employeeId, restaurantId: callingUser.restaurantId,
    }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: errorMessage },
      { status: 500 },
    );
  }
}

// POST /api/v1/owner/employees/[employeeId]/reactivate would be a separate
// route; expose reactivation via PATCH on is_active if needed in a future pass.
