// GET    /api/v1/owner/purchasing/expenses/[expenseId] — get a single expense
// PUT    /api/v1/owner/purchasing/expenses/[expenseId] — update expense
// DELETE /api/v1/owner/purchasing/expenses/[expenseId] — delete expense

import { NextRequest, NextResponse } from "next/server";
import { UpdateExpenseSchema } from "@/lib/server/purchasing/schemas";
import { resolvePurchasingAccess } from "@/lib/server/purchasing/access";
import {
  getExpense,
  editExpense,
  removeExpense,
} from "@/lib/server/purchasing/service";

type RouteContext = { params: Promise<{ expenseId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { expenseId } = await params;
  const access = await resolvePurchasingAccess();
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const expense = await getExpense(expenseId, access.restaurantId);
    return NextResponse.json({ expense });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : "Failed to fetch expense";
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { expenseId } = await params;
  const access = await resolvePurchasingAccess();
  if (!access || !access.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation error",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const expense = await editExpense(
      expenseId,
      access.restaurantId,
      parsed.data,
    );
    return NextResponse.json({ expense });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : "Failed to update expense";
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { expenseId } = await params;
  const access = await resolvePurchasingAccess();
  if (!access || !access.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await removeExpense(expenseId, access.restaurantId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : "Failed to delete expense";
    return NextResponse.json({ error: msg }, { status });
  }
}
