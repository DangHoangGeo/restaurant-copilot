import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, AuthUser } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const createEmployeeSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["manager", "chef", "server", "cashier"]),
});

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId") || "";
  if (!restaurantId) {
    return NextResponse.json(
      { message: "restaurantId parameter is required" },
      { status: 400 },
    );
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(restaurantId)) {
    return NextResponse.json(
      { message: "Invalid restaurantId format" },
      { status: 400 },
    );
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("employees")
      .select(
        `id, role, users(id, email, name), schedules(id, weekday, start_time, end_time)`,
      )
      .eq("restaurant_id", restaurantId);

    if (error) {
      console.error("Error fetching employees:", error);
      return NextResponse.json(
        { message: "Error fetching employees", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ employees: data }, { status: 200 });
  } catch (error) {
    console.error("API Error in GET employees:", error);
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
  const user: AuthUser | null = await getUserFromRequest();
  if (!user || !user.restaurantId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user or restaurant ID" },
      { status: 401 },
    );
  }
  try {
    const body = await req.json();
    const validated = createEmployeeSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { errors: validated.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { user_id, role } = validated.data;

    const { data: targetUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, restaurant_id")
      .eq("id", user_id)
      .single();

    if (
      userError ||
      !targetUser ||
      targetUser.restaurant_id !== user.restaurantId
    ) {
      return NextResponse.json(
        { error: "User not found or not part of this restaurant" },
        { status: 404 },
      );
    }

    const { data: created, error } = await supabaseAdmin
      .from("employees")
      .insert({ restaurant_id: user.restaurantId, user_id, role })
      .select()
      .single();

    if (error) {
      console.error("Error creating employee:", error);
      return NextResponse.json(
        { message: "Error creating employee", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ employee: created }, { status: 201 });
  } catch (error) {
    console.error("API Error in POST employee:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error!",
      },
      { status: 500 },
    );
  }
}
