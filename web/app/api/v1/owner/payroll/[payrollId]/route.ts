import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";

const updatePayrollSchema = z.object({
  bonus: z.number().min(0).optional(),
  bonus_reason: z.string().max(500).optional(),
  deductions: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
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
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as "owner" | "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { payrollId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updatePayrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Fetch current record — verify it belongs to this restaurant
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from("payroll_records")
    .select("base_pay, bonus, deductions, status, employee_id, employees(user_id)")
    .eq("id", payrollId)
    .eq("restaurant_id", user.restaurantId)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
  }

  // Privilege escalation guard: a user cannot approve or modify their own payroll record
  const emp = current.employees as { user_id: string } | null;
  if (emp?.user_id === user.userId) {
    return NextResponse.json(
      { error: "You cannot modify your own payroll record" },
      { status: 403 }
    );
  }

  // Status transitions: only owner can approve or mark as paid
  if (
    parsed.data.status &&
    parsed.data.status !== "draft" &&
    user.role !== USER_ROLES.OWNER
  ) {
    return NextResponse.json(
      { error: "Only the owner can approve or mark payroll as paid" },
      { status: 403 }
    );
  }

  // Cannot go backwards: paid → approved, approved → draft
  const currentStatus = current.status as string;
  const newStatus = parsed.data.status;
  if (currentStatus === "paid") {
    return NextResponse.json({ error: "Paid payroll records cannot be modified" }, { status: 409 });
  }
  if (currentStatus === "approved" && newStatus === "draft") {
    return NextResponse.json({ error: "Approved payroll cannot be reverted to draft" }, { status: 409 });
  }

  const newBonus = parsed.data.bonus ?? (current.bonus as number);
  const newDeductions = parsed.data.deductions ?? (current.deductions as number);
  const basePay = current.base_pay as number;
  const totalPay = Math.max(0, basePay + newBonus - newDeductions);

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
    return NextResponse.json({ error: "Failed to update payroll record" }, { status: 500 });
  }

  await logger.info("payroll-patch", "Payroll record updated", { payrollId, status: parsed.data.status }, user.restaurantId, user.userId);
  return NextResponse.json({ record: data });
}
