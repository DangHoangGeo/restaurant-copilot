// GET /api/v1/owner/finance/monthly
//
// Returns the monthly finance report for the active branch.
// If a closed snapshot exists for that month it is returned verbatim.
// Otherwise totals are computed live from operational tables.
//
// Query params (optional):
//   year  — 4-digit year  (defaults to current Japan-local year)
//   month — 1–12          (defaults to current Japan-local month)
//
// Authorization: owner or manager role required.

import { NextRequest, NextResponse } from 'next/server';
import { resolveFinanceAccess } from '@/lib/server/finance/access';
import { getMonthlyReport, parseYearMonth } from '@/lib/server/finance/service';

export async function GET(req: NextRequest) {
  const access = await resolveFinanceAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  let year: number;
  let month: number;
  try {
    ({ year, month } = parseYearMonth(
      searchParams.get('year'),
      searchParams.get('month')
    ));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid parameters';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const report = await getMonthlyReport(
      access.restaurantId,
      year,
      month,
      access.currency
    );
    return NextResponse.json({ report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load monthly report';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
