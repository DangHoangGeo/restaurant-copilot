// GET /api/v1/owner/purchasing/summary
//
// Returns aggregated purchasing spend for a date range.
// Used by finance reporting to show expenses in monthly summaries.
//
// Query params (required):
//   from_date — YYYY-MM-DD
//   to_date   — YYYY-MM-DD
// Optional:
//   currency  — default JPY

import { NextRequest, NextResponse } from 'next/server';
import { resolvePurchasingAccess } from '@/lib/server/purchasing/access';
import { getPurchaseSummaryForPeriod } from '@/lib/server/purchasing/service';
import { z } from 'zod';

const QuerySchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency:  z.string().length(3).default('JPY'),
});

export async function GET(req: NextRequest) {
  const access = await resolvePurchasingAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    from_date: searchParams.get('from_date') ?? undefined,
    to_date:   searchParams.get('to_date')   ?? undefined,
    currency:  searchParams.get('currency')  ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'from_date and to_date (YYYY-MM-DD) are required', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const summary = await getPurchaseSummaryForPeriod(
      access.restaurantId,
      parsed.data.from_date,
      parsed.data.to_date,
      parsed.data.currency
    );
    return NextResponse.json({ summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to compute purchase summary';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
