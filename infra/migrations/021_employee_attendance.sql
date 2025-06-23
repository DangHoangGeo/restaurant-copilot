-- 021_employee_attendance.sql
-- Add fields to schedules table and create attendance_records table

-- Ensure new columns exist
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS work_date DATE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Unique constraint per employee per day
ALTER TABLE schedules
  ADD CONSTRAINT IF NOT EXISTS schedules_unique_per_day UNIQUE(restaurant_id, employee_id, work_date);

-- Update index for schedule lookups
DROP INDEX IF EXISTS idx_schedules_employee_weekday;
CREATE INDEX IF NOT EXISTS idx_schedules_employee_date ON schedules (employee_id, work_date);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  hours_worked NUMERIC,
  status TEXT CHECK(status IN ('recorded','checked')) NOT NULL DEFAULT 'recorded',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, work_date)
);

-- Enable RLS on attendance_records
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records (employee_id, work_date);
