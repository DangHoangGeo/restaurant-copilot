// Attendance domain: raw database queries.
// Route handlers call service functions, not these queries directly.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';
import type {
  EmployeeQrCredential,
  AttendanceEvent,
  AttendanceDailySummary,
  DailySummaryWithEmployee,
  AttendanceEventType,
  AttendanceCorrectedEventType,
  AttendanceScanSource,
  AttendanceSummaryStatus,
  AttendanceApprovalAction,
} from './types';
import type { ListSummariesQuery } from './schemas';

export async function assertEmployeeBelongsToRestaurant(
  employeeId: string,
  restaurantId: string
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) throw new Error(`assertEmployeeBelongsToRestaurant: ${error.message}`);
  if (!data) {
    throw Object.assign(new Error('Employee not found in this branch'), { status: 404 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QR Credentials
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch the active credential for an employee. Returns null if none. */
export async function getActiveCredential(
  employeeId: string,
  restaurantId: string
): Promise<EmployeeQrCredential | null> {
  await assertEmployeeBelongsToRestaurant(employeeId, restaurantId);

  const { data, error } = await supabaseAdmin
    .from('employee_qr_credentials')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getActiveCredential: ${error.message}`);
  return data as EmployeeQrCredential | null;
}

/** Deactivate all current credentials for an employee, then issue a new one. */
export async function rotateCredential(
  employeeId: string,
  restaurantId: string,
  rotatedBy: string
): Promise<EmployeeQrCredential> {
  await assertEmployeeBelongsToRestaurant(employeeId, restaurantId);

  // Deactivate all existing active credentials
  const { error: deactivateError } = await supabaseAdmin
    .from('employee_qr_credentials')
    .update({ is_active: false, rotated_by: rotatedBy })
    .eq('employee_id', employeeId)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);

  if (deactivateError) throw new Error(`rotateCredential deactivate: ${deactivateError.message}`);

  // Issue new credential with a cryptographically random token
  const newToken = uuidv4() + '-' + uuidv4(); // Two UUIDs concatenated for extra entropy
  const { data, error } = await supabaseAdmin
    .from('employee_qr_credentials')
    .insert({
      restaurant_id: restaurantId,
      employee_id: employeeId,
      token: newToken,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw new Error(`rotateCredential insert: ${error.message}`);
  return data as EmployeeQrCredential;
}

/** Look up a credential by token (active only). */
export async function findCredentialByToken(
  token: string
): Promise<EmployeeQrCredential | null> {
  const { data, error } = await supabaseAdmin
    .from('employee_qr_credentials')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(`findCredentialByToken: ${error.message}`);
  return data as EmployeeQrCredential | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Events
// ─────────────────────────────────────────────────────────────────────────────

/** Insert an immutable scan event. Never update attendance events after creation. */
export async function insertAttendanceEvent(params: {
  restaurantId: string;
  employeeId: string;
  workDate: string;
  eventType: AttendanceEventType;
  correctedEventType?: AttendanceCorrectedEventType | null;
  scannedAt: string;
  credentialId?: string | null;
  source: AttendanceScanSource;
  notes?: string | null;
  createdBy?: string | null;
}): Promise<AttendanceEvent> {
  const { data, error } = await supabaseAdmin
    .from('attendance_events')
    .insert({
      restaurant_id: params.restaurantId,
      employee_id: params.employeeId,
      work_date: params.workDate,
      event_type: params.eventType,
      corrected_event_type:
        params.eventType === 'manual_correction' ? params.correctedEventType ?? null : null,
      scanned_at: params.scannedAt,
      credential_id: params.credentialId ?? null,
      source: params.source,
      notes: params.notes ?? null,
      created_by: params.createdBy ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`insertAttendanceEvent: ${error.message}`);
  return data as AttendanceEvent;
}

/** Fetch all events for an employee on a given work_date, ordered by scanned_at. */
export async function listEventsForDay(
  employeeId: string,
  workDate: string,
  restaurantId: string
): Promise<AttendanceEvent[]> {
  const { data, error } = await supabaseAdmin
    .from('attendance_events')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('work_date', workDate)
    .eq('restaurant_id', restaurantId)
    .order('scanned_at', { ascending: true });

  if (error) throw new Error(`listEventsForDay: ${error.message}`);
  return (data ?? []) as AttendanceEvent[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Summaries
// ─────────────────────────────────────────────────────────────────────────────

/** Upsert a daily summary computed from events. */
export async function upsertDailySummary(params: {
  restaurantId: string;
  employeeId: string;
  workDate: string;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalHours: number | null;
  hasException: boolean;
  exceptionNotes: string | null;
  // Only override status when explicitly provided (don't reset approved → pending)
  status?: AttendanceSummaryStatus;
}): Promise<AttendanceDailySummary> {
  // Fetch existing row to preserve approval status
  const { data: existing } = await supabaseAdmin
    .from('attendance_daily_summaries')
    .select('id, status, approved_by, approved_at')
    .eq('restaurant_id', params.restaurantId)
    .eq('employee_id', params.employeeId)
    .eq('work_date', params.workDate)
    .maybeSingle();

  // Don't reset already-approved rows to pending just because a rebuild ran.
  // A new manual correction event would require manager re-review.
  const preserveStatus = !params.status && existing?.status === 'approved';
  const status =
    params.status ??
    (preserveStatus ? 'approved' : existing?.status ?? 'pending');
  const preserveApprovalMetadata = preserveStatus && status === 'approved';

  const payload = {
    restaurant_id: params.restaurantId,
    employee_id: params.employeeId,
    work_date: params.workDate,
    first_check_in: params.firstCheckIn,
    last_check_out: params.lastCheckOut,
    total_hours: params.totalHours,
    has_exception: params.hasException,
    exception_notes: params.exceptionNotes,
    status,
    approved_by: preserveApprovalMetadata ? existing?.approved_by : null,
    approved_at: preserveApprovalMetadata ? existing?.approved_at : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('attendance_daily_summaries')
    .upsert(payload, { onConflict: 'employee_id,work_date' })
    .select('*')
    .single();

  if (error) throw new Error(`upsertDailySummary: ${error.message}`);
  return data as AttendanceDailySummary;
}

/** Fetch a daily summary by its ID. */
export async function getSummaryById(
  summaryId: string,
  restaurantId: string
): Promise<AttendanceDailySummary | null> {
  const { data, error } = await supabaseAdmin
    .from('attendance_daily_summaries')
    .select('*')
    .eq('id', summaryId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) throw new Error(`getSummaryById: ${error.message}`);
  return data as AttendanceDailySummary | null;
}

/** Update the status and approval fields of a daily summary. */
export async function updateSummaryStatus(params: {
  summaryId: string;
  status: AttendanceSummaryStatus;
  approvedBy: string | null;
  approvedAt: string | null;
}): Promise<AttendanceDailySummary> {
  const { data, error } = await supabaseAdmin
    .from('attendance_daily_summaries')
    .update({
      status: params.status,
      approved_by: params.approvedBy,
      approved_at: params.approvedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.summaryId)
    .select('*')
    .single();

  if (error) throw new Error(`updateSummaryStatus: ${error.message}`);
  return data as AttendanceDailySummary;
}

/** List daily summaries with optional filters, joined with employee name/email. */
export async function listDailySummaries(
  restaurantId: string,
  filters: ListSummariesQuery
): Promise<DailySummaryWithEmployee[]> {
  let query = supabaseAdmin
    .from('attendance_daily_summaries')
    .select(`
      *,
      employees!inner (
        id,
        users ( name, email )
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('work_date', { ascending: false })
    .order('employee_id', { ascending: true });

  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.date_from) query = query.gte('work_date', filters.date_from);
  if (filters.date_to) query = query.lte('work_date', filters.date_to);

  const { data, error } = await query;
  if (error) throw new Error(`listDailySummaries: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const emp = row.employees as Record<string, unknown> | null;
    const user = emp ? (Array.isArray(emp.users) ? emp.users[0] : emp.users) as Record<string, unknown> | null : null;
    return {
      id: row.id as string,
      restaurant_id: row.restaurant_id as string,
      employee_id: row.employee_id as string,
      work_date: row.work_date as string,
      first_check_in: row.first_check_in as string | null,
      last_check_out: row.last_check_out as string | null,
      total_hours: row.total_hours as number | null,
      status: row.status as AttendanceSummaryStatus,
      has_exception: row.has_exception as boolean,
      exception_notes: row.exception_notes as string | null,
      approved_by: row.approved_by as string | null,
      approved_at: row.approved_at as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      employee_name: user ? (user.name as string | null) : null,
      employee_email: user ? (user.email as string | null) : null,
    } satisfies DailySummaryWithEmployee;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Approvals (audit trail)
// ─────────────────────────────────────────────────────────────────────────────

/** Append an approval or rejection record. Never update these rows. */
export async function insertApprovalRecord(params: {
  restaurantId: string;
  summaryId: string;
  employeeId: string;
  workDate: string;
  action: AttendanceApprovalAction;
  notes?: string | null;
  actedBy: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('attendance_approvals').insert({
    restaurant_id: params.restaurantId,
    summary_id: params.summaryId,
    employee_id: params.employeeId,
    work_date: params.workDate,
    action: params.action,
    notes: params.notes ?? null,
    acted_by: params.actedBy,
  });

  if (error) throw new Error(`insertApprovalRecord: ${error.message}`);
}
