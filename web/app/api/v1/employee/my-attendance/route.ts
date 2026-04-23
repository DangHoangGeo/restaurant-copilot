import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  return DATE_REGEX.test(s) && !isNaN(Date.parse(s));
}

/** Returns the last day of a given year+month as YYYY-MM-DD. Safe for all months. */
function lastDayOfMonth(year: number, month: number): string {
  // Day 0 of the next month = last day of current month
  const d = new Date(year, month, 0); // month is already 1-based, day 0 wraps correctly
  return d.toISOString().slice(0, 10);
}

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

  // Validate explicit date params
  if (from && !isValidDate(from)) {
    return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  }
  if (to && !isValidDate(to)) {
    return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
  }

  // Default: current calendar month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  const defaultFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const defaultTo = lastDayOfMonth(year, month);

  const { data, error } = await supabaseAdmin
    .from("attendance_daily_summaries")
    .select("id, work_date, first_check_in, last_check_out, total_hours, status, has_exception, exception_notes")
    .eq("employee_id", employee.id)
    .eq("restaurant_id", user.restaurantId)
    .gte("work_date", from ?? defaultFrom)
    .lte("work_date", to ?? defaultTo)
    .order("work_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 });
  }

  const totalApproved = (data ?? [])
    .filter(
      (r: { status: string; total_hours: number | null }) =>
        r.status === "approved" && r.total_hours != null
    )
    .reduce((sum: number, r: { total_hours: number }) => sum + r.total_hours, 0);

  return NextResponse.json({
    summaries: data ?? [],
    total_approved_hours: Math.round(totalApproved * 100) / 100,
  });
}
