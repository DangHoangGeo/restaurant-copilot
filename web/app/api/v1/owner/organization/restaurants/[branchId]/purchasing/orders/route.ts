import { NextRequest, NextResponse } from "next/server";
import {
  CreatePurchaseOrderSchema,
  ListPurchaseOrdersSchema,
} from "@/lib/server/purchasing/schemas";
import { resolveScopedBranchPurchasingAccess } from "@/lib/server/purchasing/access";
import {
  addPurchaseOrder,
  getPurchaseOrders,
} from "@/lib/server/purchasing/service";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getCreatorName(userId: string | null): Promise<string | null> {
  if (!userId) return null;

  const { data } = await supabaseAdmin
    .from("users")
    .select("name, email")
    .eq("id", userId)
    .maybeSingle();

  return (
    (data?.name as string | null) ?? (data?.email as string | null) ?? null
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> },
) {
  const { branchId } = await params;
  const access = await resolveScopedBranchPurchasingAccess(branchId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = ListPurchaseOrdersSchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    supplier_id: searchParams.get("supplier_id") ?? undefined,
    from_date: searchParams.get("from_date") ?? undefined,
    to_date: searchParams.get("to_date") ?? undefined,
    is_paid: searchParams.get("is_paid") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const orders = await getPurchaseOrders(access.restaurantId, parsed.data);
    return NextResponse.json({ orders });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch purchase orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> },
) {
  const { branchId } = await params;
  const access = await resolveScopedBranchPurchasingAccess(branchId);
  if (!access?.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreatePurchaseOrderSchema.safeParse(body);
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
    const order = await addPurchaseOrder(
      access.restaurantId,
      parsed.data,
      access.userId,
    );
    const created_by_name = await getCreatorName(order.created_by);
    return NextResponse.json(
      { order: { ...order, created_by_name } },
      { status: 201 },
    );
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message =
      err instanceof Error ? err.message : "Failed to create purchase order";
    return NextResponse.json({ error: message }, { status });
  }
}
