// Attendance domain types
// Mirrors the tables added in migration 039_attendance_phase4.

export type AttendanceEventType = 'check_in' | 'check_out' | 'manual_correction';
export type AttendanceCorrectedEventType = 'check_in' | 'check_out';
export type AttendanceScanSource = 'qr_self' | 'qr_kiosk' | 'manager_manual';
export type AttendanceSummaryStatus = 'pending' | 'approved' | 'rejected' | 'correction_pending';
export type AttendanceApprovalAction = 'approved' | 'rejected';

export interface EmployeeQrCredential {
  id: string;
  restaurant_id: string;
  employee_id: string;
  token: string;
  is_active: boolean;
  issued_at: string;
  expires_at: string | null;
  rotated_by: string | null;
  created_at: string;
}

export interface AttendanceEvent {
  id: string;
  restaurant_id: string;
  employee_id: string;
  work_date: string;
  event_type: AttendanceEventType;
  corrected_event_type: AttendanceCorrectedEventType | null;
  scanned_at: string;
  credential_id: string | null;
  source: AttendanceScanSource;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AttendanceDailySummary {
  id: string;
  restaurant_id: string;
  employee_id: string;
  work_date: string;
  first_check_in: string | null;
  last_check_out: string | null;
  total_hours: number | null;
  status: AttendanceSummaryStatus;
  has_exception: boolean;
  exception_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceApproval {
  id: string;
  restaurant_id: string;
  summary_id: string;
  employee_id: string;
  work_date: string;
  action: AttendanceApprovalAction;
  notes: string | null;
  acted_by: string;
  acted_at: string;
  created_at: string;
}

// Enriched summary with employee display info
export interface DailySummaryWithEmployee extends AttendanceDailySummary {
  employee_name: string | null;
  employee_email: string | null;
}

// Result of rebuilding a daily summary from events
export interface RebuildSummaryResult {
  summary: AttendanceDailySummary;
  eventCount: number;
}

// Response for the QR credential endpoint (token visible only to manager)
export interface QrCredentialResponse {
  id: string;
  employee_id: string;
  token: string;
  is_active: boolean;
  issued_at: string;
  expires_at: string | null;
}
