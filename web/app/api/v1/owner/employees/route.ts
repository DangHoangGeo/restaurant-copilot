import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, AuthUser } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";

const createEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["manager", "chef", "server", "cashier", "employee"]),
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
        `id, role, users(id, email, name), schedules(id, weekday, start_time, end_time)`
      )
      .eq("restaurant_id", user.restaurantId);

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
    const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const employees = data?.map((emp: {
      id: string;
      role: string;
      users: Array<{ id: string; email: string; name: string }>;
      schedules: Array<{ id: string; weekday: number | null; start_time: string | null; end_time: string | null }>;
    }) => {
      const shifts: Record<string, string | null> = {
        Mon: null,
        Tue: null,
        Wed: null,
        Thu: null,
        Fri: null,
        Sat: null,
        Sun: null,
      };
      
      emp.schedules?.forEach((s) => {
        const day = dayMap[(s.weekday ?? 1) - 1] as keyof typeof shifts;
        if (day) {
          shifts[day] = `${s.start_time?.slice(0, 5)}-${s.end_time?.slice(0, 5)}`;
        }
      });

      return {
        id: emp.id,
        user_id: emp.users[0]?.id ?? "",
        name: emp.users[0]?.name ?? "",
        email: emp.users[0]?.email ?? "",
        role: emp.role,
        shifts,
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
    const { email, name, role } = validated.data;

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { restaurant_id: user.restaurantId, role },
      });

    if (inviteError || !inviteData?.user) {
      return NextResponse.json(
        { error: inviteError?.message || "Failed to invite user" },
        { status: 500 },
      );
    }

    const userId = inviteData.user.id;

    await supabaseAdmin.from("users").insert({
      id: userId,
      restaurant_id: user.restaurantId,
      email,
      name,
      role,
    });

    const { data: created, error } = await supabaseAdmin
      .from("employees")
      .insert({ restaurant_id: user.restaurantId, user_id: userId, role })
      .select()
      .single();

    if (error) {
      await logger.error('employees-api-post', 'Error creating employee', {
        error: error.message,
        restaurantId: user.restaurantId,
        userId,
        role
      }, user.restaurantId, user.userId);
      return NextResponse.json(
        { message: "Error creating employee", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ employee: created }, { status: 201 });
  } catch (error) {
    await logger.error('employees-api-post', 'API Error in POST employee', {
      error: error instanceof Error ? error.message : 'Unknown error',
      restaurantId: user?.restaurantId
    }, user?.restaurantId, user?.userId);
    return NextResponse.json(
      {
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error!",
      },
      { status: 500 },
    );
  }
}
