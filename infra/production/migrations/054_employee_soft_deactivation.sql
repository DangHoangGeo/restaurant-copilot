-- Migration 054: Employee soft deactivation
--
-- The hard-delete path on employees left the auth user and users row alive,
-- meaning a dismissed employee could still log in. This migration adds an
-- is_active flag to employees so the API can soft-deactivate instead of
-- hard-deleting, paired with a Supabase auth ban in the route handler.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_employees_is_active
  ON employees (restaurant_id, is_active);

-- Existing rows are all active; the DEFAULT handles new inserts.
