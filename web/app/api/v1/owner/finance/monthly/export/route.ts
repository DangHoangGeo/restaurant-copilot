// GET /api/v1/owner/finance/monthly/export
//
// Downloads a CSV export of the monthly finance report for accountant handoff.
// Uses a closed snapshot if available; otherwise exports the current live totals.
//
// Query params (optional):
//   year  — 4-digit year  (defaults to current Japan-local year)
//   month — 1–12          (defaults to current Japan-local month)
//
// Authorization: owner or manager role required.

import { NextRequest, NextResponse } from 'next/server';
import { resolveFinanceAccess } from '@/lib/server/finance/access';
import { getMonthlyReport, parseYearMonth, buildExportCsv } from '@/lib/server/finance/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'branch';
}

export async function GET(req: NextRequest) {
  const access = await resolveFinanceAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!access.canExport) {
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
    const [report, restaurantRow] = await Promise.all([
      getMonthlyReport(access.restaurantId, year, month, access.currency),
      supabaseAdmin
        .from('restaurants')
        .select('name')
        .eq('id', access.restaurantId)
        .maybeSingle(),
    ]);

    const restaurantName = (restaurantRow.data?.name as string | null) ?? 'Branch';
    const csv = buildExportCsv(report, restaurantName);

    const mm = String(month).padStart(2, '0');
    const filename = `finance_${year}_${mm}_${sanitizeFilenamePart(restaurantName)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to export report';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
