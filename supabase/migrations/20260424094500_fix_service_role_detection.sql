-- Fix service-role detection for privileged internal RPCs and triggers.
--
-- Purpose:
-- - Platform approval updates restaurants, which can fire notification triggers.
-- - Those triggers call queue_email_notification(), guarded by is_internal_operator().
-- - In PostgREST service-role requests, auth.role() is the reliable way to read
--   the JWT role; request.jwt.claim.role may be empty in some execution contexts.
--
-- Rollout:
-- - Replaces helper only; no data rewrite.
--
-- Verification:
-- - Calling public.is_service_role() through a service-role Supabase client returns true.

CREATE OR REPLACE FUNCTION public.is_service_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(auth.role(), current_setting('request.jwt.claim.role', true), '') = 'service_role';
$function$;

COMMENT ON FUNCTION public.is_service_role() IS 'Identify internal RPC calls executed with the Supabase service role';
