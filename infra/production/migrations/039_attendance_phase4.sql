-- Migration: 039_attendance_phase4
-- Phase 4: Employee Scheduling, QR Attendance, and Approvals
--
-- Replaces the weak attendance scan model (qrToken = employee_id) with a
-- three-layer architecture:
--   1. employee_qr_credentials  — secure random tokens per employee per branch
--   2. attendance_events        — immutable raw scan records
--   3. attendance_daily_summaries — system-computed daily totals per employee
--   4. attendance_approvals     — audit trail for approval/rejection actions
--
-- The existing attendance_records table is NOT dropped. Old scan history is
-- preserved. New scans write only to attendance_events and
-- attendance_daily_summaries.
--
-- Raw scan events are never modified after creation.
-- Daily summaries are rebuilt from events (idempotent).
-- Approvals are the business control point for payroll-grade sign-off.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. employee_qr_credentials
--    Secure random token (UUID) issued per employee per branch.
--    Replaces the old pattern where qrToken === employee_id.
--    One active credential per employee per branch at any time.
--    Rotation: set is_active = false on old row, insert new row.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_qr_credentials (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id   uuid        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token         text        UNIQUE NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,            -- NULL = no expiry; app may set 1-year TTL
  rotated_by    uuid        REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eqr_employee_id   ON employee_qr_credentials (employee_id);
CREATE INDEX IF NOT EXISTS idx_eqr_restaurant_id ON employee_qr_credentials (restaurant_id);
-- Partial index for fast active-token lookups during scan validation
CREATE INDEX IF NOT EXISTS idx_eqr_token_active  ON employee_qr_credentials (token) WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. attendance_events
--    Append-only table. Rows are NEVER updated after insertion.
--    check_in / check_out events come from QR scans.
--    manual_correction events are inserted by a manager to fix scan gaps.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id   uuid        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date     date        NOT NULL,   -- Japan-local date (Asia/Tokyo) resolved at scan time
  event_type    text        NOT NULL    CHECK (event_type IN ('check_in', 'check_out', 'manual_correction')),
  corrected_event_type text,
  scanned_at    timestamptz NOT NULL DEFAULT now(),
  credential_id uuid        REFERENCES employee_qr_credentials(id),
  source        text        NOT NULL DEFAULT 'qr_self'
                            CHECK (source IN ('qr_self', 'qr_kiosk', 'manager_manual')),
  notes         text,
  created_by    uuid        REFERENCES users(id),  -- NULL for automated QR scans
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_events_corrected_event_type_valid CHECK (
    corrected_event_type IN ('check_in', 'check_out') OR corrected_event_type IS NULL
  ),
  CONSTRAINT attendance_events_corrected_event_type_required CHECK (
    (event_type = 'manual_correction' AND corrected_event_type IS NOT NULL) OR
    (event_type <> 'manual_correction' AND corrected_event_type IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ae_employee_work_date ON attendance_events (employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_ae_restaurant_id      ON attendance_events (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ae_work_date          ON attendance_events (work_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. attendance_daily_summaries
--    One row per (employee_id, work_date). Rebuilt from attendance_events.
--    Rebuilding is idempotent: same events always produce the same summary.
--
--    status lifecycle:
--      pending           — computed but not yet reviewed by manager
--      approved          — manager confirmed hours for payroll
--      rejected          — manager flagged as incorrect (with notes)
--      correction_pending — manager flagged and is awaiting employee clarification
--
--    has_exception = true when: no check_out recorded, or total_hours is
--    outside a normal range, or a manual_correction event exists.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_daily_summaries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id     uuid        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date       date        NOT NULL,
  first_check_in  timestamptz,
  last_check_out  timestamptz,
  total_hours     numeric(5,2),
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected', 'correction_pending')),
  has_exception   boolean     NOT NULL DEFAULT false,
  exception_notes text,
  approved_by     uuid        REFERENCES users(id),
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_ads_employee_work_date  ON attendance_daily_summaries (employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_ads_restaurant_status   ON attendance_daily_summaries (restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_ads_work_date           ON attendance_daily_summaries (work_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. attendance_approvals
--    Append-only audit trail for every approval or rejection action.
--    Multiple rejection + one approval are all preserved for accountability.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_approvals (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  summary_id    uuid        NOT NULL REFERENCES attendance_daily_summaries(id) ON DELETE CASCADE,
  employee_id   uuid        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date     date        NOT NULL,
  action        text        NOT NULL CHECK (action IN ('approved', 'rejected')),
  notes         text,
  acted_by      uuid        NOT NULL REFERENCES users(id),
  acted_at      timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aa_summary_id      ON attendance_approvals (summary_id);
CREATE INDEX IF NOT EXISTS idx_aa_restaurant_date ON attendance_approvals (restaurant_id, work_date);
CREATE INDEX IF NOT EXISTS idx_aa_acted_by        ON attendance_approvals (acted_by);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────

-- employee_qr_credentials — owners and managers manage; employees cannot read tokens
ALTER TABLE employee_qr_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage employee_qr_credentials"
  ON employee_qr_credentials FOR ALL
  USING  (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- attendance_events — append-only for tenant; employee can only SELECT their own
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can SELECT attendance_events"
  ON attendance_events FOR SELECT
  USING  (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

CREATE POLICY "Tenant can INSERT attendance_events"
  ON attendance_events FOR INSERT
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

CREATE POLICY "Employee can SELECT their own attendance events"
  ON attendance_events FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- attendance_daily_summaries — tenant manages; employee can see their own
ALTER TABLE attendance_daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage attendance_daily_summaries"
  ON attendance_daily_summaries FOR ALL
  USING  (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

CREATE POLICY "Employee can SELECT their own daily summaries"
  ON attendance_daily_summaries FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- attendance_approvals — tenant manages only
ALTER TABLE attendance_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage attendance_approvals"
  ON attendance_approvals FOR ALL
  USING  (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));
