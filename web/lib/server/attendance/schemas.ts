// Attendance domain: Zod validation schemas for API request/response bodies.

import { z } from 'zod';

// ─── QR credential ─────────────────────────────────────────────────────────

// POST /api/v1/owner/employees/[employeeId]/qr-credential — no body required
// (employee ID comes from path param)

// ─── Scan event ────────────────────────────────────────────────────────────

export const scanEventSchema = z.object({
  // The secure token encoded in the employee's QR code
  credential_token: z.string().min(1, 'Credential token is required'),
  // Explicit scan intent — the endpoint no longer infers check-in vs check-out
  // from the absence of check_out_time on an existing record.
  scan_type: z.enum(['check_in', 'check_out'], {
    errorMap: () => ({ message: "scan_type must be 'check_in' or 'check_out'" }),
  }),
});

export type ScanEventInput = z.infer<typeof scanEventSchema>;

// ─── Manual correction ─────────────────────────────────────────────────────

export const manualCorrectionSchema = z.object({
  employee_id: z.string().uuid('Employee ID must be a valid UUID'),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  event_type: z.enum(['check_in', 'check_out']),
  // ISO 8601 with timezone offset required so Asia/Tokyo vs UTC is unambiguous
  scanned_at: z.string().datetime({ offset: true }),
  notes: z.string().min(1, 'Notes are required for manual corrections'),
});

export type ManualCorrectionInput = z.infer<typeof manualCorrectionSchema>;

// ─── Approve / reject ──────────────────────────────────────────────────────

export const approveSummarySchema = z.object({
  action: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

export type ApproveSummaryInput = z.infer<typeof approveSummarySchema>;

// ─── List summaries query ──────────────────────────────────────────────────

export const listSummariesQuerySchema = z.object({
  restaurant_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'correction_pending']).optional(),
  employee_id: z.string().uuid().optional(),
});

export type ListSummariesQuery = z.infer<typeof listSummariesQuerySchema>;
