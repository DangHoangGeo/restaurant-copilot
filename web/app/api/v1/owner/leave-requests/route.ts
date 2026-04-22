import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const employeeId = searchParams.get("employee_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabaseAdmin
    .from("employee_leave_requests")
    .select(
      `id, employee_id, leave_date, leave_type, reason, status,
       reviewed_by, reviewed_at, review_note, created_at,
       employees(user_id, users(name, email))`
    )
    .eq("restaurant_id", user.restaurantId)
    .order("leave_date", { ascending: false });

  if (status) query = query.eq("status", status);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (from) query = query.gte("leave_date", from);
  if (to) query = query.lte("leave_date", to);

  const { data, error } = await query;

  if (error) {
    await logger.error("leave-requests-get", "Failed to fetch leave requests", { error: error.message }, user.restaurantId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = (data ?? []).map((r: Record<string, unknown>) => {
    const emp = r.employees as Record<string, unknown> | null;
    const usr = emp?.users as Record<string, unknown> | null;
    return {
      id: r.id,
      employee_id: r.employee_id,
      employee_name: usr?.name ?? null,
      employee_email: usr?.email ?? null,
      leave_date: r.leave_date,
      leave_type: r.leave_type,
      reason: r.reason,
      status: r.status,
      reviewed_by: r.reviewed_by,
      reviewed_at: r.reviewed_at,
      review_note: r.review_note,
      created_at: r.created_at,
    };
  });

  return NextResponse.json({ requests });
}
