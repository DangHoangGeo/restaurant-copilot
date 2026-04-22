-- 50_finance_billing/functions.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '50_finance_billing/functions.sql'

CREATE OR REPLACE FUNCTION public.update_subscription_plans_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_restaurant_subscription_status(rest_id uuid)
 RETURNS TABLE(plan_id text, status text, is_trial boolean, trial_days_remaining integer, period_ends_at timestamp with time zone, days_until_renewal integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.request_can_access_restaurant(rest_id) OR public.is_internal_operator()) THEN
    RAISE EXCEPTION 'Not authorized to access subscription status for restaurant %', rest_id;
  END IF;

  RETURN QUERY
  SELECT
    ts.plan_id,
    ts.status,
    (ts.status = 'trial') as is_trial,
    CASE
      WHEN ts.status = 'trial' AND ts.trial_ends_at IS NOT NULL
      THEN GREATEST(0, EXTRACT(DAY FROM (ts.trial_ends_at - NOW()))::INTEGER)
      ELSE NULL
    END as trial_days_remaining,
    ts.current_period_end as period_ends_at,
    GREATEST(0, EXTRACT(DAY FROM (ts.current_period_end - NOW()))::INTEGER) as days_until_renewal
  FROM tenant_subscriptions ts
  WHERE ts.restaurant_id = rest_id;
END;
$function$;

COMMENT ON FUNCTION public.get_restaurant_subscription_status(rest_id uuid) IS 'Get detailed subscription status for a restaurant';

CREATE OR REPLACE FUNCTION public.check_restaurant_quota(rest_id uuid, quota_type text, current_usage integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  quota_limit INTEGER;
BEGIN
  IF NOT (public.request_can_access_restaurant(rest_id) OR public.is_internal_operator()) THEN
    RAISE EXCEPTION 'Not authorized to check quota for restaurant %', rest_id;
  END IF;

  SELECT
    CASE quota_type
      WHEN 'seats' THEN seat_limit
      WHEN 'storage_gb' THEN storage_limit_gb
      WHEN 'ai_calls' THEN ai_calls_limit
      WHEN 'customers_per_day' THEN customers_per_day_limit
      ELSE NULL
    END
  INTO quota_limit
  FROM tenant_subscriptions
  WHERE restaurant_id = rest_id;

  -- NULL limit means unlimited
  IF quota_limit IS NULL THEN
    RETURN true;
  END IF;

  RETURN current_usage < quota_limit;
END;
$function$;

COMMENT ON FUNCTION public.check_restaurant_quota(rest_id uuid, quota_type text, current_usage integer) IS 'Check if restaurant is within quota limits for a specific resource';

CREATE OR REPLACE FUNCTION public.update_tenant_subscriptions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_subscription_receipts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_trials_expiring_soon(days_threshold integer DEFAULT 3)
 RETURNS TABLE(subscription_id uuid, restaurant_id uuid, restaurant_name text, restaurant_email text, plan_id text, trial_ends_at timestamp with time zone, days_remaining numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to inspect expiring trials';
  END IF;

  RETURN QUERY
  SELECT
    ts.id,
    ts.restaurant_id,
    r.name,
    r.email,
    ts.plan_id,
    ts.trial_ends_at,
    EXTRACT(EPOCH FROM (ts.trial_ends_at - NOW())) / 86400.0 as days_remaining
  FROM tenant_subscriptions ts
  JOIN restaurants r ON r.id = ts.restaurant_id
  WHERE ts.status = 'trial'
  AND ts.trial_ends_at IS NOT NULL
  AND ts.trial_ends_at > NOW()
  AND ts.trial_ends_at <= NOW() + (days_threshold || ' days')::INTERVAL
  ORDER BY ts.trial_ends_at ASC;
END;
$function$;

COMMENT ON FUNCTION public.get_trials_expiring_soon(days_threshold integer) IS 'Find all trials expiring within the specified days threshold';

CREATE OR REPLACE FUNCTION public.send_trial_expiration_warnings(days_before integer DEFAULT 3)
 RETURNS TABLE(restaurant_id uuid, email_queued boolean, days_remaining numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trial_record RECORD;
  email_id UUID;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to send trial expiration warnings';
  END IF;

  FOR trial_record IN
    SELECT * FROM get_trials_expiring_soon(days_before)
  LOOP
    -- Queue email notification
    email_id := queue_email_notification(
      trial_record.restaurant_email,
      trial_record.restaurant_name,
      'trial_expiring_soon',
      jsonb_build_object(
        'restaurant_name', trial_record.restaurant_name,
        'plan_name', trial_record.plan_id,
        'trial_ends_at', trial_record.trial_ends_at,
        'days_remaining', FLOOR(trial_record.days_remaining)
      ),
      'Your trial is ending in ' || FLOOR(trial_record.days_remaining) || ' days'
    );

    restaurant_id := trial_record.restaurant_id;
    email_queued := (email_id IS NOT NULL);
    days_remaining := trial_record.days_remaining;

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.send_trial_expiration_warnings(days_before integer) IS 'Send email warnings for trials expiring soon';

CREATE OR REPLACE FUNCTION public.process_expired_trials()
 RETURNS TABLE(subscription_id uuid, restaurant_id uuid, action_taken text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  expired_trial RECORD;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to process expired trials';
  END IF;

  FOR expired_trial IN
    SELECT
      ts.id,
      ts.restaurant_id,
      r.name,
      r.email,
      ts.plan_id
    FROM tenant_subscriptions ts
    JOIN restaurants r ON r.id = ts.restaurant_id
    WHERE ts.status = 'trial'
    AND ts.trial_ends_at IS NOT NULL
    AND ts.trial_ends_at < NOW()
  LOOP
    -- Update subscription status to expired
    UPDATE tenant_subscriptions
    SET status = 'expired'
    WHERE id = expired_trial.id;

    -- Queue expiration notification email
    PERFORM queue_email_notification(
      expired_trial.email,
      expired_trial.name,
      'trial_expired',
      jsonb_build_object(
        'restaurant_name', expired_trial.name,
        'plan_id', expired_trial.plan_id
      ),
      'Your trial has expired - Subscribe to continue'
    );

    subscription_id := expired_trial.id;
    restaurant_id := expired_trial.restaurant_id;
    action_taken := 'expired_and_notified';

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.process_expired_trials() IS 'Process expired trials and send notifications';

CREATE OR REPLACE FUNCTION public.extend_trial(sub_id uuid, extension_days integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_trial_end TIMESTAMPTZ;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can extend trials';
  END IF;

  -- Get current trial end date
  SELECT trial_ends_at INTO current_trial_end
  FROM tenant_subscriptions
  WHERE id = sub_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Extend the trial
  UPDATE tenant_subscriptions
  SET
    trial_ends_at = COALESCE(current_trial_end, NOW()) + (extension_days || ' days')::INTERVAL,
    current_period_end = COALESCE(current_trial_end, NOW()) + (extension_days || ' days')::INTERVAL
  WHERE id = sub_id;

  -- If status was expired, revert to trial
  UPDATE tenant_subscriptions
  SET status = 'trial'
  WHERE id = sub_id
  AND status = 'expired';

  RETURN true;
END;
$function$;

COMMENT ON FUNCTION public.extend_trial(sub_id uuid, extension_days integer) IS 'Extend trial period by specified days (platform admin only)';

CREATE OR REPLACE FUNCTION public.get_trial_statistics()
 RETURNS TABLE(total_trials integer, expiring_today integer, expiring_this_week integer, expiring_this_month integer, expired_last_7_days integer, conversion_rate_last_30_days numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_trials INTEGER;
  v_expiring_today INTEGER;
  v_expiring_week INTEGER;
  v_expiring_month INTEGER;
  v_expired_7d INTEGER;
  v_trials_30d INTEGER;
  v_converted_30d INTEGER;
  v_conversion_rate NUMERIC;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to view trial statistics';
  END IF;

  -- Total active trials
  SELECT COUNT(*) INTO v_total_trials
  FROM tenant_subscriptions
  WHERE status = 'trial';

  -- Expiring today
  SELECT COUNT(*) INTO v_expiring_today
  FROM tenant_subscriptions
  WHERE status = 'trial'
  AND trial_ends_at::DATE = CURRENT_DATE;

  -- Expiring this week
  SELECT COUNT(*) INTO v_expiring_week
  FROM tenant_subscriptions
  WHERE status = 'trial'
  AND trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';

  -- Expiring this month
  SELECT COUNT(*) INTO v_expiring_month
  FROM tenant_subscriptions
  WHERE status = 'trial'
  AND trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '30 days';

  -- Expired in last 7 days
  SELECT COUNT(*) INTO v_expired_7d
  FROM tenant_subscriptions
  WHERE status = 'expired'
  AND trial_ends_at BETWEEN NOW() - INTERVAL '7 days' AND NOW();

  -- Conversion rate (last 30 days)
  SELECT COUNT(*) INTO v_trials_30d
  FROM tenant_subscriptions
  WHERE trial_ends_at BETWEEN NOW() - INTERVAL '30 days' AND NOW();

  SELECT COUNT(*) INTO v_converted_30d
  FROM tenant_subscriptions
  WHERE trial_ends_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
  AND status = 'active'
  AND activated_at IS NOT NULL;

  IF v_trials_30d > 0 THEN
    v_conversion_rate := (v_converted_30d::NUMERIC / v_trials_30d::NUMERIC) * 100;
  ELSE
    v_conversion_rate := 0;
  END IF;

  total_trials := v_total_trials;
  expiring_today := v_expiring_today;
  expiring_this_week := v_expiring_week;
  expiring_this_month := v_expiring_month;
  expired_last_7_days := v_expired_7d;
  conversion_rate_last_30_days := v_conversion_rate;

  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.get_trial_statistics() IS 'Get comprehensive trial statistics for dashboard';
