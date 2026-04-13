// GET  /api/v1/owner/purchasing/orders — list purchase orders for the branch
// POST /api/v1/owner/purchasing/orders — create a new purchase order
//
// Query params for GET (all optional):
//   status, category, supplier_id, from_date, to_date, is_paid, limit, offset

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { CreatePurchaseOrderSchema, ListPurchaseOrdersSchema } from '@/lib/server/purchasing/schemas';
import { getPurchaseOrders, addPurchaseOrder } from '@/lib/server/purchasing/service';

const ALLOWED_ROLES = [USER_ROLES.OWNER, USER_ROLES.MANAGER] as const;

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawQuery = {
    status:      searchParams.get('status')      ?? undefined,
    category:    searchParams.get('category')    ?? undefined,
    supplier_id: searchParams.get('supplier_id') ?? undefined,
    from_date:   searchParams.get('from_date')   ?? undefined,
    to_date:     searchParams.get('to_date')     ?? undefined,
    is_paid:     searchParams.get('is_paid')     ?? undefined,
    limit:       searchParams.get('limit')       ?? undefined,
    offset:      searchParams.get('offset')      ?? undefined,
  };

  const parsed = ListPurchaseOrdersSchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const orders = await getPurchaseOrders(user.restaurantId, parsed.data);
    return NextResponse.json({ orders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch orders';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreatePurchaseOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const order = await addPurchaseOrder(user.restaurantId, parsed.data, user.userId);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to create purchase order';
    return NextResponse.json({ error: msg }, { status });
  }
}
