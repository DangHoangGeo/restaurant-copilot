import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, AuthUser } from "@/lib/server/getUserFromRequest";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  role: z.enum(["manager", "chef", "server", "cashier"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();
  const { employeeId } = await params;

  if (!user || !user.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID." },
      { status: 401 },
    );
  }

  if (!employeeId) {
    return NextResponse.json(
      { error: "Employee ID is required." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, role, users(id, email, name), schedules(id, weekday, start_time, end_time)",
      )
      .eq("id", employeeId)
      .eq("restaurant_id", user.restaurantId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Unexpected error fetching employee:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: errorMessage },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();
  const { employeeId } = await params;

  if (!user || !user.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID." },
      { status: 401 },
    );
  }
  if (!employeeId) {
    return NextResponse.json(
      { error: "Employee ID is required." },
      { status: 400 },
    );
  }

  try {
    const body = await req.json();
    const validated = updateEmployeeSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { errors: validated.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (Object.keys(validated.data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update provided." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("employees")
      .update(validated.data)
      .eq("id", employeeId)
      .eq("restaurant_id", user.restaurantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update employee." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Unexpected error updating employee:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: errorMessage },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();
  const { employeeId } = await params;

  if (!user || !user.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID." },
      { status: 401 },
    );
  }

  if (!employeeId) {
    return NextResponse.json(
      { error: "Employee ID is required." },
      { status: 400 },
    );
  }

  try {
    const { error: deleteError, count } = await supabase
      .from("employees")
      .delete({ count: "exact" })
      .eq("id", employeeId)
      .eq("restaurant_id", user.restaurantId);

    if (deleteError) {
      console.error("Error deleting employee:", deleteError);
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
