import { NextRequest, NextResponse } from 'next/server';
import { resolveOrganizationFinanceAccess } from '@/lib/server/finance/access';
import {
  buildOrganizationFinanceExportCsv,
  getOrganizationFinancePeriodReport,
} from '@/lib/server/finance/organization';
import { parseYearMonth } from '@/lib/server/finance/service';
import type { FinancePeriodType } from '@/lib/server/finance/types';

function parsePeriodType(value: string | null): FinancePeriodType {
  return value === 'quarter' ? 'quarter' : 'month';
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'scope';
}

export async function GET(req: NextRequest) {
  const access = await resolveOrganizationFinanceAccess();

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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid parameters';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const periodType = parsePeriodType(searchParams.get('period'));
  const selectedRestaurantId = searchParams.get('restaurantId');

  if (
    selectedRestaurantId &&
    !access.accessibleRestaurantIds.includes(selectedRestaurantId)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const report = await getOrganizationFinancePeriodReport({
      organizationId: access.organizationId,
      branchIds: access.accessibleRestaurantIds,
      selectedRestaurantId,
      year,
      month,
      periodType,
      currency: access.currency,
      locale: 'en-US',
    });

    const csv = buildOrganizationFinanceExportCsv(report);
    const scopeLabel = sanitizeFilenamePart(
      report.selectedRestaurantName ?? 'all_branches'
    );
    const periodLabel =
      periodType === 'quarter'
        ? `Q${Math.floor((month - 1) / 3) + 1}_${year}`
        : `${year}_${String(month).padStart(2, '0')}`;
    const filename = `organization_finance_${periodType}_${periodLabel}_${scopeLabel}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
