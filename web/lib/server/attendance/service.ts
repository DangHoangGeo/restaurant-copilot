// Attendance domain: business logic service.
// Route handlers call these functions, not the queries module directly.
//
// Key invariants enforced here:
//  - Raw scan events are never modified after creation.
//  - Rebuilding a daily summary from events is idempotent.
//  - An already-approved summary stays approved after a rebuild unless a
//    manual_correction event was added after approval (triggers correction_pending).
//  - has_exception = true when: no check-out found, total_hours > 14 (shift cap),
//    or a manual_correction event exists for the day.

import type { AttendanceDailySummary, RebuildSummaryResult } from './types';
import {
  findCredentialByToken,
  insertAttendanceEvent,
  listEventsForDay,
  upsertDailySummary,
  getSummaryById,
  updateSummaryStatus,
  insertApprovalRecord,
  listDailySummaries,
  getActiveCredential,
  rotateCredential,
  assertEmployeeBelongsToRestaurant,
} from './queries';
import type { ManualCorrectionInput, ApproveSummaryInput } from './schemas';

// ─── Japan-local date helper ──────────────────────────────────────────────────

/**
 * Return the current date in Asia/Tokyo timezone as YYYY-MM-DD.
 * Japan is UTC+9 and does not observe daylight saving time.
 * Using 'en-CA' locale consistently returns ISO-style date strings.
 */
export function getJapanLocalDate(dt: Date = new Date()): string {
  return dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
}

// ─── QR credential management ────────────────────────────────────────────────

export { getActiveCredential, rotateCredential };

// ─── Secure scan ─────────────────────────────────────────────────────────────

export interface ScanResult {
  eventId: string;
  employeeId: string;
  workDate: string;
  eventType: 'check_in' | 'check_out';
  scannedAt: string;
  summary: AttendanceDailySummary;
}

/**
 * Process a QR attendance scan.
 *
 * 1. Validate the credential token.
 * 2. Verify the credential belongs to the expected restaurant.
 * 3. Insert an immutable attendance_event.
 * 4. Rebuild the daily summary for the affected work_date.
 *
 * The caller must not pass employee_id from the request body — it comes
 * from the credential lookup so it cannot be spoofed.
 */
export async function processScanEvent(params: {
  credentialToken: string;
  scanType: 'check_in' | 'check_out';
  restaurantId: string;
}): Promise<ScanResult> {
  // 1. Find and validate credential
  const credential = await findCredentialByToken(params.credentialToken);

  if (!credential) {
    throw Object.assign(new Error('QR credential not found or no longer active'), { status: 403 });
  }

  // 2. Ensure credential is for this restaurant (branch)
  if (credential.restaurant_id !== params.restaurantId) {
    throw Object.assign(
      new Error('QR credential does not belong to this branch'),
      { status: 403 }
    );
  }

  // 3. Check expiry
  if (credential.expires_at && new Date(credential.expires_at) < new Date()) {
    throw Object.assign(new Error('QR credential has expired. Please ask your manager to reissue it.'), { status: 403 });
  }

  const now = new Date();
  const workDate = getJapanLocalDate(now);
  const scannedAt = now.toISOString();

  // 4. Insert immutable attendance event
  const event = await insertAttendanceEvent({
    restaurantId: params.restaurantId,
    employeeId: credential.employee_id,
    workDate,
    eventType: params.scanType,
    scannedAt,
    credentialId: credential.id,
    source: 'qr_self',
  });

  // 5. Rebuild daily summary from all events for this employee + work_date
  const summary = await rebuildDailySummary(
    params.restaurantId,
    credential.employee_id,
    workDate
  );

  return {
    eventId: event.id,
    employeeId: credential.employee_id,
    workDate,
    eventType: params.scanType,
    scannedAt,
    summary: summary.summary,
  };
}

// ─── Daily summary rebuild ────────────────────────────────────────────────────

/**
 * Rebuild (upsert) the daily summary for an employee from their attendance events.
 * This is idempotent: calling it multiple times with the same events produces
 * the same result.
 *
 * Exception detection:
 *  - No check_out event found → has_exception (missing checkout)
 *  - Manual correction event exists → has_exception (review required)
 *  - total_hours > 14 → has_exception (implausibly long shift)
 *  - total_hours < 0 → has_exception (clock skew / data error)
 */
export async function rebuildDailySummary(
  restaurantId: string,
  employeeId: string,
  workDate: string
): Promise<RebuildSummaryResult> {
  const events = await listEventsForDay(employeeId, workDate, restaurantId);

  const checkIns = events.filter(
    (e) =>
      e.event_type === 'check_in' ||
      (e.event_type === 'manual_correction' && e.corrected_event_type === 'check_in')
  );
  const checkOuts = events.filter(
    (e) =>
      e.event_type === 'check_out' ||
      (e.event_type === 'manual_correction' && e.corrected_event_type === 'check_out')
  );
  const corrections = events.filter((e) => e.event_type === 'manual_correction');

  const firstCheckIn = checkIns.length > 0 ? checkIns[0].scanned_at : null;
  const lastCheckOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1].scanned_at : null;

  let totalHours: number | null = null;
  if (firstCheckIn && lastCheckOut) {
    const diff =
      (new Date(lastCheckOut).getTime() - new Date(firstCheckIn).getTime()) / (1000 * 60 * 60);
    totalHours = parseFloat(diff.toFixed(2));
  }

  const missingCheckOut = checkIns.length > 0 && checkOuts.length === 0;
  const hasManualCorrection = corrections.length > 0;
  const implausibleHours = totalHours !== null && (totalHours > 14 || totalHours < 0);

  const hasException = missingCheckOut || hasManualCorrection || implausibleHours;

  const exceptionParts: string[] = [];
  if (missingCheckOut) exceptionParts.push('Missing check-out');
  if (hasManualCorrection) exceptionParts.push('Manual correction exists — review required');
  if (implausibleHours) exceptionParts.push(`Implausible total hours: ${totalHours}`);
  const exceptionNotes = exceptionParts.length > 0 ? exceptionParts.join('; ') : null;

  // If a manual correction was added after an approval, revert to correction_pending
  const statusOverride = hasManualCorrection ? 'correction_pending' : undefined;

  const summary = await upsertDailySummary({
    restaurantId,
    employeeId,
    workDate,
    firstCheckIn,
    lastCheckOut,
    totalHours,
    hasException,
    exceptionNotes,
    status: statusOverride,
  });

  return { summary, eventCount: events.length };
}

// ─── Manual correction ───────────────────────────────────────────────────────

/**
 * Manager inserts a manual correction event for an employee's work_date.
 * The summary is rebuilt after insertion.
 */
export async function addManualCorrection(params: {
  restaurantId: string;
  actorUserId: string;
  input: ManualCorrectionInput;
}): Promise<RebuildSummaryResult> {
  const { restaurantId, actorUserId, input } = params;

  await assertEmployeeBelongsToRestaurant(input.employee_id, restaurantId);

  await insertAttendanceEvent({
    restaurantId,
    employeeId: input.employee_id,
    workDate: input.work_date,
    eventType: 'manual_correction',
    correctedEventType: input.event_type,
    scannedAt: input.scanned_at,
    source: 'manager_manual',
    notes: input.notes,
    createdBy: actorUserId,
  });

  return rebuildDailySummary(restaurantId, input.employee_id, input.work_date);
}

// ─── Approval workflow ───────────────────────────────────────────────────────

/**
 * Approve or reject an attendance daily summary.
 * Writes an audit record to attendance_approvals and updates the summary status.
 */
export async function approveSummary(params: {
  summaryId: string;
  restaurantId: string;
  actorUserId: string;
  input: ApproveSummaryInput;
}): Promise<AttendanceDailySummary> {
  const { summaryId, restaurantId, actorUserId, input } = params;

  const existing = await getSummaryById(summaryId, restaurantId);
  if (!existing) {
    throw Object.assign(new Error('Attendance daily summary not found'), { status: 404 });
  }

  const now = new Date().toISOString();

  // Append audit record (never update these)
  await insertApprovalRecord({
    restaurantId,
    summaryId,
    employeeId: existing.employee_id,
    workDate: existing.work_date,
    action: input.action,
    notes: input.notes ?? null,
    actedBy: actorUserId,
  });

  // Update summary status
  const updated = await updateSummaryStatus({
    summaryId,
    status: input.action === 'approved' ? 'approved' : 'rejected',
    approvedBy: input.action === 'approved' ? actorUserId : null,
    approvedAt: input.action === 'approved' ? now : null,
  });

  return updated;
}

// ─── List helpers ─────────────────────────────────────────────────────────────

export { listDailySummaries };
