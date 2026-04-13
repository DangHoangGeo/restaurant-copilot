// POST /api/v1/owner/attendance/summaries/[summaryId]/approve
//
// Approve or reject an attendance daily summary.
//
// Request body:
//   { action: 'approved' | 'rejected', notes?: string }
//
// Writes an audit record to attendance_approvals and updates the summary status.
// An approved summary can later be rejected if the manager changes their mind —
// both events are preserved in the audit trail.
//
// Authorization: owner or manager role required.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { approveSummarySchema } from '@/lib/server/attendance/schemas';
import { approveSummary } from '@/lib/server/attendance/service';

const paramsSchema = z.object({
  summaryId: z.string().uuid('Invalid summary ID'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ summaryId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId || !user.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = [USER_ROLES.OWNER, USER_ROLES.MANAGER];
  if (!allowed.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden: managers and owners only' }, { status: 403 });
  }

  const resolvedParams = await params;
  const paramsParsed = paramsSchema.safeParse(resolvedParams);
  if (!paramsParsed.success) {
    return NextResponse.json({ error: 'Invalid summary ID' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const bodyParsed = approveSummarySchema.safeParse(body);
  if (!bodyParsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: bodyParsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const updated = await approveSummary({
      summaryId: paramsParsed.data.summaryId,
      restaurantId: user.restaurantId,
      actorUserId: user.userId,
      input: bodyParsed.data,
    });

    return NextResponse.json({ summary: updated });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to process approval';
    return NextResponse.json({ error: msg }, { status });
  }
}
