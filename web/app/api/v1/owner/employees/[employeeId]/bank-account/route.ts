import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { USER_ROLES } from "@/lib/constants";

const bankAccountSchema = z.object({
  bank_name: z.string().min(1).max(200),
  branch_name: z.string().max(200).optional(),
  account_type: z.enum(["checking", "savings", "current"]).default("checking"),
  account_number: z.string().min(1).max(50),
  account_holder: z.string().min(1).max(200),
  notes: z.string().max(500).optional(),
});

/** Verify the employeeId belongs to the caller's restaurant. Returns 404 if not. */
async function assertEmployeeOwnership(
  employeeId: string,
  restaurantId: string
): Promise<NextResponse | null> {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as "owner" | "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { employeeId } = await params;

  const ownershipError = await assertEmployeeOwnership(employeeId, user.restaurantId);
  if (ownershipError) return ownershipError;

  const { data, error } = await supabaseAdmin
    .from("employee_bank_accounts")
    .select("id, bank_name, branch_name, account_type, account_number, account_holder, notes, updated_at")
    .eq("employee_id", employeeId)
    .eq("restaurant_id", user.restaurantId)
    .maybeSingle();

  if (error) {
    await logger.error("bank-account-get", "Failed to fetch bank account", { error: error.message }, user.restaurantId);
    return NextResponse.json({ error: "Failed to fetch bank account" }, { status: 500 });
  }

  return NextResponse.json({ bankAccount: data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(user.role as "owner" | "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { employeeId } = await params;

  const ownershipError = await assertEmployeeOwnership(employeeId, user.restaurantId);
  if (ownershipError) return ownershipError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bankAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("employee_bank_accounts")
    .upsert(
      {
        employee_id: employeeId,
        restaurant_id: user.restaurantId,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" }
    )
    .select("id, bank_name, branch_name, account_type, account_number, account_holder, notes, updated_at")
    .single();

  if (error) {
    await logger.error("bank-account-put", "Failed to save bank account", { error: error.message }, user.restaurantId, user.userId);
    return NextResponse.json({ error: "Failed to save bank account" }, { status: 500 });
  }

  await logger.info("bank-account-put", "Bank account saved", { employeeId }, user.restaurantId, user.userId);
  return NextResponse.json({ bankAccount: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== USER_ROLES.OWNER) {
    return NextResponse.json({ error: "Only the owner can delete bank account records" }, { status: 403 });
  }

  const { employeeId } = await params;

  const ownershipError = await assertEmployeeOwnership(employeeId, user.restaurantId);
  if (ownershipError) return ownershipError;

  const { error } = await supabaseAdmin
    .from("employee_bank_accounts")
    .delete()
    .eq("employee_id", employeeId)
    .eq("restaurant_id", user.restaurantId);

  if (error) {
    await logger.error("bank-account-delete", "Failed to delete bank account", { error: error.message, employeeId }, user.restaurantId, user.userId);
    return NextResponse.json({ error: "Failed to delete bank account" }, { status: 500 });
  }

  await logger.info("bank-account-delete", "Bank account deleted", { employeeId }, user.restaurantId, user.userId);
  return NextResponse.json({ success: true });
}
