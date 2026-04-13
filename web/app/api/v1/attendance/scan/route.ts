// POST /api/v1/attendance/scan
//
// Secure QR attendance scan endpoint (Phase 4).
//
// The request must include:
//   - credential_token: the random token encoded in the employee's QR code
//   - scan_type: 'check_in' | 'check_out'
//
// The employee identity is derived from the credential lookup — the caller
// cannot supply an employee_id directly. This prevents spoofing.
//
// The caller must be authenticated as an employee in the same branch.
// For future kiosk mode (scan on a shared device), the source field would
// be 'qr_kiosk'. That variant is stubbed but not yet active.
//
// On success, an immutable attendance_event is created and the
// attendance_daily_summary for that work_date is rebuilt.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { scanEventSchema } from '@/lib/server/attendance/schemas';
import { processScanEvent } from '@/lib/server/attendance/service';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = scanEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const result = await processScanEvent({
      credentialToken: parsed.data.credential_token,
      scanType: parsed.data.scan_type,
      restaurantId: user.restaurantId,
    });

    const message =
      parsed.data.scan_type === 'check_in'
        ? 'Checked in successfully'
        : 'Checked out successfully';

    return NextResponse.json(
      {
        message,
        event_id: result.eventId,
        employee_id: result.employeeId,
        work_date: result.workDate,
        scanned_at: result.scannedAt,
        summary: {
          id: result.summary.id,
          status: result.summary.status,
          total_hours: result.summary.total_hours,
          has_exception: result.summary.has_exception,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Scan failed';
    return NextResponse.json({ error: message }, { status });
  }
}
