import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";

const reviewSchema = z.object({
  action: z.enum(["approved", "rejected"]),
  review_note: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as "owner" | "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { requestId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, review_note } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("employee_leave_requests")
    .update({
      status: action,
      reviewed_by: user.userId,
      reviewed_at: new Date().toISOString(),
      review_note: review_note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("restaurant_id", user.restaurantId)
    .select("id, status, reviewed_at")
    .single();

  if (error) {
    await logger.error("leave-request-patch", "Failed to review leave request", { error: error.message, requestId }, user.restaurantId, user.userId);
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }

  await logger.info("leave-request-patch", `Leave request ${action}`, { requestId }, user.restaurantId, user.userId);
  return NextResponse.json({ request: data });
}
