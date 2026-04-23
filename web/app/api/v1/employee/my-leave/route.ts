import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const leaveSchema = z.object({
  leave_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !isNaN(Date.parse(s)), {
    message: "leave_date must be a valid date",
  }),
  leave_type: z.enum(["day_off", "sick", "vacation", "personal"]).default("day_off"),
  reason: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId || !user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("user_id", user.userId)
    .eq("restaurant_id", user.restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!employee) {
    return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabaseAdmin
    .from("employee_leave_requests")
    .select("id, leave_date, leave_type, reason, status, review_note, reviewed_at, created_at")
    .eq("employee_id", employee.id)
    .eq("restaurant_id", user.restaurantId)
    .order("leave_date", { ascending: false });

  if (from) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || isNaN(Date.parse(from))) {
      return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
    }
    query = query.gte("leave_date", from);
  }
  if (to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to) || isNaN(Date.parse(to))) {
      return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    }
    query = query.lte("leave_date", to);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId || !user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("user_id", user.userId)
    .eq("restaurant_id", user.restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!employee) {
    return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Check for duplicate request on same date
  const { data: existing } = await supabaseAdmin
    .from("employee_leave_requests")
    .select("id")
    .eq("employee_id", employee.id)
    .eq("leave_date", parsed.data.leave_date)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "A leave request for this date already exists" }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("employee_leave_requests")
    .insert({
      restaurant_id: user.restaurantId,
      employee_id: employee.id,
      leave_date: parsed.data.leave_date,
      leave_type: parsed.data.leave_type,
      reason: parsed.data.reason ?? null,
      status: "pending",
    })
    .select("id, leave_date, leave_type, reason, status, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A leave request for this date already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 });
  }

  return NextResponse.json({ request: data }, { status: 201 });
}
