import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";

const updatePayrollSchema = z.object({
  bonus: z.number().min(0).optional(),
  bonus_reason: z.string().optional(),
  deductions: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "approved", "paid"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== USER_ROLES.OWNER && user.role !== USER_ROLES.MANAGER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { payrollId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updatePayrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Fetch current record to recalculate total
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from("payroll_records")
    .select("base_pay, bonus, deductions, status")
    .eq("id", payrollId)
    .eq("restaurant_id", user.restaurantId)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
  }

  // Only owner can approve/mark as paid
  if (parsed.data.status && parsed.data.status !== "draft" && user.role !== USER_ROLES.OWNER) {
    return NextResponse.json({ error: "Only owner can approve or mark as paid" }, { status: 403 });
  }

  const newBonus = parsed.data.bonus ?? (current.bonus as number);
  const newDeductions = parsed.data.deductions ?? (current.deductions as number);
  const basePay = current.base_pay as number;
  const totalPay = basePay + newBonus - newDeductions;

  const updates: Record<string, unknown> = {
    bonus: newBonus,
    deductions: newDeductions,
    total_pay: totalPay,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.bonus_reason !== undefined) updates.bonus_reason = parsed.data.bonus_reason;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.status) {
    updates.status = parsed.data.status;
    if (parsed.data.status === "approved") {
      updates.approved_by = user.userId;
      updates.approved_at = new Date().toISOString();
    }
    if (parsed.data.status === "paid") {
      updates.paid_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabaseAdmin
    .from("payroll_records")
    .update(updates)
    .eq("id", payrollId)
    .eq("restaurant_id", user.restaurantId)
    .select("id, status, bonus, deductions, total_pay, approved_at, paid_at")
    .single();

  if (error) {
    await logger.error("payroll-patch", "Failed to update payroll record", { error: error.message, payrollId }, user.restaurantId, user.userId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logger.info("payroll-patch", "Payroll record updated", { payrollId, status: parsed.data.status }, user.restaurantId, user.userId);
  return NextResponse.json({ record: data });
}
