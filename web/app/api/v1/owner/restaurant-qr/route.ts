import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";
import crypto from "crypto";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Returns the ISO string for 23:59:59 on the last day of the next calendar month.
 * Safe for all months including December (wraps to January of next year).
 */
function endOfNextCalendarMonth(now: Date): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based current month

  // Last day of next month: day 0 of the month after next = last day of next month
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(nextYear, nextMonth, 0); // day 0 trick: wraps to last day of nextMonth
  lastDay.setHours(23, 59, 59, 0);
  return lastDay.toISOString();
}

export async function GET() {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Any authenticated manager/owner can view the current QR
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as "owner" | "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("restaurant_checkin_qr")
    .select("id, token, expires_at, created_at")
    .eq("restaurant_id", user.restaurantId)
    .maybeSingle();

  if (error) {
    await logger.error("restaurant-qr-get", "Failed to fetch restaurant QR", { error: error.message }, user.restaurantId);
    return NextResponse.json({ error: "Failed to fetch QR code" }, { status: 500 });
  }

  return NextResponse.json({ qr: data });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as "owner" | "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse optional explicit expires_at override (must be a future ISO date string)
  let expiresAt: string = endOfNextCalendarMonth(new Date());
  try {
    const bodyText = await req.text();
    if (bodyText) {
      const parsed = JSON.parse(bodyText) as Record<string, unknown>;
      if (typeof parsed?.expires_at === "string") {
        const candidate = new Date(parsed.expires_at);
        if (isNaN(candidate.getTime())) {
          return NextResponse.json({ error: "Invalid expires_at date" }, { status: 400 });
        }
        if (candidate <= new Date()) {
          return NextResponse.json({ error: "expires_at must be in the future" }, { status: 400 });
        }
        expiresAt = candidate.toISOString();
      }
    }
  } catch {
    // Empty body or non-JSON body is fine — use default expiry
  }

  const token = generateToken();

  const { data, error } = await supabaseAdmin
    .from("restaurant_checkin_qr")
    .upsert(
      {
        restaurant_id: user.restaurantId,
        token,
        expires_at: expiresAt,
        rotated_by: user.userId,
        created_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id" }
    )
    .select("id, token, expires_at, created_at")
    .single();

  if (error) {
    await logger.error("restaurant-qr-post", "Failed to rotate QR", { error: error.message }, user.restaurantId, user.userId);
    return NextResponse.json({ error: "Failed to rotate QR code" }, { status: 500 });
  }

  await logger.info(
    "restaurant-qr-post",
    "Restaurant QR rotated",
    { expiresAt, rotatedBy: user.userId },
    user.restaurantId,
    user.userId
  );
  return NextResponse.json({ qr: data }, { status: 201 });
}
