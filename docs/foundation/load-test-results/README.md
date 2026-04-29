# Load Test Results

This directory stores phase-gate evidence for the security and scale plan.

## Scripts

Run from `web/` after installing k6:

```bash
k6 run -e BASE_URL=https://staging.example.com -e RESTAURANT_ID=<uuid> load-tests/menu-browse.js
k6 run -e BASE_URL=https://staging.example.com -e OWNER_COOKIE='<auth cookies>' load-tests/owner-dashboard.js
k6 run -e BASE_URL=https://staging.example.com -e RESTAURANT_ID=<uuid> -e TABLE_ID=<uuid> -e MENU_ITEM_IDS=<uuid>,<uuid>,<uuid> -e ENABLE_ORDER_WRITES=true load-tests/lunch-peak.js
```

Do not run `lunch-peak.js` with `ENABLE_ORDER_WRITES=true` against production unless a temporary test restaurant, test table, and cleanup window are approved.

## Required Result File

Create one Markdown file per run:

```text
YYYY-MM-DD_<environment>_<scenario>.md
```

Each file should record:

- environment and commit SHA
- script name and exact k6 command
- restaurant, branch, table, and auth cookie/token scope used
- VUs, ramp, hold, and duration
- p95 and p99 latency for menu load, order creation, owner dashboard, and order status where applicable
- HTTP error rate and all 5xx counts
- Supabase primary CPU, replica CPU, replication lag, connection errors, and pooler errors during the run
- Vercel function errors/timeouts during the run
- pass/fail against the phase gate

## Phase 3 Acceptance Targets

- order creation p95 below 500 ms and p99 below 1,000 ms
- warm menu load p95 below 100 ms
- owner dashboard p95 below 1,000 ms
- zero sustained 5xx errors
- zero Postgres connection-limit errors
- primary Postgres CPU below 70 percent during peak

## Notes

Read-replica backed dashboards may lag behind primary writes. Record observed replication lag with every owner/platform dashboard test so stale-but-accepted reads are explicit.
