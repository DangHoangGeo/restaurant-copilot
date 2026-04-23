import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";

const VALID_STATUSES = ["draft", "approved", "paid"] as const;

const createPayrollSchema = z.object({
  employee_id: z.string().uuid(),
  pay_period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pay_period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_hours: z.number().min(0).max(744), // max hours in a month
  hourly_rate: z.number().min(0).max(100000).optional(),
  base_pay: z.number().min(0).optional(),
  bonus: z.number().min(0).default(0),
  bonus_reason: z.string().max(500).optional(),
  deductions: z.number().min(0).default(0),
  currency: z.string().length(3).default("JPY"),
  notes: z.string().max(1000).optional(),
});

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Payroll contains sensitive salary data — only owner and manager may access
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as "owner" | "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  const rawStatus = searchParams.get("status");
  const periodStart = searchParams.get("period_start");

  // Validate query params
  if (rawStatus && !VALID_STATUSES.includes(rawStatus as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }
  if (periodStart && !isValidDate(periodStart)) {
    return NextResponse.json({ error: "Invalid period_start date" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("payroll_records")
    .select(
      `id, employee_id, pay_period_start, pay_period_end, total_hours, hourly_rate,
       base_pay, bonus, deductions, total_pay, currency, status, notes, bonus_reason,
       approved_by, approved_at, paid_at, created_at, updated_at,
       employees(user_id, users(name, email))`
    )
    .eq("restaurant_id", user.restaurantId)
    .order("pay_period_start", { ascending: false });

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (rawStatus) query = query.eq("status", rawStatus);
  if (periodStart) query = query.eq("pay_period_start", periodStart);

  const { data, error } = await query;

  if (error) {
    await logger.error("payroll-get", "Failed to fetch payroll records", { error: error.message }, user.restaurantId);
    return NextResponse.json({ error: "Failed to fetch payroll records" }, { status: 500 });
  }

  const records = (data ?? []).map((r: Record<string, unknown>) => {
    const emp = r.employees as Record<string, unknown> | null;
    const usr = emp?.users as Record<string, unknown> | null;
    return {
      ...r,
      employee_name: usr?.name ?? null,
      employee_email: usr?.email ?? null,
      employees: undefined,
    };
  });

  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as "owner" | "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createPayrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  // Verify the target employee belongs to this restaurant
  const { data: emp } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("id", d.employee_id)
    .eq("restaurant_id", user.restaurantId)
    .maybeSingle();

  if (!emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const basePay = d.base_pay ?? (d.hourly_rate ? d.total_hours * d.hourly_rate : 0);
  const totalPay = Math.max(0, basePay + d.bonus - d.deductions);

  const { data, error } = await supabaseAdmin
    .from("payroll_records")
    .insert({
      restaurant_id: user.restaurantId,
      employee_id: d.employee_id,
      pay_period_start: d.pay_period_start,
      pay_period_end: d.pay_period_end,
      total_hours: d.total_hours,
      hourly_rate: d.hourly_rate ?? null,
      base_pay: basePay,
      bonus: d.bonus,
      bonus_reason: d.bonus_reason ?? null,
      deductions: d.deductions,
      total_pay: totalPay,
      currency: d.currency,
      notes: d.notes ?? null,
      status: "draft",
    })
    .select("id, status, pay_period_start, pay_period_end, total_pay")
    .single();

  if (error) {
    await logger.error("payroll-post", "Failed to create payroll record", { error: error.message }, user.restaurantId, user.userId);
    // Surface duplicate period conflict explicitly
    if (error.code === "23505") {
      return NextResponse.json({ error: "A payroll record already exists for this employee and period" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create payroll record" }, { status: 500 });
  }

  await logger.info("payroll-post", "Payroll record created", { employeeId: d.employee_id, period: d.pay_period_start }, user.restaurantId, user.userId);
  return NextResponse.json({ record: data }, { status: 201 });
}
