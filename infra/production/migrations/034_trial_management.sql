-- Migration: Trial Management Functions
-- Description: Trial expiration checking, notifications, and auto-conversion
-- Phase: 3 - Workflows & Automation

-- Function to find trials expiring soon
CREATE OR REPLACE FUNCTION get_trials_expiring_soon(days_threshold INTEGER DEFAULT 3)
RETURNS TABLE (
  subscription_id UUID,
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_email TEXT,
  plan_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  days_remaining NUMERIC
) AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send trial expiration warnings
CREATE OR REPLACE FUNCTION send_trial_expiration_warnings(days_before INTEGER DEFAULT 3)
RETURNS TABLE (
  restaurant_id UUID,
  email_queued BOOLEAN,
  days_remaining NUMERIC
) AS $$
DECLARE
  trial_record RECORD;
  email_id UUID;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle expired trials
CREATE OR REPLACE FUNCTION process_expired_trials()
RETURNS TABLE (
  subscription_id UUID,
  restaurant_id UUID,
  action_taken TEXT
) AS $$
DECLARE
  expired_trial RECORD;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend trial period
CREATE OR REPLACE FUNCTION extend_trial(
  sub_id UUID,
  extension_days INTEGER
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trial statistics
CREATE OR REPLACE FUNCTION get_trial_statistics()
RETURNS TABLE (
  total_trials INTEGER,
  expiring_today INTEGER,
  expiring_this_week INTEGER,
  expiring_this_month INTEGER,
  expired_last_7_days INTEGER,
  conversion_rate_last_30_days NUMERIC
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION get_trials_expiring_soon IS 'Find all trials expiring within the specified days threshold';
COMMENT ON FUNCTION send_trial_expiration_warnings IS 'Send email warnings for trials expiring soon';
COMMENT ON FUNCTION process_expired_trials IS 'Process expired trials and send notifications';
COMMENT ON FUNCTION extend_trial IS 'Extend trial period by specified days (platform admin only)';
COMMENT ON FUNCTION get_trial_statistics IS 'Get comprehensive trial statistics for dashboard';
