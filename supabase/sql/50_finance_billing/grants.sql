-- 50_finance_billing/grants.sql
-- Billing and trial RPCs are callable only from authenticated control-plane paths or internal jobs.

\echo '50_finance_billing/grants.sql'

GRANT EXECUTE ON FUNCTION public.get_restaurant_subscription_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_restaurant_quota(uuid, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trials_expiring_soon(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_trial_expiration_warnings(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_expired_trials() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extend_trial(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trial_statistics() TO authenticated, service_role;
