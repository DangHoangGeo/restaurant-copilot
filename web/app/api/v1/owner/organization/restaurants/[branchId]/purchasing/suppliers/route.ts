import { NextRequest, NextResponse } from "next/server";
import { CreateSupplierSchema } from "@/lib/server/purchasing/schemas";
import { resolveScopedBranchPurchasingAccess } from "@/lib/server/purchasing/access";
import { addSupplier, getSuppliers } from "@/lib/server/purchasing/service";

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
  const includeInactive = searchParams.get("include_inactive") === "true";

  try {
    const suppliers = await getSuppliers(access.restaurantId, includeInactive);
    return NextResponse.json({ suppliers });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch suppliers";
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
  const parsed = CreateSupplierSchema.safeParse(body);
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
    const supplier = await addSupplier(
      access.restaurantId,
      parsed.data,
      access.userId,
    );
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create supplier";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
