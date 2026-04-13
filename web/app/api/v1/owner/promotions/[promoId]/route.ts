// GET    /api/v1/owner/promotions/[promoId]  — get a single promotion
// PATCH  /api/v1/owner/promotions/[promoId]  — update or disable
// DELETE /api/v1/owner/promotions/[promoId]  — delete (only if usage_count = 0)

import { NextRequest, NextResponse } from 'next/server';
import { resolvePromotionsAccess } from '@/lib/server/promotions/access';
import { UpdatePromotionSchema } from '@/lib/server/promotions/schemas';
import {
  getPromotion,
  modifyPromotion,
  deletePromotion,
} from '@/lib/server/promotions/service';

type Params = { params: Promise<{ promoId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { promoId } = await params;

  const access = await resolvePromotionsAccess();
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const promotion = await getPromotion(access.restaurantId, promoId);
    if (!promotion) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ promotion });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch promotion';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { promoId } = await params;

  const access = await resolvePromotionsAccess();
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!access.canWrite) return NextResponse.json({ error: 'Forbidden: read-only access' }, { status: 403 });

  const body = await req.json();
  const parsed = UpdatePromotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const promotion = await modifyPromotion(access.restaurantId, promoId, parsed.data);
    return NextResponse.json({ promotion });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update promotion';
    const status = (err as { status?: number }).status ?? 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { promoId } = await params;

  const access = await resolvePromotionsAccess();
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!access.canWrite) return NextResponse.json({ error: 'Forbidden: read-only access' }, { status: 403 });

  try {
    await deletePromotion(access.restaurantId, promoId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete promotion';
    const status = (err as { status?: number }).status ?? 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
