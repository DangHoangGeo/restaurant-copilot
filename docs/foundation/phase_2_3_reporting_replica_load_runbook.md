# Phase 2.2/2.3 and Phase 3.1/3.5 Operations Runbook

## Scope

This runbook covers repo-side acceleration for reporting reads, read-replica routing, PgBouncer verification, and load-test execution. It does not change customer ordering writes. All mutations must continue to use the primary Supabase project URL.

## Read Replica Client

The repo exposes `supabaseReadAdmin` in `web/lib/supabase/read-client.ts`.

Required production env:

```text
NEXT_PUBLIC_SUPABASE_URL=<primary Supabase API URL>
SUPABASE_READ_REPLICA_URL=<read replica or Supabase API load balancer URL>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
QSTASH_TOKEN=<Upstash QStash token>
QSTASH_CURRENT_SIGNING_KEY=<QStash current signing key>
QSTASH_NEXT_SIGNING_KEY=<QStash next signing key>
SENTRY_DSN=<server Sentry DSN>
NEXT_PUBLIC_SENTRY_DSN=<browser Sentry DSN>
```

Rules:

- Use `supabaseReadAdmin` only after the route has already performed normal app authorization.
- Use it for owner/platform `GET` routes and read-only RPCs only.
- Pass `{ get: true }` when calling read-only Postgres functions through Supabase JS so the Data API uses `GET`.
- Never use it for order creation, order status mutation, menu mutation, employee mutation, finance close, approval, invite, billing, or support reply writes.
- Expect replica lag. Do not route read-after-write workflows through the replica when the owner needs to see the just-written record immediately.

The client blocks non-`GET` REST calls in its fetch layer as a repo-side guardrail. If `SUPABASE_READ_REPLICA_URL` is absent, it falls back to the primary URL for local development but remains read-only at the REST call boundary.

Current repo coverage:

- Platform overview and usage GET APIs use the read client.
- Organization overview uses the read client.
- Legacy owner dashboard and report GET APIs now use the read client for raw read pressure relief.
- The full owner GET surface is not complete until attendance, scheduling, finance reads, branch comparison, and all org-level summary reads are audited route-by-route.

## Snapshot Reporting

Owner/platform reporting must prefer existing snapshot surfaces:

- `tenant_usage_snapshots` for platform usage and platform trend reads
- `monthly_finance_snapshots` for closed finance rollups
- read-only overview RPCs that aggregate bounded data and can move behind the replica

If a same-day snapshot is missing and a route computes live data, the route must log that fallback. Do not silently present live operational data as closed accounting output.

Current repo status: selected reporting routes have been moved away from the primary client, but several still compute live values from raw `orders` and `order_items`. `refresh_analytics_snapshot(restaurant_id, date)` now provides a bounded daily analytics snapshot target for branch dashboards. That is acceptable only as an interim replica-backed read-pressure reduction. Phase 2.2 is complete only after every dashboard/reporting KPI is backed by `analytics_snapshots`, `tenant_usage_snapshots`, `monthly_finance_snapshots`, or another bounded snapshot/RPC surface with explicit live-fallback logging.

## Background Jobs

The repo exposes typed QStash dispatchers in `web/lib/server/jobs.ts` and a signed handler at `POST /api/v1/internal/jobs/[jobType]`.

Rules:

- Dispatch is skipped unless `QSTASH_TOKEN` and an app base URL are configured.
- Handler calls are verified with QStash signing keys.
- Handlers must stay idempotent. Analytics snapshot rebuild, low-stock scans, billing renewal checks, and async audit writes have concrete handlers. Receipt confirmation and AI menu suggestions still acknowledge deferred work until their final business integrations exist.
- Job failures are logged with `source = job` metadata in the existing `logs` table.

Phase 3.2 is complete only after receipt/confirmation, AI menu suggestions, analytics rebuilds, low-stock notifications, synchronous audit writes, and trial-expiry checks are moved into concrete handlers and order creation p95 improves by at least 30 percent under load.

## Partition Health

The repository now uses the development partition target shape for `orders` and
`order_items`:

- parent tables are partitioned by `created_at`
- parent primary keys include `(id, created_at)`
- `order_items`, `feedback`, and `order_discounts` carry `order_created_at`
- the trigger `set_order_created_at_from_order()` fills that composite FK column
  for callers that only know `order_id`

Platform admins can check current and future partition readiness through:

```text
GET /api/v1/platform/health/partitions?months_ahead=3
```

This API calls `get_order_partition_health()` and is the backend surface for the
Phase 3.4 dashboard widget or alerting monitor.

## Observability

Repo-side observability now includes:

- `@sentry/nextjs` client, server, and edge initialization files.
- Sentry source-map upload wiring in `next.config.ts`.
- A client API timing helper at `web/lib/client/api-fetch.ts`.
- The existing Vercel Analytics component in `web/app/layout.tsx`.

Phase 2.6 is complete only after Sentry DSNs/source-map credentials are configured in staging/production, critical API routes are observed in Sentry, Supabase dashboard alerts are configured, and dashboard evidence is recorded.

## PgBouncer / Supavisor Verification

Before Phase 2.3 is marked complete:

1. Confirm any raw Postgres clients use the Supabase pooler connection string, not the direct database host.
2. Confirm Supabase JS routes use API endpoints and do not create direct Postgres connections.
3. Confirm the read replica has its own pooler endpoint if raw SQL clients are introduced later.
4. Run the owner dashboard load test and inspect Supabase/Vercel logs for connection-limit errors.
5. Record pooler and connection errors in `docs/foundation/load-test-results/`.

## Load Tests

Scripts live in `web/load-tests/`:

- `menu-browse.js`: read-only public menu browsing
- `owner-dashboard.js`: owner control/reporting reads
- `lunch-peak.js`: QR scan, menu load, optional session/order write, order status check

Use staging by default. Full lunch write load requires:

```text
ENABLE_ORDER_WRITES=true
RESTAURANT_ID=<test restaurant uuid>
TABLE_ID=<test table uuid>
MENU_ITEM_IDS=<three test menu item uuids>
```

Keep test data scoped to a dedicated test restaurant so cleanup cannot affect real restaurants.

## Official Assumptions Used

- Supabase read replicas are read-only and asynchronously replicated, so reads can lag primary writes.
- Supabase read replica REST APIs support `GET` requests; read-only RPC calls should use `get: true`.
- Supabase provides dedicated endpoints and connection pools for read replicas.
- k6 scripts should use environment variables and thresholds so the same script can run as smoke, staging, or phase-gate load.

Sources:

- [Supabase Read Replicas](https://supabase.com/docs/guides/platform/read-replicas)
- [Supabase Getting Started with Read Replicas](https://supabase.com/docs/guides/platform/read-replicas/getting-started)
- [Supabase connection strings and pooler](https://supabase.com/docs/reference/postgres/connection-strings)
- [k6 environment variables](https://grafana.com/docs/k6/latest/using-k6/environment-variables/)
- [k6 thresholds](https://grafana.com/using-k6/thresholds)
