import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";
import crypto from "crypto";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function GET() {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("restaurant_checkin_qr")
    .select("id, token, expires_at, created_at")
    .eq("restaurant_id", user.restaurantId)
    .maybeSingle();

  if (error) {
    await logger.error("restaurant-qr-get", "Failed to fetch restaurant QR", { error: error.message }, user.restaurantId);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  // Parse optional expires_at override from body
  let expiresAt: string | null = null;
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (body?.expires_at && typeof body.expires_at === "string") {
      expiresAt = body.expires_at;
    }
  } catch {
    // ignore
  }

  if (!expiresAt) {
    // Default: expires end of next calendar month
    const now = new Date();
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    expiresAt = endOfNextMonth.toISOString();
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logger.info("restaurant-qr-post", "Restaurant QR rotated", { expiresAt }, user.restaurantId, user.userId);
  return NextResponse.json({ qr: data }, { status: 201 });
}
