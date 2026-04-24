-- 60_platform_admin_support/functions.sql
-- Canonical baseline generated from the verified local Supabase state.

\echo '60_platform_admin_support/functions.sql'

CREATE OR REPLACE FUNCTION public.is_platform_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = check_user_id
    AND is_active = true
  );
END;
$function$;

COMMENT ON FUNCTION public.is_platform_admin(check_user_id uuid) IS 'Check if a user is an active platform administrator';

CREATE OR REPLACE FUNCTION public.check_is_platform_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN is_platform_admin(auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_internal_operator()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_platform_admin() OR public.is_service_role();
$function$;

COMMENT ON FUNCTION public.is_internal_operator() IS 'Allow privileged internal jobs via service role while still permitting platform admin initiated RPC calls';

CREATE OR REPLACE FUNCTION public.get_platform_admin_permissions(check_user_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_permissions JSONB;
BEGIN
  IF check_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to inspect another platform admin''s permissions';
  END IF;

  SELECT permissions INTO admin_permissions
  FROM platform_admins
  WHERE user_id = check_user_id
  AND is_active = true;

  RETURN COALESCE(admin_permissions, '{}'::jsonb);
END;
$function$;

COMMENT ON FUNCTION public.get_platform_admin_permissions(check_user_id uuid) IS 'Get permissions for a platform administrator';

CREATE OR REPLACE FUNCTION public.queue_email_notification(p_recipient_email text, p_recipient_name text, p_template_name text, p_template_data jsonb, p_subject text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to queue email notifications';
  END IF;

  INSERT INTO email_notifications (
    recipient_email,
    recipient_name,
    template_name,
    template_data,
    subject
  ) VALUES (
    p_recipient_email,
    p_recipient_name,
    p_template_name,
    p_template_data,
    p_subject
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$function$;

COMMENT ON FUNCTION public.queue_email_notification(p_recipient_email text, p_recipient_name text, p_template_name text, p_template_data jsonb, p_subject text) IS 'Queue an email notification for async sending';

CREATE OR REPLACE FUNCTION public.trigger_restaurant_verified_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only send if restaurant just got verified (wasn't verified before)
  IF NEW.is_verified = true
    AND (OLD.is_verified = false OR OLD.is_verified IS NULL)
    AND NEW.email IS NOT NULL
  THEN
    PERFORM queue_email_notification(
      NEW.email,
      NEW.name,
      'restaurant_approved',
      jsonb_build_object(
        'restaurant_name', NEW.name,
        'subdomain', NEW.subdomain,
        'verification_date', NEW.verified_at
      ),
      'Your restaurant has been approved!'
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_restaurant_rejection_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If restaurant was not verified and is being deleted, send rejection email
  IF OLD.is_verified = false THEN
    PERFORM queue_email_notification(
      OLD.email,
      OLD.name,
      'restaurant_rejected',
      jsonb_build_object(
        'restaurant_name', OLD.name,
        'rejection_date', NOW()
      ),
      'Update regarding your restaurant application'
    );
  END IF;

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_restaurant_suspended_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only send if restaurant just got suspended
  IF NEW.suspended_at IS NOT NULL AND OLD.suspended_at IS NULL THEN
    PERFORM queue_email_notification(
      NEW.email,
      NEW.name,
      'restaurant_suspended',
      jsonb_build_object(
        'restaurant_name', NEW.name,
        'suspend_reason', NEW.suspend_reason,
        'suspended_at', NEW.suspended_at
      ),
      'Important: Your restaurant account has been suspended'
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_restaurant_unsuspended_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only send if restaurant just got unsuspended
  IF NEW.suspended_at IS NULL AND OLD.suspended_at IS NOT NULL THEN
    PERFORM queue_email_notification(
      NEW.email,
      NEW.name,
      'restaurant_unsuspended',
      jsonb_build_object(
        'restaurant_name', NEW.name,
        'unsuspended_at', NOW()
      ),
      'Your restaurant account has been reactivated'
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_restaurant_verification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If verified_at is set and is_verified is false, update it
  IF NEW.verified_at IS NOT NULL AND NEW.is_verified = false THEN
    NEW.is_verified = true;
  END IF;

  -- If verified_at is null and is_verified is true, clear it
  IF NEW.verified_at IS NULL AND NEW.is_verified = true THEN
    NEW.is_verified = false;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_platform_action(p_action text, p_resource_type text, p_resource_id uuid DEFAULT NULL::uuid, p_restaurant_id uuid DEFAULT NULL::uuid, p_changes jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id UUID;
  v_log_id UUID;
BEGIN
  -- Get the platform admin ID for current user
  SELECT id INTO v_admin_id
  FROM platform_admins
  WHERE user_id = auth.uid()
  AND is_active = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not a platform admin';
  END IF;

  -- Insert audit log
  INSERT INTO platform_audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    restaurant_id,
    changes
  ) VALUES (
    v_admin_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_restaurant_id,
    p_changes
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$;

COMMENT ON FUNCTION public.log_platform_action(p_action text, p_resource_type text, p_resource_id uuid, p_restaurant_id uuid, p_changes jsonb) IS 'Log a platform admin action to the audit trail';

CREATE OR REPLACE FUNCTION public.get_platform_restaurant_summary(rest_id uuid)
 RETURNS TABLE(restaurant_id uuid, restaurant_name text, subdomain text, owner_email text, is_active boolean, is_verified boolean, verified_at timestamp with time zone, created_at timestamp with time zone, subscription_plan text, subscription_status text, trial_ends_at timestamp with time zone, total_staff integer, total_orders_30d bigint, total_revenue_30d numeric, last_order_at timestamp with time zone, support_tickets_open integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.subdomain,
    r.email,
    r.is_active,
    r.is_verified,
    r.verified_at,
    r.created_at,
    ts.plan_id,
    ts.status,
    ts.trial_ends_at,
    (SELECT COUNT(*)::INTEGER FROM users WHERE restaurant_id = r.id),
    (SELECT COUNT(*) FROM tenant_usage_snapshots tus
     WHERE tus.restaurant_id = r.id
     AND tus.snapshot_date >= CURRENT_DATE - 30),
    (SELECT SUM(total_revenue) FROM tenant_usage_snapshots tus
     WHERE tus.restaurant_id = r.id
     AND tus.snapshot_date >= CURRENT_DATE - 30),
    (SELECT MAX(created_at) FROM orders WHERE restaurant_id = r.id),
    (SELECT COUNT(*)::INTEGER FROM support_tickets st
     WHERE st.restaurant_id = r.id
     AND st.status NOT IN ('resolved', 'closed'))
  FROM restaurants r
  LEFT JOIN tenant_subscriptions ts ON ts.restaurant_id = r.id
  WHERE r.id = rest_id;
END;
$function$;

COMMENT ON FUNCTION public.get_platform_restaurant_summary(rest_id uuid) IS 'Get comprehensive summary of a restaurant for platform admins';

CREATE OR REPLACE FUNCTION public.verify_restaurant(rest_id uuid, admin_id uuid, notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can verify restaurants';
  END IF;

  -- Get the user_id from platform_admins
  SELECT user_id INTO admin_user_id
  FROM platform_admins
  WHERE id = admin_id;

  -- Update restaurant
  UPDATE restaurants
  SET
    is_verified = true,
    verified_at = NOW(),
    verified_by = admin_id,
    verification_notes = notes
  WHERE id = rest_id;

  RETURN FOUND;
END;
$function$;

COMMENT ON FUNCTION public.verify_restaurant(rest_id uuid, admin_id uuid, notes text) IS 'Verify a restaurant (platform admin only)
';

CREATE OR REPLACE FUNCTION public.suspend_restaurant(rest_id uuid, admin_id uuid, reason text, notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can suspend restaurants';
  END IF;

  -- Update restaurant
  UPDATE restaurants
  SET
    is_active = false,
    suspended_at = NOW(),
    suspended_by = admin_id,
    suspend_reason = reason,
    suspend_notes = notes
  WHERE id = rest_id;

  -- Update subscription status
  UPDATE tenant_subscriptions
  SET status = 'paused'
  WHERE restaurant_id = rest_id
  AND status IN ('trial', 'active');

  RETURN FOUND;
END;
$function$;

COMMENT ON FUNCTION public.suspend_restaurant(rest_id uuid, admin_id uuid, reason text, notes text) IS 'Suspend a restaurant (platform admin only)';

CREATE OR REPLACE FUNCTION public.unsuspend_restaurant(rest_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can unsuspend restaurants';
  END IF;

  -- Update restaurant
  UPDATE restaurants
  SET
    is_active = true,
    suspended_at = NULL,
    suspended_by = NULL,
    suspend_reason = NULL,
    suspend_notes = NULL
  WHERE id = rest_id;

  -- Restore subscription status
  UPDATE tenant_subscriptions
  SET status = CASE
    WHEN trial_ends_at > NOW() THEN 'trial'
    WHEN current_period_end > NOW() THEN 'active'
    ELSE 'expired'
  END
  WHERE restaurant_id = rest_id
  AND status = 'paused';

  RETURN FOUND;
END;
$function$;

COMMENT ON FUNCTION public.unsuspend_restaurant(rest_id uuid) IS 'Unsuspend a restaurant (platform admin only)';

CREATE OR REPLACE FUNCTION public.update_support_tickets_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_first_response_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.posted_by_type = 'platform_admin' THEN
    UPDATE support_tickets
    SET first_response_at = COALESCE(first_response_at, NEW.created_at)
    WHERE id = NEW.ticket_id
    AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_support_ticket_summary(rest_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_tickets bigint, new_tickets bigint, investigating_tickets bigint, waiting_customer_tickets bigint, resolved_tickets bigint, closed_tickets bigint, sla_breached_tickets bigint, avg_resolution_time_hours numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access support ticket summary';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) as total_tickets,
    COUNT(*) FILTER (WHERE status = 'new') as new_tickets,
    COUNT(*) FILTER (WHERE status = 'investigating') as investigating_tickets,
    COUNT(*) FILTER (WHERE status = 'waiting_customer') as waiting_customer_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
    COUNT(*) FILTER (WHERE resolution_sla_breach = true) as sla_breached_tickets,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_hours
  FROM support_tickets
  WHERE rest_id IS NULL OR restaurant_id = rest_id;
END;
$function$;

COMMENT ON FUNCTION public.get_support_ticket_summary(rest_id uuid) IS 'Get summary statistics for support tickets';

CREATE OR REPLACE FUNCTION public.reject_restaurant_application(rest_id uuid, admin_id uuid, rejection_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_restaurant RECORD;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can reject applications';
  END IF;

  -- Get restaurant details
  SELECT * INTO v_restaurant
  FROM restaurants
  WHERE id = rest_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Queue rejection email
  PERFORM queue_email_notification(
    v_restaurant.email,
    v_restaurant.name,
    'restaurant_rejected',
    jsonb_build_object(
      'restaurant_name', v_restaurant.name,
      'rejection_reason', rejection_reason,
      'rejection_date', NOW()
    ),
    'Update regarding your restaurant application'
  );

  -- Log the rejection
  PERFORM log_platform_action(
    'reject_restaurant_application',
    'restaurant',
    rest_id,
    rest_id,
    jsonb_build_object('reason', rejection_reason)
  );

  -- Mark as inactive instead of deleting
  UPDATE restaurants
  SET
    is_active = false,
    platform_notes = COALESCE(platform_notes || E'\n\n', '') ||
      'Rejected: ' || rejection_reason || ' (by admin ' || admin_id::text || ' at ' || NOW()::text || ')'
  WHERE id = rest_id;

  RETURN true;
END;
$function$;

COMMENT ON FUNCTION public.reject_restaurant_application(rest_id uuid, admin_id uuid, rejection_reason text) IS 'Reject a restaurant application and send notification email';

CREATE OR REPLACE FUNCTION public.set_ticket_sla_targets()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  sla_settings RECORD;
BEGIN
  -- Get SLA settings for this priority
  SELECT * INTO sla_settings
  FROM sla_config
  WHERE ticket_priority = NEW.priority;

  IF FOUND THEN
    -- Set resolution SLA target
    NEW.resolution_sla_target := NEW.created_at + (sla_settings.resolution_hours || ' hours')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_ticket_sla_targets()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  sla_settings RECORD;
BEGIN
  -- Only update if priority changed
  IF NEW.priority != OLD.priority THEN
    -- Get new SLA settings
    SELECT * INTO sla_settings
    FROM sla_config
    WHERE ticket_priority = NEW.priority;

    IF FOUND THEN
      -- Recalculate resolution SLA based on new priority
      NEW.resolution_sla_target := OLD.created_at + (sla_settings.resolution_hours || ' hours')::INTERVAL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_sla_breaches()
 RETURNS TABLE(ticket_id uuid, ticket_number integer, breach_type text, breach_time interval)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ticket_record RECORD;
  sla_settings RECORD;
  first_response_deadline TIMESTAMPTZ;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to check SLA breaches';
  END IF;

  FOR ticket_record IN
    SELECT
      st.id,
      st.ticket_number,
      st.priority,
      st.status,
      st.created_at,
      st.first_response_at,
      st.first_response_sla_breach,
      st.resolution_sla_target,
      st.resolution_sla_breach,
      st.resolved_at
    FROM support_tickets st
    WHERE st.status NOT IN ('resolved', 'closed')
  LOOP
    -- Get SLA settings for this priority
    SELECT * INTO sla_settings
    FROM sla_config
    WHERE ticket_priority = ticket_record.priority;

    IF FOUND THEN
      -- Check first response SLA
      IF ticket_record.first_response_at IS NULL THEN
        first_response_deadline := ticket_record.created_at + (sla_settings.first_response_hours || ' hours')::INTERVAL;

        IF NOW() > first_response_deadline AND NOT ticket_record.first_response_sla_breach THEN
          -- Flag first response SLA breach
          UPDATE support_tickets
          SET first_response_sla_breach = true
          WHERE id = ticket_record.id;

          ticket_id := ticket_record.id;
          ticket_number := ticket_record.ticket_number;
          breach_type := 'first_response';
          breach_time := NOW() - first_response_deadline;

          RETURN NEXT;
        END IF;
      END IF;

      -- Check resolution SLA
      IF ticket_record.resolved_at IS NULL AND ticket_record.resolution_sla_target IS NOT NULL THEN
        IF NOW() > ticket_record.resolution_sla_target AND NOT ticket_record.resolution_sla_breach THEN
          -- Flag resolution SLA breach
          UPDATE support_tickets
          SET resolution_sla_breach = true
          WHERE id = ticket_record.id;

          ticket_id := ticket_record.id;
          ticket_number := ticket_record.ticket_number;
          breach_type := 'resolution';
          breach_time := NOW() - ticket_record.resolution_sla_target;

          RETURN NEXT;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.check_sla_breaches() IS 'Check for SLA breaches and flag tickets';

CREATE OR REPLACE FUNCTION public.auto_escalate_tickets()
 RETURNS TABLE(ticket_id uuid, old_priority text, new_priority text, escalation_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ticket_record RECORD;
  new_priority_value TEXT;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to auto-escalate support tickets';
  END IF;

  FOR ticket_record IN
    SELECT
      st.id,
      st.priority,
      st.status,
      st.resolution_sla_breach,
      st.first_response_sla_breach,
      st.created_at
    FROM support_tickets st
    WHERE st.status NOT IN ('resolved', 'closed')
    AND (st.resolution_sla_breach = true OR st.first_response_sla_breach = true)
  LOOP
    -- Escalate priority
    new_priority_value := CASE ticket_record.priority
      WHEN 'low' THEN 'medium'
      WHEN 'medium' THEN 'high'
      WHEN 'high' THEN 'urgent'
      ELSE 'urgent'
    END;

    -- Only escalate if priority can be increased
    IF new_priority_value != ticket_record.priority THEN
      UPDATE support_tickets
      SET priority = new_priority_value
      WHERE id = ticket_record.id;

      -- Create internal note about escalation
      INSERT INTO support_ticket_messages (
        ticket_id,
        message,
        posted_by_type,
        is_internal_note
      ) VALUES (
        ticket_record.id,
        'Ticket automatically escalated from ' || ticket_record.priority || ' to ' || new_priority_value || ' due to SLA breach.',
        'system',
        true
      );

      ticket_id := ticket_record.id;
      old_priority := ticket_record.priority;
      new_priority := new_priority_value;
      escalation_reason := 'sla_breach';

      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.auto_escalate_tickets() IS 'Automatically escalate tickets that have breached SLA';

CREATE OR REPLACE FUNCTION public.get_sla_performance(days_back integer DEFAULT 30)
 RETURNS TABLE(total_tickets integer, first_response_on_time integer, first_response_breached integer, first_response_rate numeric, resolution_on_time integer, resolution_breached integer, resolution_rate numeric, avg_first_response_hours numeric, avg_resolution_hours numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total INTEGER;
  v_fr_on_time INTEGER;
  v_fr_breach INTEGER;
  v_res_on_time INTEGER;
  v_res_breach INTEGER;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access SLA performance';
  END IF;

  -- Total tickets in period
  SELECT COUNT(*) INTO v_total
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL;

  -- First response stats
  SELECT COUNT(*) INTO v_fr_on_time
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND first_response_sla_breach = false
  AND first_response_at IS NOT NULL;

  SELECT COUNT(*) INTO v_fr_breach
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND first_response_sla_breach = true;

  -- Resolution stats
  SELECT COUNT(*) INTO v_res_on_time
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND resolution_sla_breach = false
  AND resolved_at IS NOT NULL;

  SELECT COUNT(*) INTO v_res_breach
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND resolution_sla_breach = true;

  -- Return results
  total_tickets := v_total;
  first_response_on_time := v_fr_on_time;
  first_response_breached := v_fr_breach;
  first_response_rate := CASE WHEN (v_fr_on_time + v_fr_breach) > 0
    THEN (v_fr_on_time::NUMERIC / (v_fr_on_time + v_fr_breach)::NUMERIC) * 100
    ELSE 0
  END;

  resolution_on_time := v_res_on_time;
  resolution_breached := v_res_breach;
  resolution_rate := CASE WHEN (v_res_on_time + v_res_breach) > 0
    THEN (v_res_on_time::NUMERIC / (v_res_on_time + v_res_breach)::NUMERIC) * 100
    ELSE 0
  END;

  -- Average times
  SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600.0) INTO avg_first_response_hours
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND first_response_at IS NOT NULL;

  SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) INTO avg_resolution_hours
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND resolved_at IS NOT NULL;

  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.get_sla_performance(days_back integer) IS 'Get SLA performance metrics for dashboard';

CREATE OR REPLACE FUNCTION public.calculate_daily_usage_snapshot(rest_id uuid, target_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_orders integer := 0;
  v_total_order_items integer := 0;
  v_total_revenue numeric(12,2) := 0;
  v_unique_customers integer := 0;
  v_active_staff_count integer := 0;
  v_total_staff_hours numeric(10,2) := 0;
  v_ai_calls_count integer := 0;
  v_print_jobs_count integer := 0;
  v_timezone text := 'Asia/Tokyo';
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to calculate daily usage snapshots';
  END IF;

  SELECT COALESCE(timezone, 'Asia/Tokyo')
  INTO v_timezone
  FROM restaurants
  WHERE id = rest_id;

  v_day_start := (target_date::timestamp AT TIME ZONE v_timezone);
  v_day_end := ((target_date + INTERVAL '1 day')::timestamp AT TIME ZONE v_timezone);

  SELECT
    COUNT(DISTINCT o.id),
    COUNT(oi.id),
    COALESCE(SUM(oi.price_at_order * oi.quantity), 0),
    COUNT(DISTINCT o.session_id)
  INTO
    v_total_orders,
    v_total_order_items,
    v_total_revenue,
    v_unique_customers
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.restaurant_id = rest_id
    AND o.created_at >= v_day_start
    AND o.created_at < v_day_end;

  SELECT
    COUNT(DISTINCT ads.employee_id),
    COALESCE(SUM(ads.total_hours), 0)
  INTO
    v_active_staff_count,
    v_total_staff_hours
  FROM attendance_daily_summaries ads
  WHERE ads.restaurant_id = rest_id
    AND ads.work_date = target_date
    AND ads.status IN ('pending', 'approved', 'correction_pending');

  SELECT COUNT(*)
  INTO v_ai_calls_count
  FROM logs
  WHERE restaurant_id = rest_id
    AND created_at >= v_day_start
    AND created_at < v_day_end
    AND (
      endpoint LIKE '%/api/v1/ai/%'
      OR message LIKE '%AI%'
      OR message LIKE '%Gemini%'
    );

  v_print_jobs_count := COALESCE(v_total_orders, 0);

  INSERT INTO tenant_usage_snapshots (
    restaurant_id,
    snapshot_date,
    total_orders,
    total_order_items,
    total_revenue,
    unique_customers,
    active_staff_count,
    total_staff_hours,
    ai_calls_count,
    print_jobs_count
  ) VALUES (
    rest_id,
    target_date,
    v_total_orders,
    v_total_order_items,
    v_total_revenue,
    v_unique_customers,
    v_active_staff_count,
    v_total_staff_hours,
    v_ai_calls_count,
    v_print_jobs_count
  )
  ON CONFLICT (restaurant_id, snapshot_date)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_order_items = EXCLUDED.total_order_items,
    total_revenue = EXCLUDED.total_revenue,
    unique_customers = EXCLUDED.unique_customers,
    active_staff_count = EXCLUDED.active_staff_count,
    total_staff_hours = EXCLUDED.total_staff_hours,
    ai_calls_count = EXCLUDED.ai_calls_count,
    print_jobs_count = EXCLUDED.print_jobs_count;
END;
$function$;

COMMENT ON FUNCTION public.calculate_daily_usage_snapshot(rest_id uuid, target_date date) IS 'Calculate and store daily usage snapshot for a restaurant';

CREATE OR REPLACE FUNCTION public.calculate_all_usage_snapshots(target_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  restaurant_record record;
  processed_count integer := 0;
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to calculate usage snapshots';
  END IF;

  FOR restaurant_record IN
    SELECT id
    FROM restaurants
    WHERE is_active = true
  LOOP
    PERFORM calculate_daily_usage_snapshot(restaurant_record.id, target_date);
    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$function$;

COMMENT ON FUNCTION public.calculate_all_usage_snapshots(target_date date) IS 'Calculate usage snapshots for all active restaurants';

CREATE OR REPLACE FUNCTION public.get_usage_trends(rest_id uuid, days_back integer DEFAULT 30)
 RETURNS TABLE(snapshot_date date, total_orders integer, total_revenue numeric, unique_customers integer, ai_calls_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access usage trends';
  END IF;

  RETURN QUERY
  SELECT
    tus.snapshot_date,
    tus.total_orders,
    tus.total_revenue,
    tus.unique_customers,
    tus.ai_calls_count
  FROM tenant_usage_snapshots tus
  WHERE tus.restaurant_id = rest_id
  AND tus.snapshot_date >= CURRENT_DATE - days_back
  ORDER BY tus.snapshot_date DESC;
END;
$function$;

COMMENT ON FUNCTION public.get_usage_trends(rest_id uuid, days_back integer) IS 'Get usage trends for a restaurant over time';

CREATE OR REPLACE FUNCTION public.get_platform_usage_summary(target_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(total_restaurants bigint, total_orders bigint, total_revenue numeric, total_customers bigint, total_ai_calls bigint, avg_orders_per_restaurant numeric, avg_revenue_per_restaurant numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access platform usage summary';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(DISTINCT tus.restaurant_id),
    SUM(tus.total_orders),
    SUM(tus.total_revenue),
    SUM(tus.unique_customers),
    SUM(tus.ai_calls_count),
    AVG(tus.total_orders),
    AVG(tus.total_revenue)
  FROM tenant_usage_snapshots tus
  WHERE tus.snapshot_date = target_date;
END;
$function$;

COMMENT ON FUNCTION public.get_platform_usage_summary(target_date date) IS 'Get aggregated platform-wide usage summary';

CREATE OR REPLACE FUNCTION public.get_platform_usage_trends(p_start_date date, p_end_date date, p_restaurant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(snapshot_date date, total_orders bigint, total_revenue numeric, unique_customers bigint, ai_calls_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access platform usage trends';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'Start date and end date are required';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      LEAST(p_start_date, p_end_date) AS start_date,
      GREATEST(p_start_date, p_end_date) AS end_date
  ),
  date_series AS (
    SELECT generate_series(bounds.start_date, bounds.end_date, '1 day'::interval)::date AS snapshot_date
    FROM bounds
  ),
  usage_by_day AS (
    SELECT
      tus.snapshot_date,
      SUM(tus.total_orders)::bigint AS total_orders,
      COALESCE(SUM(tus.total_revenue), 0)::numeric AS total_revenue,
      SUM(tus.unique_customers)::bigint AS unique_customers,
      SUM(tus.ai_calls_count)::bigint AS ai_calls_count
    FROM public.tenant_usage_snapshots tus
    JOIN bounds
      ON tus.snapshot_date BETWEEN bounds.start_date AND bounds.end_date
    WHERE p_restaurant_id IS NULL OR tus.restaurant_id = p_restaurant_id
    GROUP BY tus.snapshot_date
  )
  SELECT
    date_series.snapshot_date,
    COALESCE(usage_by_day.total_orders, 0)::bigint AS total_orders,
    COALESCE(usage_by_day.total_revenue, 0)::numeric AS total_revenue,
    COALESCE(usage_by_day.unique_customers, 0)::bigint AS unique_customers,
    COALESCE(usage_by_day.ai_calls_count, 0)::bigint AS ai_calls_count
  FROM date_series
  LEFT JOIN usage_by_day
    ON usage_by_day.snapshot_date = date_series.snapshot_date
  ORDER BY date_series.snapshot_date;
END;
$function$;

COMMENT ON FUNCTION public.get_platform_usage_trends(p_start_date date, p_end_date date, p_restaurant_id uuid) IS 'Get daily usage totals for the platform or a single restaurant over a date range';

CREATE OR REPLACE FUNCTION public.get_platform_overview_summary(p_period_start date DEFAULT (CURRENT_DATE - 30), p_target_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(total_tenants bigint, new_signups bigint, suspended_tenants bigint, on_trial bigint, active_subscribers bigint, canceled_in_period bigint, total_mrr numeric, total_arr numeric, total_tickets bigint, new_tickets bigint, resolved_tickets bigint, closed_tickets bigint, sla_breached_tickets bigint, avg_resolution_time_hours numeric, total_orders bigint, total_customers bigint, total_ai_calls bigint, avg_orders_per_restaurant numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access platform overview summary';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      LEAST(p_period_start, p_target_date) AS period_start,
      GREATEST(p_period_start, p_target_date) AS target_date
  ),
  tenant_summary AS (
    SELECT
      COUNT(*)::bigint AS total_tenants,
      COUNT(*) FILTER (WHERE created_at::date >= bounds.period_start)::bigint AS new_signups,
      COUNT(*) FILTER (WHERE suspended_at IS NOT NULL)::bigint AS suspended_tenants
    FROM public.restaurants
    CROSS JOIN bounds
  ),
  subscription_summary AS (
    SELECT
      COUNT(*) FILTER (WHERE ts.status = 'trial')::bigint AS on_trial,
      COUNT(*) FILTER (WHERE ts.status = 'active')::bigint AS active_subscribers,
      COUNT(*) FILTER (WHERE ts.canceled_at::date >= bounds.period_start)::bigint AS canceled_in_period,
      COALESCE(
        SUM(
          CASE
            WHEN ts.status = 'active' AND ts.billing_cycle = 'yearly' THEN sp.price_yearly / 12
            WHEN ts.status = 'active' THEN sp.price_monthly
            ELSE 0
          END
        ),
        0
      )::numeric AS total_mrr,
      COALESCE(
        SUM(
          CASE
            WHEN ts.status = 'active' AND ts.billing_cycle = 'yearly' THEN sp.price_yearly
            WHEN ts.status = 'active' THEN sp.price_monthly * 12
            ELSE 0
          END
        ),
        0
      )::numeric AS total_arr
    FROM public.tenant_subscriptions ts
    LEFT JOIN public.subscription_plans sp
      ON sp.id = ts.plan_id
    CROSS JOIN bounds
  ),
  support_summary AS (
    SELECT
      COUNT(*)::bigint AS total_tickets,
      COUNT(*) FILTER (WHERE status = 'new')::bigint AS new_tickets,
      COUNT(*) FILTER (WHERE status = 'resolved')::bigint AS resolved_tickets,
      COUNT(*) FILTER (WHERE status = 'closed')::bigint AS closed_tickets,
      COUNT(*) FILTER (WHERE resolution_sla_breach = true)::bigint AS sla_breached_tickets,
      COALESCE(
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) FILTER (WHERE resolved_at IS NOT NULL),
        0
      )::numeric AS avg_resolution_time_hours
    FROM public.support_tickets
  ),
  usage_summary AS (
    SELECT
      COALESCE(summary.total_orders, 0)::bigint AS total_orders,
      COALESCE(summary.total_customers, 0)::bigint AS total_customers,
      COALESCE(summary.total_ai_calls, 0)::bigint AS total_ai_calls,
      COALESCE(summary.avg_orders_per_restaurant, 0)::numeric AS avg_orders_per_restaurant
    FROM bounds
    LEFT JOIN LATERAL public.get_platform_usage_summary(bounds.target_date) AS summary
      ON true
  )
  SELECT
    tenant_summary.total_tenants,
    tenant_summary.new_signups,
    tenant_summary.suspended_tenants,
    subscription_summary.on_trial,
    subscription_summary.active_subscribers,
    subscription_summary.canceled_in_period,
    subscription_summary.total_mrr,
    subscription_summary.total_arr,
    support_summary.total_tickets,
    support_summary.new_tickets,
    support_summary.resolved_tickets,
    support_summary.closed_tickets,
    support_summary.sla_breached_tickets,
    support_summary.avg_resolution_time_hours,
    usage_summary.total_orders,
    usage_summary.total_customers,
    usage_summary.total_ai_calls,
    usage_summary.avg_orders_per_restaurant
  FROM tenant_summary
  CROSS JOIN subscription_summary
  CROSS JOIN support_summary
  CROSS JOIN usage_summary;
END;
$function$;

COMMENT ON FUNCTION public.get_platform_overview_summary(p_period_start date, p_target_date date) IS 'Get platform-wide tenant, revenue, support, and usage summary metrics for the dashboard overview';

CREATE OR REPLACE FUNCTION public.get_platform_overview_trends(p_period_start date DEFAULT (CURRENT_DATE - 30), p_target_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(snapshot_date date, signups bigint, orders bigint, revenue numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_internal_operator() THEN
    RAISE EXCEPTION 'Not authorized to access platform overview trends';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      LEAST(p_period_start, p_target_date) AS period_start,
      GREATEST(p_period_start, p_target_date) AS target_date
  ),
  date_series AS (
    SELECT generate_series(bounds.period_start, bounds.target_date, '1 day'::interval)::date AS snapshot_date
    FROM bounds
  ),
  signups_by_day AS (
    SELECT
      restaurants.created_at::date AS snapshot_date,
      COUNT(*)::bigint AS signups
    FROM public.restaurants
    CROSS JOIN bounds
    WHERE restaurants.created_at::date BETWEEN bounds.period_start AND bounds.target_date
    GROUP BY restaurants.created_at::date
  ),
  usage_by_day AS (
    SELECT
      tus.snapshot_date,
      SUM(tus.total_orders)::bigint AS orders,
      COALESCE(SUM(tus.total_revenue), 0)::numeric AS revenue
    FROM public.tenant_usage_snapshots tus
    CROSS JOIN bounds
    WHERE tus.snapshot_date BETWEEN bounds.period_start AND bounds.target_date
    GROUP BY tus.snapshot_date
  )
  SELECT
    date_series.snapshot_date,
    COALESCE(signups_by_day.signups, 0)::bigint AS signups,
    COALESCE(usage_by_day.orders, 0)::bigint AS orders,
    COALESCE(usage_by_day.revenue, 0)::numeric AS revenue
  FROM date_series
  LEFT JOIN signups_by_day
    ON signups_by_day.snapshot_date = date_series.snapshot_date
  LEFT JOIN usage_by_day
    ON usage_by_day.snapshot_date = date_series.snapshot_date
  ORDER BY date_series.snapshot_date;
END;
$function$;

COMMENT ON FUNCTION public.get_platform_overview_trends(p_period_start date, p_target_date date) IS 'Get daily signups, orders, and revenue trend points for the platform overview dashboard';

CREATE OR REPLACE FUNCTION public.get_top_seller_for_day(p_restaurant_id uuid, p_date text)
 RETURNS TABLE(name_en text, name_ja text, name_vi text, total_sold bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        mi.name_en,
        mi.name_ja,
        mi.name_vi,
        SUM(oi.quantity) AS total_sold
    FROM
        order_items oi
    JOIN
        orders o ON oi.order_id = o.id
    JOIN
        menu_items mi ON oi.menu_item_id = mi.id
    WHERE
        o.restaurant_id = p_restaurant_id AND
        o.created_at::date = p_date::date
    GROUP BY
        mi.id,
        mi.name_en,
        mi.name_ja,
        mi.name_vi
    ORDER BY
        total_sold DESC
    LIMIT 1;
END;
$function$;
