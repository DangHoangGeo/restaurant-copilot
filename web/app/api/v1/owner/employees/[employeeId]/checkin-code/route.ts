import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusable I/O/0/1

function generateCode(length = 5): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
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

/** Verify the employeeId belongs to the caller's restaurant. */
async function assertEmployeeOwnership(
  employeeId: string,
  restaurantId: string
): Promise<NextResponse | null> {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }
  return null;
}

export async function GET(
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

  const ownershipError = await assertEmployeeOwnership(employeeId, user.restaurantId);
  if (ownershipError) return ownershipError;

  const { data, error } = await supabaseAdmin
    .from("employee_checkin_codes")
    .select("id, code, is_active, created_at, updated_at")
    .eq("restaurant_id", user.restaurantId)
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    await logger.error("checkin-code-get", "Failed to fetch checkin code", { error: error.message }, user.restaurantId);
    return NextResponse.json({ error: "Failed to fetch checkin code" }, { status: 500 });
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

  // IDOR: verify employee belongs to this restaurant before issuing a code
  const ownershipError = await assertEmployeeOwnership(employeeId, user.restaurantId);
  if (ownershipError) return ownershipError;

  // Deactivate existing codes for this employee
  await supabaseAdmin
    .from("employee_checkin_codes")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("restaurant_id", user.restaurantId)
    .eq("employee_id", employeeId);

  let code: string;
  try {
    code = await generateUniqueCode(user.restaurantId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Code generation failed";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

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
    return NextResponse.json({ error: "Failed to generate checkin code" }, { status: 500 });
  }

  await logger.info("checkin-code-post", "Checkin code generated", { employeeId }, user.restaurantId, user.userId);
  return NextResponse.json({ credential: data }, { status: 201 });
}
