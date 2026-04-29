-- Purpose: add service-role-only helpers for scheduled monthly order partition maintenance.
-- Rollout assumptions: public.orders and public.order_items may still be unpartitioned in existing environments.
-- The create helper intentionally fails until the separate Phase 2.1 partition rollout has converted those tables.
-- Verification: call public.get_order_partition_health(CURRENT_DATE, 3) with service_role, then run
-- public.create_monthly_order_partitions(CURRENT_DATE, 3) only after the parent tables are partitioned.

CREATE OR REPLACE FUNCTION public.get_order_partition_health(p_start_date date DEFAULT CURRENT_DATE, p_months_ahead integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  normalized_month date;
  month_start date;
  month_end date;
  month_offset integer;
  parent_name text;
  child_name text;
  parent_oid oid;
  child_oid oid;
  parent_partitioned boolean;
  child_attached boolean;
  expected jsonb := '[]'::jsonb;
  all_ready boolean := true;
  parents_ready boolean := true;
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'get_order_partition_health requires service_role'
      USING ERRCODE = '42501';
  END IF;

  IF p_months_ahead < 0 OR p_months_ahead > 24 THEN
    RAISE EXCEPTION 'p_months_ahead must be between 0 and 24'
      USING ERRCODE = '22023';
  END IF;

  normalized_month := date_trunc('month', COALESCE(p_start_date, CURRENT_DATE))::date;

  FOREACH parent_name IN ARRAY ARRAY['orders'::text, 'order_items'::text]
  LOOP
    parent_oid := to_regclass(format('public.%I', parent_name));

    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_partitioned_table pt
      WHERE pt.partrelid = parent_oid
    )
    INTO parent_partitioned;

    IF parent_oid IS NULL OR NOT parent_partitioned THEN
      parents_ready := false;
      all_ready := false;
    END IF;

    FOR month_offset IN 0..p_months_ahead LOOP
      month_start := (normalized_month + make_interval(months => month_offset))::date;
      month_end := (month_start + INTERVAL '1 month')::date;
      child_name := parent_name || '_' || to_char(month_start, 'YYYY_MM');
      child_oid := to_regclass(format('public.%I', child_name));

      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_inherits i
        WHERE i.inhparent = parent_oid
          AND i.inhrelid = child_oid
      )
      INTO child_attached;

      IF parent_oid IS NULL OR NOT parent_partitioned OR child_oid IS NULL OR NOT child_attached THEN
        all_ready := false;
      END IF;

      expected := expected || jsonb_build_object(
        'table', parent_name,
        'partition', child_name,
        'month_start', month_start,
        'month_end', month_end,
        'parent_partitioned', COALESCE(parent_partitioned, false),
        'exists', child_oid IS NOT NULL,
        'attached', COALESCE(child_attached, false)
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'healthy', all_ready,
    'parents_partitioned', parents_ready,
    'start_month', normalized_month,
    'months_ahead', p_months_ahead,
    'expected_partitions', expected
  );
END;
$function$;

COMMENT ON FUNCTION public.get_order_partition_health(date, integer) IS 'Service-role health check for current and future monthly orders/order_items partitions.';

CREATE OR REPLACE FUNCTION public.create_monthly_order_partitions(p_start_date date DEFAULT CURRENT_DATE, p_months_ahead integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  normalized_month date;
  month_start date;
  month_end date;
  month_offset integer;
  parent_name text;
  child_name text;
  parent_oid oid;
  child_oid oid;
  parent_partitioned boolean;
  child_attached boolean;
  created_partitions jsonb := '[]'::jsonb;
  health jsonb;
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'create_monthly_order_partitions requires service_role'
      USING ERRCODE = '42501';
  END IF;

  IF p_months_ahead < 0 OR p_months_ahead > 24 THEN
    RAISE EXCEPTION 'p_months_ahead must be between 0 and 24'
      USING ERRCODE = '22023';
  END IF;

  normalized_month := date_trunc('month', COALESCE(p_start_date, CURRENT_DATE))::date;

  FOREACH parent_name IN ARRAY ARRAY['orders'::text, 'order_items'::text]
  LOOP
    parent_oid := to_regclass(format('public.%I', parent_name));

    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_partitioned_table pt
      WHERE pt.partrelid = parent_oid
    )
    INTO parent_partitioned;

    IF parent_oid IS NULL OR NOT parent_partitioned THEN
      RAISE EXCEPTION 'Partition maintenance cannot run because public.% is not a partitioned table. Roll out Phase 2.1 partitioning before enabling this job.', parent_name
        USING ERRCODE = '55000';
    END IF;

    FOR month_offset IN 0..p_months_ahead LOOP
      month_start := (normalized_month + make_interval(months => month_offset))::date;
      month_end := (month_start + INTERVAL '1 month')::date;
      child_name := parent_name || '_' || to_char(month_start, 'YYYY_MM');
      child_oid := to_regclass(format('public.%I', child_name));

      IF child_oid IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_inherits i
          WHERE i.inhparent = parent_oid
            AND i.inhrelid = child_oid
        )
        INTO child_attached;

        IF NOT child_attached THEN
          RAISE EXCEPTION 'Partition maintenance found public.% but it is not attached to public.%', child_name, parent_name
            USING ERRCODE = '55000';
        END IF;
      ELSE
        EXECUTE format(
          'CREATE TABLE %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)',
          'public',
          child_name,
          'public',
          parent_name,
          month_start::text,
          month_end::text
        );

        created_partitions := created_partitions || jsonb_build_object(
          'table', parent_name,
          'partition', child_name,
          'month_start', month_start,
          'month_end', month_end
        );
      END IF;
    END LOOP;
  END LOOP;

  health := public.get_order_partition_health(normalized_month, p_months_ahead);

  IF NOT COALESCE((health ->> 'healthy')::boolean, false) THEN
    RAISE EXCEPTION 'Partition maintenance completed but health check is not healthy: %', health::text
      USING ERRCODE = '55000';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'created_partitions', created_partitions,
    'health', health
  );
END;
$function$;

COMMENT ON FUNCTION public.create_monthly_order_partitions(date, integer) IS 'Service-role monthly maintenance helper that creates orders/order_items partitions only after Phase 2.1 partitioning exists.';

REVOKE ALL ON FUNCTION public.get_order_partition_health(date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_monthly_order_partitions(date, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_partition_health(date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_monthly_order_partitions(date, integer) TO service_role;
