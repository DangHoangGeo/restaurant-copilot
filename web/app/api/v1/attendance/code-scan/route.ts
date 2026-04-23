import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/server/rateLimit";

// Employees scan the restaurant's QR code (which encodes the restaurant token),
// then enter their personal 4-6 char code. This endpoint is intentionally
// unauthenticated — the QR token + employee code form the joint credential.
//
// Security model:
// - restaurant_token: rotated monthly by manager, embeds in QR URL
// - employee_code: 5-char code per employee, issued by manager
// - Rate limited per IP: 10 attempts / minute to prevent brute force
// - Invalid token always returns 401 (no distinction between bad token vs bad code
//   to avoid oracle attacks)

const RATE_LIMIT_CONFIG = { max: 10, window: "60s" } as const;

const codeScanSchema = z.object({
  restaurant_token: z.string().min(10).max(128),
  employee_code: z.string().min(4).max(6),
  scan_type: z.enum(["check_in", "check_out"]),
});

const JAPAN_TZ = "Asia/Tokyo";
const MAX_NORMAL_SHIFT_HOURS = 14;

export async function POST(req: NextRequest) {
  // Rate-limit before any DB work
  const rateLimitResponse = await rateLimit(req, RATE_LIMIT_CONFIG, "attendance-code-scan");
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = codeScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { restaurant_token, employee_code, scan_type } = parsed.data;
  // Normalise code to uppercase regardless of what client sent
  const normalisedCode = employee_code.toUpperCase();

  // 1. Validate restaurant QR token and get restaurant_id
  const { data: qrRecord, error: qrErr } = await supabaseAdmin
    .from("restaurant_checkin_qr")
    .select("id, restaurant_id, expires_at")
    .eq("token", restaurant_token)
    .maybeSingle();

  // Always return the same error shape on auth failure — no oracle about which part failed
  if (qrErr || !qrRecord) {
    return NextResponse.json(
      { error: "Invalid or expired QR code. Please scan the current restaurant QR." },
      { status: 401 }
    );
  }

  if (qrRecord.expires_at && new Date(qrRecord.expires_at as string) < new Date()) {
    return NextResponse.json(
      { error: "QR code has expired. Ask your manager to renew it." },
      { status: 401 }
    );
  }

  const restaurantId = qrRecord.restaurant_id as string;

  // 2. Find employee by their checkin code for this branch.
  //    Query scoped to restaurantId so codes are always per-branch.
  const { data: codeRecord, error: codeErr } = await supabaseAdmin
    .from("employee_checkin_codes")
    .select("id, employee_id")
    .eq("restaurant_id", restaurantId)
    .eq("code", normalisedCode)
    .eq("is_active", true)
    .maybeSingle();

  if (codeErr || !codeRecord) {
    // Return a generic message — same wording as bad token to avoid enumeration
    return NextResponse.json(
      { error: "Invalid or expired QR code. Please scan the current restaurant QR." },
      { status: 401 }
    );
  }

  const employeeId = codeRecord.employee_id as string;

  // 3. Record the attendance event (immutable)
  const now = new Date();
  const workDate = getLocalDateString(now, JAPAN_TZ);

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
    await logger.error(
      "code-scan-post",
      "Failed to record attendance event",
      { error: eventErr.message, employeeId, restaurantId },
      restaurantId
    );
    return NextResponse.json({ error: "Failed to record attendance. Please try again." }, { status: 500 });
  }

  // 4. Rebuild daily summary asynchronously (best-effort; failure here is non-fatal)
  rebuildDailySummary(restaurantId, employeeId, workDate).catch((err) => {
    logger.error("code-scan-summary-rebuild", "Failed to rebuild daily summary", { error: String(err) }, restaurantId);
  });

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
    timeZone: JAPAN_TZ,
  });
}

async function rebuildDailySummary(
  restaurantId: string,
  employeeId: string,
  workDate: string
): Promise<void> {
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

  const firstCheckIn: string | null = checkIns[0]?.scanned_at ?? null;
  const lastCheckOut: string | null = checkOuts[checkOuts.length - 1]?.scanned_at ?? null;

  let totalHours: number | null = null;
  if (firstCheckIn && lastCheckOut) {
    const diff =
      (new Date(lastCheckOut).getTime() - new Date(firstCheckIn).getTime()) / 3_600_000;
    totalHours = Math.round(diff * 100) / 100;
  }

  const exceptionNotes: string[] = [];
  if (!lastCheckOut) exceptionNotes.push("Missing check-out");
  if (totalHours !== null && totalHours > MAX_NORMAL_SHIFT_HOURS) {
    exceptionNotes.push(`Shift > ${MAX_NORMAL_SHIFT_HOURS} hours`);
  }
  if (checkIns.length !== checkOuts.length) {
    exceptionNotes.push("Unmatched check-in/out count");
  }
  const hasException = exceptionNotes.length > 0;

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
        exception_notes: hasException ? exceptionNotes.join("; ") : null,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id,employee_id,work_date" }
    );
}
