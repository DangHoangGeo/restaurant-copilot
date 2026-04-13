// GET  /api/v1/owner/purchasing/suppliers — list active suppliers for the branch
// POST /api/v1/owner/purchasing/suppliers — create a new supplier

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { CreateSupplierSchema } from '@/lib/server/purchasing/schemas';
import { resolvePurchasingAccess } from '@/lib/server/purchasing/access';
import { getSuppliers, addSupplier } from '@/lib/server/purchasing/service';

const ALLOWED_ROLES = [USER_ROLES.OWNER, USER_ROLES.MANAGER] as const;

export async function GET(req: NextRequest) {
  const access = await resolvePurchasingAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get('include_inactive') === 'true';

  try {
    const suppliers = await getSuppliers(access.restaurantId, includeInactive);
    return NextResponse.json({ suppliers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch suppliers';
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
  const parsed = CreateSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const supplier = await addSupplier(user.restaurantId, parsed.data, user.userId);
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create supplier';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
