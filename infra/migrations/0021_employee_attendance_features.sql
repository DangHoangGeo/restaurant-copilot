-- Migration file for employee attendance features

-- 1. users table: Modify role CHECK constraint
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'users'::regclass
    AND conname LIKE 'users_role_check%' -- or specific name if known, or based on consrc
    AND pg_get_constraintdef(oid) LIKE '%CHECK (role IN (%'; -- further refine if multiple CHECK constraints on role

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner','chef','server','cashier','manager','employee'));

-- 2. schedules table: Modifications
DROP INDEX IF EXISTS schedules_employee_id_weekday_idx;
ALTER TABLE schedules DROP COLUMN IF EXISTS weekday;
ALTER TABLE schedules ADD COLUMN work_date DATE;
ALTER TABLE schedules ADD COLUMN created_by UUID REFERENCES users(id);
-- Ensure updated_at has default now(), if it exists, this will set it. If not, it should be added.
-- Assuming updated_at column exists as per 001_init.sql, let's ensure the default is set.
ALTER TABLE schedules ALTER COLUMN updated_at SET DEFAULT now();
-- If the column might not exist, a more robust way would be:
-- ALTER TABLE schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- However, given it's in 001_init.sql, ALTER COLUMN should be fine.

ALTER TABLE schedules ADD CONSTRAINT schedules_unique_per_day UNIQUE(restaurant_id, employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_schedules_employee_work_date ON schedules (employee_id, work_date);
-- Set work_date to NOT NULL. This assumes that if there's existing data,
-- it will be handled by a separate data migration step or this is acceptable.
-- For a new setup, this is fine.
ALTER TABLE schedules ALTER COLUMN work_date SET NOT NULL;

-- 3. attendance_records table: Creation
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  hours_worked NUMERIC,
  status TEXT CHECK(status IN ('recorded','checked')) NOT NULL DEFAULT 'recorded',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, work_date)
);
CREATE INDEX idx_attendance_records_employee_work_date ON attendance_records (employee_id, work_date);
CREATE INDEX idx_attendance_records_restaurant_id ON attendance_records (restaurant_id);

-- 4. RLS Policies

-- RLS for schedules table
-- Assuming RLS is already enabled: ALTER TABLE schedules ENABLE ROW LEVEL SECURITY; (from 001_init.sql)
-- The generic policies from 001_init.sql should still apply and provide tenant isolation:
-- CREATE POLICY "Tenant can SELECT schedules" ON schedules FOR SELECT USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));
-- CREATE POLICY "Tenant can INSERT schedules" ON schedules FOR INSERT WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));
-- CREATE POLICY "Tenant can UPDATE schedules" ON schedules FOR UPDATE USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id')) WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));
-- CREATE POLICY "Tenant can DELETE schedules" ON schedules FOR DELETE USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Add specific policy for employee to view their own schedule.
CREATE POLICY "Employee can SELECT their own schedules"
  ON schedules
  FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- RLS for attendance_records table
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage attendance_records"
  ON attendance_records
  FOR ALL
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

CREATE POLICY "Employee can SELECT their own attendance_records"
  ON attendance_records
  FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Employee can INSERT their own attendance_records for checkin/out"
  ON attendance_records
  FOR INSERT
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employee can UPDATE their own attendance_records for checkin/out"
  ON attendance_records
  FOR UPDATE
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );
