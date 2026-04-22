-- Keep organization branch access and reporting aligned with the canonical
-- Supabase foundation.

CREATE OR REPLACE FUNCTION public.get_organization_branch_overview(p_restaurant_ids uuid[], p_target_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(restaurant_id uuid, today_revenue numeric, open_orders_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(array_length(p_restaurant_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  IF NOT public.is_service_role() THEN
    IF EXISTS (
      SELECT 1
      FROM unnest(p_restaurant_ids) AS requested_restaurant(restaurant_id)
      WHERE NOT public.is_org_member_for_restaurant(requested_restaurant.restaurant_id)
    ) THEN
      RAISE EXCEPTION 'Not authorized to access one or more branches';
    END IF;
  END IF;

  RETURN QUERY
  WITH requested_restaurants AS (
    SELECT unnest(p_restaurant_ids) AS restaurant_id
  ),
  daily_sales AS (
    SELECT
      orders.restaurant_id,
      COALESCE(SUM(orders.total_amount), 0)::numeric AS today_revenue
    FROM public.orders
    WHERE orders.restaurant_id = ANY (p_restaurant_ids)
      AND orders.status = 'completed'
      AND orders.created_at >= p_target_date::timestamp with time zone
      AND orders.created_at < (p_target_date + 1)::timestamp with time zone
    GROUP BY orders.restaurant_id
  ),
  open_orders AS (
    SELECT
      orders.restaurant_id,
      COUNT(*)::bigint AS open_orders_count
    FROM public.orders
    WHERE orders.restaurant_id = ANY (p_restaurant_ids)
      AND orders.status NOT IN ('completed', 'canceled')
    GROUP BY orders.restaurant_id
  )
  SELECT
    requested_restaurants.restaurant_id,
    COALESCE(daily_sales.today_revenue, 0)::numeric AS today_revenue,
    COALESCE(open_orders.open_orders_count, 0)::bigint AS open_orders_count
  FROM requested_restaurants
  LEFT JOIN daily_sales
    ON daily_sales.restaurant_id = requested_restaurants.restaurant_id
  LEFT JOIN open_orders
    ON open_orders.restaurant_id = requested_restaurants.restaurant_id
  ORDER BY requested_restaurants.restaurant_id;
END;
$function$;

COMMENT ON FUNCTION public.get_organization_branch_overview(p_restaurant_ids uuid[], p_target_date date) IS 'Return branch-level daily revenue and open-order counts for an authorized organization scope';

GRANT EXECUTE ON FUNCTION public.get_organization_branch_overview(uuid[], date) TO authenticated, service_role;

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

GRANT EXECUTE ON FUNCTION public.get_platform_usage_trends(date, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_overview_summary(date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_overview_trends(date, date) TO authenticated, service_role;
