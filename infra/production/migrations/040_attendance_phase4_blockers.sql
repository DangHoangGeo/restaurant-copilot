-- Migration: 040_attendance_phase4_blockers
-- Follow-up fixes for Phase 4 attendance after implementation review.
--
-- Goals:
-- 1. Manual correction events must carry the intended corrected punch type.
-- 2. attendance_events must stay append-only at the policy layer.

ALTER TABLE attendance_events
  ADD COLUMN IF NOT EXISTS corrected_event_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_events_corrected_event_type_valid'
  ) THEN
    ALTER TABLE attendance_events
      ADD CONSTRAINT attendance_events_corrected_event_type_valid
      CHECK (corrected_event_type IN ('check_in', 'check_out') OR corrected_event_type IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_events_corrected_event_type_required'
  ) THEN
    ALTER TABLE attendance_events
      ADD CONSTRAINT attendance_events_corrected_event_type_required
      CHECK (
        (event_type = 'manual_correction' AND corrected_event_type IS NOT NULL) OR
        (event_type <> 'manual_correction' AND corrected_event_type IS NULL)
      );
  END IF;
END $$;

DROP POLICY IF EXISTS "Tenant can manage attendance_events" ON attendance_events;
DROP POLICY IF EXISTS "Tenant can SELECT attendance_events" ON attendance_events;
DROP POLICY IF EXISTS "Tenant can INSERT attendance_events" ON attendance_events;

CREATE POLICY "Tenant can SELECT attendance_events"
  ON attendance_events FOR SELECT
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

CREATE POLICY "Tenant can INSERT attendance_events"
  ON attendance_events FOR INSERT
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));
