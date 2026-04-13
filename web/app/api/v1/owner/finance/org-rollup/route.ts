// GET /api/v1/owner/finance/org-rollup
//
// Returns a cross-branch finance rollup for the user's organization.
// Only includes branches that have a closed snapshot for the requested month.
//
// Query params (optional):
//   year  — 4-digit year  (defaults to current Japan-local year)
//   month — 1–12          (defaults to current Japan-local month)
//
// Authorization: owner or manager role required.

import { NextRequest, NextResponse } from 'next/server';
import { resolveFinanceAccess } from '@/lib/server/finance/access';
import { getOrgMonthlyRollup, parseYearMonth } from '@/lib/server/finance/service';

export async function GET(req: NextRequest) {
  const access = await resolveFinanceAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!access.organizationId) {
    return NextResponse.json(
      { error: 'No organization context. Org rollup requires multi-branch access.' },
      { status: 400 }
    );
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
    const rollup = await getOrgMonthlyRollup({
      organizationId: access.organizationId,
      year,
      month,
    });
    return NextResponse.json({ rollup });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load org rollup';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
