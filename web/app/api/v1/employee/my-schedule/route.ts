import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId || !user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve employee record for this user
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
  const week = searchParams.get("week"); // YYYY-Www format
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabaseAdmin
    .from("employee_schedules")
    .select("id, work_date, start_time, end_time")
    .eq("employee_id", employee.id)
    .order("work_date");

  if (from) query = query.gte("work_date", from);
  if (to) query = query.lte("work_date", to);
  if (week) {
    // Parse week e.g. 2026-W17 → Mon + Sun dates
    const [yearStr, weekStr] = week.split("-W");
    const year = parseInt(yearStr, 10);
    const weekNum = parseInt(weekStr, 10);
    const monday = getDateOfISOWeek(weekNum, year);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    query = query
      .gte("work_date", monday.toISOString().slice(0, 10))
      .lte("work_date", sunday.toISOString().slice(0, 10));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedules: data ?? [] });
}

function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - (dayOfWeek <= 4 ? dayOfWeek - 1 : dayOfWeek + 6));
  return monday;
}
