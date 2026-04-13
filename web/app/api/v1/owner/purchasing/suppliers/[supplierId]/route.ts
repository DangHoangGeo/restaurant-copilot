// GET    /api/v1/owner/purchasing/suppliers/[supplierId] — get a single supplier
// PUT    /api/v1/owner/purchasing/suppliers/[supplierId] — update supplier
// DELETE /api/v1/owner/purchasing/suppliers/[supplierId] — archive supplier (soft-delete)

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { UpdateSupplierSchema } from '@/lib/server/purchasing/schemas';
import { resolvePurchasingAccess } from '@/lib/server/purchasing/access';
import { getSupplier, editSupplier, archiveSupplier } from '@/lib/server/purchasing/service';

const ALLOWED_ROLES = [USER_ROLES.OWNER, USER_ROLES.MANAGER] as const;

type RouteContext = { params: Promise<{ supplierId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { supplierId } = await params;
  const access = await resolvePurchasingAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supplier = await getSupplier(supplierId, access.restaurantId);
    return NextResponse.json({ supplier });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to fetch supplier';
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { supplierId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const supplier = await editSupplier(supplierId, user.restaurantId, parsed.data);
    return NextResponse.json({ supplier });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to update supplier';
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { supplierId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await archiveSupplier(supplierId, user.restaurantId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to archive supplier';
    return NextResponse.json({ error: msg }, { status });
  }
}
