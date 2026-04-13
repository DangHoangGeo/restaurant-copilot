// POST /api/v1/owner/attendance/corrections
//
// Manager inserts a manual correction event for an employee's work_date.
// Correction events mark the daily summary as correction_pending and rebuild it.
//
// Request body:
//   {
//     employee_id: uuid,
//     work_date: 'YYYY-MM-DD',
//     event_type: 'check_in' | 'check_out',
//     scanned_at: ISO8601 with timezone offset,
//     notes: string (required — explains why the correction was needed)
//   }
//
// Authorization: owner or manager role required.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { manualCorrectionSchema } from '@/lib/server/attendance/schemas';
import { addManualCorrection } from '@/lib/server/attendance/service';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId || !user.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = [USER_ROLES.OWNER, USER_ROLES.MANAGER];
  if (!allowed.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden: managers and owners only' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = manualCorrectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const result = await addManualCorrection({
      restaurantId: user.restaurantId,
      actorUserId: user.userId,
      input: parsed.data,
    });

    return NextResponse.json({
      message: 'Correction recorded and daily summary rebuilt',
      event_count: result.eventCount,
      summary: result.summary,
    }, { status: 201 });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to add correction';
    return NextResponse.json({ error: msg }, { status });
  }
}
