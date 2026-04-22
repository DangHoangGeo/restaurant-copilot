-- 40_people_attendance/functions.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '40_people_attendance/functions.sql'

CREATE OR REPLACE FUNCTION public.update_attendance_records_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
