// GET /api/v1/owner/promotions/[promoId]/usage
//
// Returns the list of orders this promotion was applied to (audit trail).
// Query params:
//   limit — max rows to return (default 50)

import { NextRequest, NextResponse } from 'next/server';
import { resolvePromotionsAccess } from '@/lib/server/promotions/access';
import { getPromotionUsage } from '@/lib/server/promotions/service';

type Params = { params: Promise<{ promoId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { promoId } = await params;

  const access = await resolvePromotionsAccess();
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200);

  try {
    const usage = await getPromotionUsage(access.restaurantId, promoId, limit);
    return NextResponse.json({ usage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch usage';
    const status = (err as { status?: number }).status ?? 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
