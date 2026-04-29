# Security Hardening and 10,000-Restaurant Scale Plan

**Written:** 2026-04-30
**Target:** Fix all identified security risks. Build the infrastructure foundation that serves 10,000 restaurants reliably, which will be the proven base when we raise investment to go further.

---

## Context and Goal

The current system can serve ~1,000 restaurants today if the right hardening is applied. The goal of this plan is to build the infrastructure that serves 10,000 restaurants — 10 million orders per day at peak — without degradation for any individual restaurant. Reaching that tier also means the 1,000-restaurant stage is over-provisioned and fast.

The architectural bet: keep Postgres as the single source of truth, add partitioning and caching around the hot path, and route expensive work off the request lifecycle. This avoids the distributed system complexity of the 100,000-restaurant tier until investment makes that necessary.

This plan has three phases:

1. **Security Hardening** — fix real vulnerabilities before any growth
2. **1,000-Restaurant Foundation** — partitioning, caching, observability
3. **10,000-Restaurant Scale** — queues, read replica, edge cache, load validation

Each phase has explicit tasks, acceptance criteria, and database migration notes where required.

---

## Phase 1 — Security Hardening

**Do this before any production growth. These are exploitable gaps, not future concerns.**

### 1.1 Fix Anon UPDATE Orders Without Session Ownership (CRITICAL)

**Problem:** The current RLS policy allows any anonymous user to UPDATE any order in a restaurant, not just their own session's order. The Supabase anon key is visible in the browser. A customer can call the Supabase REST API directly, bypass the Next.js API layer entirely, and update or cancel other tables' orders.

Current policy in `supabase/sql/10_branch_core/policies.sql`:
```sql
CREATE POLICY "Anonymous can UPDATE orders" ON public.orders
  FOR UPDATE TO anon
  USING ((restaurant_id = public.get_request_restaurant_id()));
```

**Fix:** Add a session ownership check to the RLS policy. The `orders.session_id` column already holds the session UUID. Add a helper function that reads the session ID from the request context header (the same mechanism used for `get_request_restaurant_id()`), then require the order's `session_id` to match.

**Task list:**

- [ ] Add `public.get_request_session_id()` helper function to `supabase/sql/00_foundation/functions.sql`:

```sql
CREATE OR REPLACE FUNCTION public.get_request_session_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT NULLIF(
    current_setting('request.headers', true)::json->>'x-session-id',
    ''
  )::uuid;
$$;
```

- [ ] Update the anon UPDATE policy for `orders` in `supabase/sql/10_branch_core/policies.sql`:

```sql
DROP POLICY "Anonymous can UPDATE orders" ON public.orders;

CREATE POLICY "Anonymous can UPDATE own session orders" ON public.orders
  FOR UPDATE TO anon
  USING (
    restaurant_id = public.get_request_restaurant_id()
    AND session_id = public.get_request_session_id()
  )
  WITH CHECK (
    restaurant_id = public.get_request_restaurant_id()
    AND session_id = public.get_request_session_id()
  );
```

- [ ] Apply the same fix to `order_items`. An order item is owned by the session that owns its parent order. Use a subquery:

```sql
DROP POLICY "Anonymous can UPDATE order_items" ON public.order_items;

CREATE POLICY "Anonymous can UPDATE own session order_items" ON public.order_items
  FOR UPDATE TO anon
  USING (
    restaurant_id = public.get_request_restaurant_id()
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE session_id = public.get_request_session_id()
        AND restaurant_id = public.get_request_restaurant_id()
    )
  )
  WITH CHECK (
    restaurant_id = public.get_request_restaurant_id()
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE session_id = public.get_request_session_id()
        AND restaurant_id = public.get_request_restaurant_id()
    )
  );
```

- [ ] Update the Next.js customer API routes that call Supabase directly (not via service role) to pass the `x-session-id` header on every request from the customer session.

- [ ] Write a forward-only migration: `supabase/migrations/202604301000_fix_anon_order_session_rls.sql`

- [ ] Verify: attempt to UPDATE another session's order via the Supabase REST API and confirm it returns 403.

**Acceptance criteria:** An anonymous user with only the anon key cannot modify any order whose `session_id` does not match the `x-session-id` request header they provide.

---

### 1.2 Tighten Anon SELECT on Orders (MEDIUM)

**Problem:** Any anon user can SELECT all orders for a restaurant, not just their own. A customer at table 3 can see table 5's order details — items, amounts, table number — by calling the Supabase REST API directly.

**Fix:** Restrict anon SELECT to session-scoped orders only.

- [ ] Update `supabase/sql/10_branch_core/policies.sql`:

```sql
DROP POLICY "Anonymous can SELECT orders" ON public.orders;
DROP POLICY "Anonymous can SELECT order_items" ON public.order_items;

CREATE POLICY "Anonymous can SELECT own session orders" ON public.orders
  FOR SELECT TO anon
  USING (
    restaurant_id = public.get_request_restaurant_id()
    AND session_id = public.get_request_session_id()
  );

CREATE POLICY "Anonymous can SELECT own session order_items" ON public.order_items
  FOR SELECT TO anon
  USING (
    restaurant_id = public.get_request_restaurant_id()
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE session_id = public.get_request_session_id()
        AND restaurant_id = public.get_request_restaurant_id()
    )
  );
```

- [ ] Verify that the customer ordering UI still works: the session-scoped SELECT should return exactly the current table's orders, which is all the UI needs.

- [ ] Write forward-only migration: `supabase/migrations/202604301010_restrict_anon_order_select.sql`

---

### 1.3 Add HTTP Security Headers (MEDIUM)

**Problem:** `web/next.config.ts` has no security headers. The app is vulnerable to clickjacking and has no CSP.

**Fix:** Add a `headers()` block to `web/next.config.ts`:

```ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // tighten once inline scripts are audited
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.supabase.co https://placehold.co https://images.unsplash.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    },
  ];
},
```

- [ ] Add headers block to `web/next.config.ts`
- [ ] Verify with `curl -I` that headers are present in production
- [ ] Run the app in dev and confirm no CSP violations break customer ordering or owner dashboard

---

### 1.4 Make Redis Required in Production (MEDIUM)

**Problem:** `web/lib/server/rateLimit.ts` falls back to in-memory rate limiting with only a `console.warn` if Upstash Redis is not configured. On Vercel's serverless runtime, each function invocation is isolated — the in-memory store resets on every cold start. Rate limiting on auth endpoints is effectively disabled without Redis.

**Fix:** In production, fail hard if Redis is not configured.

- [ ] Update `web/lib/server/rateLimit.ts` initialization:

```ts
if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
  redis = new Redis({ url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN });
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN are required in production');
} else {
  console.warn('Rate limiting using in-memory store. Not suitable for production.');
}
```

- [ ] Add `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` to the Vercel production environment variables
- [ ] Document the required env vars in the README dev setup section
- [ ] Verify: deploy without Redis env vars, confirm startup fails with a clear error

---

### 1.5 Encrypt Employee Bank Account Data at Column Level (MEDIUM)

**Problem:** `employee_private_profiles` stores `bank_account_number`, `bank_name`, `bank_account_holder` as plain text. A database credential leak exposes this directly.

**Fix:** Encrypt sensitive columns using `pgcrypto` with a key stored in Supabase Vault (not in the schema itself).

- [ ] Enable `pgcrypto` extension (already in `00_extensions.sql` — verify it's present)
- [ ] Store an encryption key in Supabase Vault: `vault.secrets` table via the Supabase dashboard
- [ ] Migrate `bank_account_number` to encrypted storage:

```sql
-- Migration: 202604301030_encrypt_employee_bank_data.sql
ALTER TABLE public.employee_private_profiles
  ADD COLUMN bank_account_number_encrypted bytea;

UPDATE public.employee_private_profiles
SET bank_account_number_encrypted = pgp_sym_encrypt(
  bank_account_number,
  current_setting('app.encryption_key')
)
WHERE bank_account_number IS NOT NULL;

ALTER TABLE public.employee_private_profiles
  DROP COLUMN bank_account_number;

ALTER TABLE public.employee_private_profiles
  RENAME COLUMN bank_account_number_encrypted TO bank_account_number;
```

- [ ] Create a helper function `get_employee_bank_account(employee_id uuid)` that decrypts and returns the value, callable only by authenticated owner/manager role
- [ ] Update the app layer to call the helper rather than reading the column directly
- [ ] Update `supabase/sql/10_branch_core/schema.sql` baseline

---

### 1.6 Add PII Retention Policy for Bookings (LOW)

**Problem:** `bookings` stores `customer_name`, `customer_phone`, `customer_email` with no expiry. APPI (Japan) and PDPD (Vietnam) require a stated retention period and a deletion mechanism for personal data.

**Fix:** Add an `expires_at` column and a scheduled cleanup job.

- [ ] Add column to bookings table:

```sql
-- Migration: 202604301040_bookings_pii_expiry.sql
ALTER TABLE public.bookings
  ADD COLUMN pii_expires_at timestamptz
    GENERATED ALWAYS AS (booking_date + interval '180 days') STORED;
```

- [ ] Create a Supabase Edge Function `supabase/functions/purge-expired-booking-pii/index.ts` that runs on a schedule and NULLs out `customer_name`, `customer_phone`, `customer_email` on bookings past `pii_expires_at`
- [ ] Wire the function to run nightly via `supabase/functions/purge-expired-booking-pii/config.toml` cron schedule
- [ ] Update baseline in `supabase/sql/10_branch_core/schema.sql`

---

**Phase 1 complete when:** All six items above have forward-only migrations applied, tests pass, and production deployment verified.

---

## Phase 2 — 1,000-Restaurant Foundation

**Goal:** The system runs fast with zero degradation per restaurant at 1,000 tenants. Every restaurant gets the same sub-200ms response regardless of how busy the overall platform is.**

### 2.1 Partition Orders and Order Items by Month

**Why:** At 1,000 restaurants × 1,000 orders/day, `orders` accumulates ~1 million rows/day. By month 3 you have ~90 million rows in a single table. Postgres can still query this with indexes, but vacuuming, bloat, and reporting scans become painful. Partitioning by month caps the working set for any time-bounded query and makes old data archivable without migrations.

**Tasks:**

- [ ] Create the partitioned version of `orders`:

```sql
-- Migration: 202605010900_partition_orders_by_month.sql

-- Step 1: rename old table
ALTER TABLE public.orders RENAME TO orders_unpartitioned;

-- Step 2: create partitioned parent
CREATE TABLE public.orders (
  LIKE public.orders_unpartitioned INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Step 3: create initial partitions (current month + 3 months ahead)
CREATE TABLE public.orders_2026_04 PARTITION OF public.orders
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE public.orders_2026_05 PARTITION OF public.orders
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE public.orders_2026_06 PARTITION OF public.orders
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE public.orders_2026_07 PARTITION OF public.orders
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Step 4: backfill from unpartitioned
INSERT INTO public.orders SELECT * FROM public.orders_unpartitioned;

-- Step 5: swap foreign keys and policies to the new table
-- (handled in the full migration script)

-- Step 6: drop old table after verification
DROP TABLE public.orders_unpartitioned;
```

- [ ] Apply the same partition pattern to `order_items` (partition by `created_at`)
- [ ] Create a Supabase Edge Function `supabase/functions/create-monthly-partitions/index.ts` that runs on the 20th of each month and creates the next two months' partitions automatically
- [ ] Update `supabase/sql/10_branch_core/schema.sql` and `keys.sql` baselines
- [ ] Verify: query `EXPLAIN ANALYZE` on `SELECT * FROM orders WHERE restaurant_id = ? AND created_at > now() - interval '7 days'` and confirm it hits one or two partitions only, not all

---

### 2.2 Enforce Snapshot-Only Reads for All Reporting

**Why:** Several owner dashboard paths still compute KPIs from raw `orders` at request time (flagged in `09_feature_production_review_20260422.md:149`). At scale this means every dashboard load is a full table scan against the hot write table. Snapshots already exist — every reporting read must use them.

**Tasks:**

- [ ] Audit every owner API route that queries `orders` or `order_items` directly for reporting/KPI purposes:
  - `web/app/api/v1/owner/` — list all routes that aggregate order data
- [ ] For each one: rewrite to read from `analytics_snapshots` or `monthly_finance_snapshots`
- [ ] Ensure the `daily-usage-snapshot` Edge Function is scheduled to run at a known time (ideally 00:05 local restaurant time or a global UTC midnight equivalent)
- [ ] Add a fallback: if today's snapshot is not yet populated, compute live but log a warning — never fail silently
- [ ] Acceptance: run `EXPLAIN ANALYZE` on the owner analytics API responses. No raw `orders` table scans should appear in traces for any read-only dashboard query.

---

### 2.3 Configure PgBouncer Connection Pooling Correctly

**Why:** Supabase provides PgBouncer at the pooler URL (`aws-0-ap-northeast-1.pooler.supabase.com:5432`). At 1,000 restaurants with concurrent sessions, the number of real Postgres connections without pooling will hit Supabase's connection limit and start returning `FATAL: remaining connection slots are reserved`.

**Tasks:**

- [ ] Confirm all server-side DB connections (Next.js API routes, Edge Functions) use the pooler URL, not the direct Postgres URL
- [ ] Set `SUPABASE_DB_URL` in Vercel to the pooler URL with `pgbouncer=true&connection_limit=1` appended for Prisma/raw PG clients, or confirm the Supabase JS SDK client is using the correct endpoint
- [ ] Set `max_connections` on the Supabase project compute to match the paid tier's limit
- [ ] Load test: simulate 500 concurrent sessions and verify no connection-limit errors in logs

---

### 2.4 Add Redis Caching for Menu and Restaurant Metadata

**Why:** For every customer who scans a QR code, the app fetches: restaurant metadata, menu categories, menu items, toppings, and sizes. These are read-heavy and change rarely (maybe once per shift at most). At 1,000 restaurants × lunch peak, this is ~500 req/sec hitting Postgres for effectively static data.

**Strategy:** Cache at the API route layer in Upstash Redis. Invalidate on mutation (menu item update, availability toggle, restaurant settings change).

**Tasks:**

- [ ] Create `web/lib/server/cache.ts` — a thin wrapper over the existing Upstash Redis client with typed `get<T>`, `set`, and `del` helpers, plus a `cacheOrFetch<T>` helper that checks cache before querying DB
- [ ] Cache keys follow the pattern: `menu:{restaurantId}:categories`, `menu:{restaurantId}:items`, `restaurant:{restaurantId}:meta`
- [ ] TTL: 5 minutes for menu data, 1 minute for restaurant open/closed status
- [ ] On any owner menu mutation (create/update/delete menu item, toggle availability), invalidate the corresponding cache keys
- [ ] On restaurant settings update, invalidate `restaurant:{restaurantId}:meta`
- [ ] Add these four customer API routes to use the cache first:
  - `GET /api/v1/customer/menu` (categories + items)
  - `GET /api/v1/customer/restaurant` (metadata)
  - `GET /api/v1/restaurant/homepage-data`
  - `GET /api/v1/restaurant/signature-dishes`
- [ ] Verify cache hit rate in Upstash dashboard reaches >80% within a normal service period

---

### 2.5 Upgrade Supabase Plan and Set Compute

**Why:** The free and starter tiers have shared compute and limited connections. 1,000 restaurants requires a dedicated compute instance.

**Tasks:**

- [ ] Upgrade Supabase project to Pro or Team plan
- [ ] Add compute add-on: 4 vCPU / 16 GB RAM minimum for the 1,000-restaurant tier
- [ ] Enable Point-in-Time Recovery (PITR) — required for any real business data
- [ ] Confirm daily automated backups are retained for 30 days minimum
- [ ] Set up Supabase's built-in query performance advisor and address any flagged slow queries

---

### 2.6 Add Observability

**Why:** At 1,000 restaurants you cannot debug problems reactively. You need to see them before restaurants report them.

**Tasks:**

- [ ] Add Sentry to the Next.js app (`@sentry/nextjs`) — capture all unhandled errors and slow API responses (>500ms threshold)
- [ ] Create a structured log format in `web/lib/client-logger.ts` that emits `restaurant_id`, `endpoint`, `duration_ms`, and `status` on every API response
- [ ] Set up a Vercel Analytics dashboard for Core Web Vitals on customer-facing pages
- [ ] Create a Supabase dashboard alert: trigger on any table with >1M rows added in a single day (abnormal spike detector)
- [ ] Define SLOs before launch:
  - Customer menu load: p95 < 300ms
  - Order creation: p95 < 500ms
  - Owner dashboard load: p95 < 800ms

---

**Phase 2 complete when:** Load test at 1,200 concurrent restaurant sessions (20% headroom over target) shows all SLOs met and zero connection errors.

---

## Phase 3 — 10,000-Restaurant Scale

**Goal:** The system handles 10 million orders per day (~115 writes/sec average, ~1,200/sec at lunch peak). No single restaurant's experience degrades based on what other restaurants are doing. Infrastructure cost scales linearly with restaurant count, not super-linearly.**

### 3.1 Supabase Read Replica for Owner Dashboards

**Why:** At 10,000 restaurants, owner dashboard queries (finance summaries, attendance reports, branch comparisons) compete with live order writes on the same Postgres instance. Read replicas separate these workloads completely.

**Tasks:**

- [ ] Enable Supabase read replica (available on Pro+ plans) in the same region (ap-northeast-1)
- [ ] Create `web/lib/supabase/read-client.ts` — a Supabase client that connects to the read replica endpoint
- [ ] Route all owner GET endpoints through the read client:
  - All finance and analytics APIs
  - All attendance and scheduling APIs
  - All branch comparison and org-level summary APIs
- [ ] Keep all writes (order status updates, menu changes, employee actions) on the primary client
- [ ] Verify: primary Postgres CPU drops measurably under simulated owner dashboard load once read replica routing is live

---

### 3.2 Async Job Queue for All Non-Critical Work

**Why:** At 10,000 restaurants, synchronous side effects on the order write path (receipts, AI suggestions, log writes, analytics snapshot triggers, notification sends) add latency to every order and make the system fragile. One slow side effect blocks the customer's "Order placed" confirmation.

**Strategy:** Use Upstash QStash (already partially in the stack) or Inngest for background jobs. The order creation API returns immediately after the write. All side effects become queued jobs.

**Tasks:**

- [ ] Move these off the request lifecycle into background jobs:
  - Receipt/confirmation message generation
  - AI menu suggestion triggers
  - Analytics snapshot invalidation and rebuild
  - Low-stock notifications
  - Audit log writes (currently synchronous in some paths)
  - Trial expiry checks
- [ ] Create `web/lib/server/jobs.ts` — typed job dispatchers for each job type
- [ ] Each job handler must be idempotent: if it runs twice, the result is the same
- [ ] Add job failure logging to the existing `logs` table with `level = 'error'` and `source = 'job'`
- [ ] Acceptance: order creation p95 latency drops by at least 30% after async migration

---

### 3.3 Edge Caching for Customer Menu Pages

**Why:** At 10,000 restaurants, menu reads (the dominant traffic type — customers browse 10x for every 1 order they place) can be served entirely from Vercel's edge network without hitting the origin at all. This takes the menu read load off Postgres and Next.js completely for cache hits.

**Tasks:**

- [ ] Convert customer menu page routes to use Next.js `generateStaticParams` + ISR with `revalidate: 300` (5-minute refresh)
  - `app/[subdomain]/menu/page.tsx` → ISR
  - `app/[subdomain]/page.tsx` → ISR
- [ ] For dynamic per-table routes (which need the session), keep SSR but cache the underlying API response at the Redis layer (Phase 2.4)
- [ ] Add `Cache-Control: public, s-maxage=300, stale-while-revalidate=60` to customer menu API responses
- [ ] On menu item mutation, trigger a revalidation call to `next/cache` `revalidatePath` for the affected restaurant's menu page
- [ ] Verify: after ISR warmup, a Vercel edge hit for a restaurant menu shows `x-vercel-cache: HIT` in response headers

---

### 3.4 Partition Maintenance Automation

**Why:** At 10,000 restaurants, failing to create next month's partition means order writes fail at midnight on the 1st of the month. This must be automated and monitored.

**Tasks:**

- [ ] Harden the `create-monthly-partitions` Edge Function from Phase 2.1:
  - Run on the 15th of each month (not the 20th — gives more lead time)
  - Create 3 months of future partitions, not 2
  - On completion, log success to the `logs` table
  - On failure, send an alert to the platform admin notification channel
- [ ] Create a monitoring check: if the current month's partition does not exist as of the 1st, trigger a PagerDuty/Slack alert immediately
- [ ] Add a partition health check to the platform admin dashboard

---

### 3.5 Load Testing Before Each Phase Gate

**Why:** Configuration changes and architectural improvements mean nothing without measured proof under realistic load. Each phase gate requires a passing load test.

**Test scenarios:**

**Lunch peak simulation (the critical scenario):**
- 10,000 concurrent sessions
- Each session: scan QR → load menu → place 3-item order → check status
- Duration: 30 minutes
- Tool: k6 (`web/load-tests/lunch-peak.js`)

**Acceptance criteria for Phase 3:**
- Order creation: p95 < 500ms, p99 < 1,000ms
- Menu load (cache warm): p95 < 100ms
- Owner dashboard: p95 < 1,000ms
- Zero 5xx errors during sustained load
- No Postgres connection errors
- Postgres CPU stays below 70% during peak

**Tasks:**

- [ ] Create `web/load-tests/` directory with k6 scripts
- [ ] Script 1: `lunch-peak.js` — simulates the above scenario
- [ ] Script 2: `owner-dashboard.js` — simulates 500 concurrent owner sessions running analytics
- [ ] Script 3: `menu-browse.js` — simulates 5,000 concurrent menu browsers (read-only)
- [ ] Run all three scripts before declaring Phase 3 complete
- [ ] Document results in `docs/foundation/load-test-results/`

---

### 3.6 Supabase Enterprise and Dedicated Compute

**Why:** At 10,000 restaurants, the Pro tier compute add-ons may not be sufficient depending on peak load characteristics. Supabase Enterprise provides dedicated hardware, higher connection limits, and a committed SLA.

**Tasks:**

- [ ] Negotiate Supabase Enterprise agreement at ~3,000-restaurant mark (before you need it at 10,000)
- [ ] Target compute: 8 vCPU / 32 GB RAM primary + read replica
- [ ] PITR retention: 7 days minimum
- [ ] Get a committed SLA: 99.9% uptime on DB
- [ ] Plan a maintenance window strategy so that no restaurant's dinner service is interrupted by a Postgres upgrade

---

## Phase 4 — Investment Trigger (Not in Scope Now, For Reference)

When the 1,000-restaurant tier is live and profitable, the investment conversation can be had from a position of proof, not projection. At that point, the architecture change needed to go from 10,000 to 100,000+ restaurants is:

- Tenant sharding: partition the database by organization or restaurant hash range across multiple Postgres clusters
- Order event stream: replace synchronous order writes with an append-only event log (Kafka or Upstash Kafka), with a consumer that materializes order state
- Dedicated OLAP warehouse: BigQuery or ClickHouse for cross-tenant analytics that the current Postgres cannot support
- Multi-region: deploy to at least 3 regions (Japan, Southeast Asia, US West) with regional read replicas and edge routing
- Tenant management plane: a separate control plane for onboarding, billing, and tier management, isolated from the restaurant operational database

None of this is needed to hit 10,000. It is the architecture that makes 100,000 possible, and it should be funded by investment, not bootstrapped.

---

## Execution Order

```
Phase 1 (Security)     ← Do immediately, 2–3 weeks
  1.1 Anon UPDATE RLS fix
  1.2 Anon SELECT restriction
  1.3 HTTP security headers
  1.4 Redis required in production
  1.5 Bank account encryption
  1.6 Booking PII retention

Phase 2 (1,000 restaurants)     ← 6–8 weeks after Phase 1
  2.1 Order partitioning
  2.2 Snapshot-only reporting reads
  2.3 PgBouncer configuration
  2.4 Redis menu caching
  2.5 Supabase plan upgrade
  2.6 Observability

Phase 3 (10,000 restaurants)     ← 8–12 weeks after Phase 2
  3.1 Read replica routing
  3.2 Async job queue
  3.3 Edge cache for menu pages
  3.4 Partition maintenance automation
  3.5 Load testing
  3.6 Supabase Enterprise
```

---

## What Stays Stable Throughout

- The customer ordering flow is not changed. The session model, QR code scan, order placement, and real-time kitchen view all remain unchanged. Only the RLS policies around them tighten.
- The `restaurant` as branch unit remains the fundamental operating scope. All caching, partitioning, and job dispatch keys off `restaurant_id`.
- The organization-over-branch hierarchy is not touched. Phase 3 improvements happen below it.
- All financial data remains in Postgres. No finance data moves to external systems until Phase 4 investment.
