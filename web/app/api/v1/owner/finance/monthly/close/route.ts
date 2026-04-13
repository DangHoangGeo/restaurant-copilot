// POST /api/v1/owner/finance/monthly/close
//
// Closes (freezes) a month for the active branch.
// Re-computes live totals at close time and writes a 'closed' snapshot.
// Returns 409 if the month is already closed.
//
// Body (JSON):
//   year  — required, 4-digit integer
//   month — required, 1–12
//   notes — optional string (accountant notes)
//
// Authorization: owner role required (canClose = true).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveFinanceAccess } from '@/lib/server/finance/access';
import { closeMonth } from '@/lib/server/finance/service';

const CloseMonthSchema = z.object({
  year:  z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  notes: z.string().max(1000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const access = await resolveFinanceAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!access.canClose) {
    return NextResponse.json(
      { error: 'Only owners can close a finance month.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CloseMonthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const snapshot = await closeMonth({
      restaurantId: access.restaurantId,
      year:         parsed.data.year,
      month:        parsed.data.month,
      currency:     access.currency,
      closedBy:     access.userId,
      notes:        parsed.data.notes,
    });
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg    = err instanceof Error ? err.message : 'Failed to close month';
    return NextResponse.json({ error: msg }, { status });
  }
}
