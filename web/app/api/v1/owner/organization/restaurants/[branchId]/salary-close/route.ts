import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAuthorizationService,
  requireOrgContext,
} from "@/lib/server/authorization/service";
import { getBranchTeamPayrollData } from "@/lib/server/control/branch-team";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { listOrganizationEmployees } from "@/lib/server/organizations/queries";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const closeSchema = z.object({
  month_key: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> },
) {
  const { branchId } = await params;
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can("employees") || !authz.can("finance_exports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!authz.canAccessRestaurant(branchId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = closeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: existingClose } = await supabaseAdmin
    .from("branch_salary_month_closes")
    .select("id")
    .eq("restaurant_id", branchId)
    .eq("month_key", parsed.data.month_key)
    .maybeSingle();

  if (existingClose) {
    return NextResponse.json(
      { error: "Salary already closed for this month" },
      { status: 409 },
    );
  }

  const employees = (await listOrganizationEmployees([branchId])).filter(
    (employee) => employee.restaurant_id === branchId,
  );
  const payroll = await getBranchTeamPayrollData({
    branchId,
    employees,
    timezone: ctx!.organization.timezone,
    currency: ctx!.organization.currency,
    monthKey: parsed.data.month_key,
  });

  if (
    payroll.totals.missingRateRoles.length > 0 ||
    payroll.totals.estimatedPayroll == null
  ) {
    return NextResponse.json(
      { error: "Salary rates are missing for this month" },
      { status: 422 },
    );
  }

  const { data: expense, error: expenseError } = await supabaseAdmin
    .from("expenses")
    .insert({
      restaurant_id: branchId,
      category: "payroll",
      description: `Salary ${parsed.data.month_key}`,
      amount: payroll.totals.estimatedPayroll,
      currency: ctx!.organization.currency ?? "JPY",
      expense_date: `${parsed.data.month_key}-01`,
      notes: `salary_close:${parsed.data.month_key}`,
      created_by: ctx!.member.user_id,
    })
    .select("id")
    .single();

  if (expenseError || !expense) {
    return NextResponse.json(
      { error: "Failed to create salary expense" },
      { status: 500 },
    );
  }

  const { error: closeError } = await supabaseAdmin
    .from("branch_salary_month_closes")
    .insert({
      restaurant_id: branchId,
      month_key: parsed.data.month_key,
      approved_hours: payroll.totals.approvedHours,
      salary_total: payroll.totals.estimatedPayroll,
      currency: ctx!.organization.currency ?? "JPY",
      expense_id: expense.id,
      closed_by: ctx!.member.user_id,
    });

  if (closeError) {
    await supabaseAdmin.from("expenses").delete().eq("id", expense.id);
    return NextResponse.json(
      { error: "Failed to close salary month" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    approved_hours: payroll.totals.approvedHours,
    salary_total: payroll.totals.estimatedPayroll,
    expense_id: expense.id,
  });
}
