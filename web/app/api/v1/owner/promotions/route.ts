// GET  /api/v1/owner/promotions  — list promotions for the active branch
// POST /api/v1/owner/promotions  — create a new promotion

import { NextRequest, NextResponse } from 'next/server';
import { resolvePromotionsAccess } from '@/lib/server/promotions/access';
import { CreatePromotionSchema } from '@/lib/server/promotions/schemas';
import { getPromotionList, createPromotion } from '@/lib/server/promotions/service';

export async function GET(req: NextRequest) {
  const access = await resolvePromotionsAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get('include_inactive') === 'true';

  try {
    const promotions = await getPromotionList(access.restaurantId, includeInactive);
    return NextResponse.json({ promotions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch promotions';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await resolvePromotionsAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!access.canWrite) {
    return NextResponse.json({ error: 'Forbidden: read-only access' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreatePromotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const promotion = await createPromotion(access.restaurantId, parsed.data, access.userId);
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create promotion';
    const status = (err as { status?: number }).status ?? 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
