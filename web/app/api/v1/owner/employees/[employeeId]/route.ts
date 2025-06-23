import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, AuthUser } from "@/lib/server/getUserFromRequest";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES, EMPLOYEE_JOB_TITLES, UserRole } from "@/lib/constants";

const updateEmployeeSchema = z.object({
  name: z.string().min(1, "Name cannot be empty.").optional(),
  employee_job_title: z.enum([
    EMPLOYEE_JOB_TITLES.MANAGER,
    EMPLOYEE_JOB_TITLES.CHEF,
    EMPLOYEE_JOB_TITLES.SERVER,
    EMPLOYEE_JOB_TITLES.CASHIER,
  ]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }, // Changed from Promise based on typical Next.js usage
) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  const { employeeId } = params;

  if (!callingUser || !callingUser.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID." },
      { status: 401 },
    );
  }

  // Authorization: Ensure calling user is owner or manager
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as UserRole)) {
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
        "id, role, users(id, email, name, role)" // Added user role for clarity
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
  { params }: { params: { employeeId: string } }, // Changed from Promise
) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  const { employeeId } = params;

  if (!callingUser || !callingUser.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID." },
      { status: 401 },
    );
  }

  // Authorization: Ensure calling user is owner or manager
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as UserRole)) {
    await logger.warn('employee-id-api-patch-auth', `User ${callingUser.userId} with role ${callingUser.role} tried to update employee ${employeeId} without permission.`,
      callingUser.restaurantId, callingUser.userId);
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
    } catch (error) {
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
      .select("id, role, users(id, email, name, role)")
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
    const responsePayload = {
      id: updatedEmployeeData.id,
      employee_job_title: updatedEmployeeData.role,
      user: {
        id: updatedEmployeeData.users?.id,
        email: updatedEmployeeData.users?.email,
        name: updatedEmployeeData.users?.name,
        role: updatedEmployeeData.users?.role, // This is users.role (e.g., 'employee')
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

export async function DELETE(
  req: Request, // Should be NextRequest for consistency if headers/cookies are needed for getUserFromRequest
  { params }: { params: { employeeId: string } }, // Changed from Promise
) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  const { employeeId } = params;

  if (!callingUser || !callingUser.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID." },
      { status: 401 },
    );
  }

  // Authorization: Ensure calling user is owner or manager
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as UserRole)) {
    await logger.warn('employee-id-api-delete-auth', `User ${callingUser.userId} with role ${callingUser.role} tried to delete employee ${employeeId} without permission.`,
      callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!employeeId) {
    return NextResponse.json(
      { error: "Employee ID is required." },
      { status: 400 },
    );
  }

  try {
    const { error: deleteError, count } = await supabaseAdmin
      .from("employees")
      .delete({ count: "exact" })
      .eq("id", employeeId)
      .eq("restaurant_id", callingUser.restaurantId); // Corrected to callingUser

    if (deleteError) {
      await logger.error('employee-id-api-delete', `Error deleting employee ${employeeId} for restaurant ${callingUser.restaurantId}`, {
        error: deleteError.message, employeeId, restaurantId: callingUser.restaurantId
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json(
        { error: `Failed to delete employee: ${deleteError.message}` },
        { status: 500 },
      );
    }

    if (count === 0) {
      return NextResponse.json(
        {
          error:
            "Employee not found under your restaurant or you are not authorized to delete.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Employee deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected error in delete employee API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: errorMessage },
      { status: 500 },
    );
  }
}
