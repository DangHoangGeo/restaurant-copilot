import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";

// Employee scans the restaurant's QR code (which encodes the restaurant token),
// then enters their personal 4-6 char code. This endpoint records the check-in or
// check-out event and rebuilds the daily attendance summary.

const codeScanSchema = z.object({
  restaurant_token: z.string().min(1),
  employee_code: z.string().min(4).max(6).toUpperCase(),
  scan_type: z.enum(["check_in", "check_out"]),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = codeScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { restaurant_token, employee_code, scan_type } = parsed.data;

  // 1. Validate restaurant QR token and get restaurant_id
  const { data: qrRecord, error: qrErr } = await supabaseAdmin
    .from("restaurant_checkin_qr")
    .select("id, restaurant_id, expires_at")
    .eq("token", restaurant_token)
    .maybeSingle();

  if (qrErr || !qrRecord) {
    return NextResponse.json({ error: "Invalid or expired restaurant QR code" }, { status: 401 });
  }

  if (qrRecord.expires_at && new Date(qrRecord.expires_at as string) < new Date()) {
    return NextResponse.json({ error: "Restaurant QR code has expired. Please ask your manager to rotate it." }, { status: 401 });
  }

  const restaurantId = qrRecord.restaurant_id as string;

  // 2. Find employee by their checkin code for this branch
  const { data: codeRecord, error: codeErr } = await supabaseAdmin
    .from("employee_checkin_codes")
    .select("id, employee_id")
    .eq("restaurant_id", restaurantId)
    .eq("code", employee_code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  if (codeErr || !codeRecord) {
    return NextResponse.json({ error: "Employee code not recognized. Please check your code and try again." }, { status: 401 });
  }

  const employeeId = codeRecord.employee_id as string;

  // 3. Record the attendance event
  const now = new Date();
  const workDate = getLocalDateString(now, "Asia/Tokyo");

  const { data: event, error: eventErr } = await supabaseAdmin
    .from("attendance_events")
    .insert({
      restaurant_id: restaurantId,
      employee_id: employeeId,
      work_date: workDate,
      event_type: scan_type,
      source: "qr_kiosk",
      scanned_at: now.toISOString(),
    })
    .select("id, event_type, scanned_at")
    .single();

  if (eventErr) {
    await logger.error("code-scan-post", "Failed to record attendance event", { error: eventErr.message, employeeId, restaurantId }, restaurantId);
    return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
  }

  // 4. Rebuild daily summary (upsert)
  await rebuildDailySummary(restaurantId, employeeId, workDate);

  const action = scan_type === "check_in" ? "checked in" : "checked out";
  return NextResponse.json({
    message: `Successfully ${action} at ${formatTime(now)}`,
    event: { id: event.id, type: event.event_type, scanned_at: event.scanned_at },
    work_date: workDate,
  });
}

function getLocalDateString(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

async function rebuildDailySummary(restaurantId: string, employeeId: string, workDate: string) {
  const { data: events } = await supabaseAdmin
    .from("attendance_events")
    .select("event_type, scanned_at")
    .eq("restaurant_id", restaurantId)
    .eq("employee_id", employeeId)
    .eq("work_date", workDate)
    .in("event_type", ["check_in", "check_out"])
    .order("scanned_at");

  if (!events?.length) return;

  const checkIns = events.filter((e: { event_type: string }) => e.event_type === "check_in");
  const checkOuts = events.filter((e: { event_type: string }) => e.event_type === "check_out");

  const firstCheckIn = checkIns[0]?.scanned_at ?? null;
  const lastCheckOut = checkOuts[checkOuts.length - 1]?.scanned_at ?? null;

  let totalHours: number | null = null;
  if (firstCheckIn && lastCheckOut) {
    const diff = (new Date(lastCheckOut).getTime() - new Date(firstCheckIn).getTime()) / 3600000;
    totalHours = Math.round(diff * 100) / 100;
  }

  const hasException =
    !lastCheckOut ||
    (totalHours !== null && totalHours > 14) ||
    checkIns.length !== checkOuts.length;

  const exceptionNotes: string[] = [];
  if (!lastCheckOut) exceptionNotes.push("Missing check-out");
  if (totalHours !== null && totalHours > 14) exceptionNotes.push("Shift > 14 hours");
  if (checkIns.length !== checkOuts.length) exceptionNotes.push("Unmatched check-in/out count");

  await supabaseAdmin
    .from("attendance_daily_summaries")
    .upsert(
      {
        restaurant_id: restaurantId,
        employee_id: employeeId,
        work_date: workDate,
        first_check_in: firstCheckIn,
        last_check_out: lastCheckOut,
        total_hours: totalHours,
        has_exception: hasException,
        exception_notes: exceptionNotes.join("; ") || null,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id,employee_id,work_date" }
    );
}
