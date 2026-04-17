import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerEntryContext } from '@/lib/server/customer-entry';

export async function GET(req: NextRequest) {
  const branchCode = req.nextUrl.searchParams.get('branch');
  const tableCode = req.nextUrl.searchParams.get('table');
  const orgIdentifier = req.nextUrl.searchParams.get('org');

  if (!branchCode || !tableCode) {
    return NextResponse.json(
      { error: 'Branch and table are required' },
      { status: 400 }
    );
  }

  const entry = await resolveCustomerEntryContext({
    host: req.headers.get('host'),
    orgIdentifier,
    branchCode,
    tableCode,
  });

  if (!entry) {
    return NextResponse.json(
      { error: 'Customer entry not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    company: entry.company,
    restaurant: entry.restaurant,
    table: {
      id: entry.tableId,
      code: tableCode,
    },
    activeSessionId: entry.activeSessionId,
    requirePasscode: entry.requirePasscode,
  });
}
