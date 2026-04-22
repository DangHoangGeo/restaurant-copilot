import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

  // Default: current month
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("attendance_daily_summaries")
    .select("id, work_date, first_check_in, last_check_out, total_hours, status, has_exception, exception_notes")
    .eq("employee_id", employee.id)
    .eq("restaurant_id", user.restaurantId)
    .gte("work_date", from ?? defaultFrom)
    .lte("work_date", to ?? defaultTo)
    .order("work_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalApproved = (data ?? [])
    .filter((r: { status: string; total_hours: number | null }) => r.status === "approved" && r.total_hours != null)
    .reduce((sum: number, r: { total_hours: number }) => sum + r.total_hours, 0);

  return NextResponse.json({
    summaries: data ?? [],
    total_approved_hours: Math.round(totalApproved * 100) / 100,
  });
}
