# Phase 3: API & Database Scalability (Weeks 6–10)

Goal: Scale reliably with strong consistency and predictable API performance. Target a 10/10 Reliability and Scalability score.

Outcomes
- Transactional order creation via a single RPC/function call.
- Mandatory pagination/filtering across all list endpoints with strict validation.
- Realtime subscriptions narrowed to only what is necessary.
- Asynchronous reporting for heavy queries.

Workstreams and Tasks
1) Transactional Order Creation (RPC)
- Files: `infra/migrations/022_create_order_transaction.sql` (verify), `/infra/migrations/*` for updates, `web/app/api/v1/owner/orders/route.ts`, `web/app/api/v1/customer/orders/route.ts`, `web/app/[locale]/(restaurant)/dashboard/orders/orders-client-content.tsx` (client call sites).
- Actions:
  - Implement/verify Postgres function `create_order(p_restaurant_id, p_table_id, p_guest_count, p_items jsonb)` that inserts order + items atomically and returns computed totals.
  - Replace multiple Supabase inserts with `supabase.rpc('create_order', {...})` in both owner and customer flows.
  - Handle conflicts, constraints, and validation inside the function; return structured error codes.
- Tests: API integration tests asserting atomicity (fail mid-way → no partial rows). Load tests for p95 < 200ms for typical orders.
- Acceptance: No partial writes observed; rollback guaranteed on error; metrics show fewer DB roundtrips.

2) Mandatory Pagination and Validation Adoption
- Files: All list routes under `web/app/api/v1/**` (orders, categories, menu, reports), shared schemas in `web/shared/schemas/common.ts`.
- Actions:
  - Convert any unbounded selects (e.g., categories with nested items/sizes/toppings) to paginated or parent-first fetch with separate item pages.
  - Enforce max pageSize 100 and reject unindexed sorts. Provide cursor-based pagination where large datasets need stable ordering.
  - Document query params and defaults in route-level JSDoc and `web/docs/api/`.
- Tests: Route tests for over-limit requests (→ 400); pagination boundaries; cursor traversal correctness.
- Acceptance: No route returns more than 100 entities by default; performance stable under large data.

3) Realtime Subscription Optimization
- Files: `web/hooks/useOrdersRealtime.ts`, any `supabase.channel` usages.
- Actions:
  - Subscribe only to channels scoped by tenant and narrow tables (e.g., orders by restaurant_id and status in [new, serving]).
  - Debounce or batch UI updates; ensure cleanup on unmount.
- Tests: Simulate high-frequency events; ensure UI remains responsive; no memory leaks.
- Acceptance: CPU usage stable during spikes; UI latency < 100ms for updates.

4) Asynchronous Reporting
- Files: `web/app/api/v1/owner/reports/*` (new), `web/lib/server/jobs/*` (new), DB tables for report_jobs and report_results, edge function or cron for processing.
- Actions:
  - POST /reports/start → enqueue job with params; return jobId.
  - GET /reports/:jobId → status + result link.
  - Worker reads jobs, runs heavy queries/materialized views, stores results, and marks complete.
  - UI polls with exponential backoff; show progress state.
- Tests: E2E happy-path for creating and retrieving a report; resilience tests for retries.
- Acceptance: Long-range reports offload to background; API stays responsive under load.

5) Server Caching and Invalidation
- Files: Aggregate dashboard route and other GETs supporting `revalidateTag`.
- Actions:
  - Tag cached responses (`dashboard:aggregate`, `menu:categories`, etc.).
  - Invalidate tags after mutations (e.g., creating an order → invalidate `dashboard:*`).
- Tests: Confirm fresh data after writes; no stale critical data beyond SLA (e.g., 60s for dashboard).
- Acceptance: Cache hit rate ≥ 70% on dashboard aggregate in staging.

Definition of Done
- All heavy writes are transactional; reads bounded and validated; realtime scoped.
- Clear documentation for new RPC and reporting APIs.
- Lint/tests/format pass; telemetry added for queue depth and job durations.

Quality Gates and Metrics
- p95 API response time for list endpoints ≤ 150ms at 10 req/s/tenant in staging.
- Error rate < 0.1% for API calls; zero data integrity incidents in test runs.
