import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";

function generateCode(length: number = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusable chars
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function generateUniqueCode(restaurantId: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode(5);
    const { data } = await supabaseAdmin
      .from("employee_checkin_codes")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not generate a unique checkin code. Please try again.");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { employeeId } = await params;

  const { data, error } = await supabaseAdmin
    .from("employee_checkin_codes")
    .select("id, code, is_active, created_at, updated_at")
    .eq("restaurant_id", user.restaurantId)
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    await logger.error("checkin-code-get", "Failed to fetch checkin code", { error: error.message }, user.restaurantId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ credential: data });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as "owner" | "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { employeeId } = await params;

  // Deactivate existing codes for this employee in this branch
  await supabaseAdmin
    .from("employee_checkin_codes")
    .update({ is_active: false })
    .eq("restaurant_id", user.restaurantId)
    .eq("employee_id", employeeId);

  const code = await generateUniqueCode(user.restaurantId);

  const { data, error } = await supabaseAdmin
    .from("employee_checkin_codes")
    .insert({
      restaurant_id: user.restaurantId,
      employee_id: employeeId,
      code,
      is_active: true,
    })
    .select("id, code, is_active, created_at")
    .single();

  if (error) {
    await logger.error("checkin-code-post", "Failed to create checkin code", { error: error.message }, user.restaurantId, user.userId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logger.info("checkin-code-post", "Checkin code generated", { employeeId, code }, user.restaurantId, user.userId);
  return NextResponse.json({ credential: data }, { status: 201 });
}
