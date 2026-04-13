// GET /api/v1/owner/attendance/summaries
//
// List attendance daily summaries for the active branch.
// Supports filtering by: status, employee_id, date_from, date_to.
//
// Query params (all optional):
//   status       — pending | approved | rejected | correction_pending
//   employee_id  — UUID
//   date_from    — YYYY-MM-DD
//   date_to      — YYYY-MM-DD
//
// Authorization: owner or manager role required.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { listSummariesQuerySchema } from '@/lib/server/attendance/schemas';
import { listDailySummaries } from '@/lib/server/attendance/service';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = [USER_ROLES.OWNER, USER_ROLES.MANAGER];
  if (!allowed.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden: managers and owners only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawQuery = {
    status: searchParams.get('status') ?? undefined,
    employee_id: searchParams.get('employee_id') ?? undefined,
    date_from: searchParams.get('date_from') ?? undefined,
    date_to: searchParams.get('date_to') ?? undefined,
  };

  const parsed = listSummariesQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const summaries = await listDailySummaries(user.restaurantId, parsed.data);
    return NextResponse.json({ summaries });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch summaries';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
