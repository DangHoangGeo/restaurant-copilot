// GET    /api/v1/owner/purchasing/orders/[orderId] — get order with items
// PUT    /api/v1/owner/purchasing/orders/[orderId] — update order fields
// DELETE /api/v1/owner/purchasing/orders/[orderId] — delete order

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { UpdatePurchaseOrderSchema } from '@/lib/server/purchasing/schemas';
import { getPurchaseOrder, editPurchaseOrder, removePurchaseOrder } from '@/lib/server/purchasing/service';

const ALLOWED_ROLES = [USER_ROLES.OWNER, USER_ROLES.MANAGER] as const;

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const order = await getPurchaseOrder(orderId, user.restaurantId);
    return NextResponse.json({ order });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to fetch order';
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdatePurchaseOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const order = await editPurchaseOrder(orderId, user.restaurantId, parsed.data);
    return NextResponse.json({ order });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to update order';
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await removePurchaseOrder(orderId, user.restaurantId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to delete order';
    return NextResponse.json({ error: msg }, { status });
  }
}
