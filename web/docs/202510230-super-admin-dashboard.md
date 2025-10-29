## Web review findings

### Critical issues (must fix)

- page.tsx types the `params` prop as `Promise<{ locale: string }>` and awaits it. Next.js hands you a plain object, so this compiles only because JavaScript silently resolves non-promises. Update the signature to `({ params }: { params: { locale: string } })` and remove the `await` to avoid confusing typings and future refactor bugs.

- Platform-level access control is undefined. Super-admin pages will need a first-class role (`platform_admin`) plus RLS policies or a separate schema; right now every API route assumes tenant-scoped claims. Without deciding that up front you’ll end up sprinkling `service_key` calls throughout the UI—hard fail for security.

### Warnings (should fix)

- There’s no dedicated route group for company admins. admin exists but is empty, so shipping the new dashboard without stubbing a protected layout, nav, and auth guard will lead to ad-hoc pages under random route groups.

- Restaurant approval today relies on the `restaurants.is_verified` flag, but nothing drives it. You’ll need an API endpoint (and probably a migration to track `verified_at`, `verified_by`) before wiring UI actions.

- Logs already live in `logs` table, yet there’s no indexing or filtering API for cross-tenant review. Expect slow queries unless you add indexes on `level`/`created_at` and design a paginated admin route.

### Suggestions (consider improving)

- Centralize subscription metadata instead of overloading `restaurants`. A `tenant_subscriptions` table (plan, status, billing cycle, trial dates, cancellation_reason) will make future billing integrations easier.

- Complaints/support tickets deserve their own table (`support_tickets` + `support_ticket_messages`) rather than repurposing `feedback`.

- Codify resource quotas per plan (max staff, storage, AI calls). That lets the dashboard surface “near limit” alerts and auto-enforce plan differences.

## Super-admin dashboard delivery plan

### Phase 0 – Foundations [x]
- **Roles & policies:** Add `platform_admin` role in Supabase; create a lightweight `platform_admins` table and accompanying edge middleware to ensure only that role hits the new routes. Grant READ across tenant tables and WRITE to verification/subscription tables via dedicated policies (or a schema exempt from RLS accessed through a Supabase function).
- **Schema updates:**  
  - `tenant_subscriptions`: `id`, `restaurant_id`, `plan_id`, `status`, `trial_ends_at`, `current_period_end`, `billing_provider`, `payment_method`, `seat_limit`, `resource_quota_json`.  
  - `subscription_plans`: seed from pricing.ts.  
  - `support_tickets`: `restaurant_id`, `subject`, `category`, `status`, `priority`, `submitted_by`, timestamps.  
  - `support_ticket_messages`: threaded conversation, `posted_by (enum: restaurant|admin)`.  
  - Extend `restaurants` with `verified_at`, `verified_by`, `suspend_reason`, `notes`.
- **Derived data:** Create a nightly Supabase function to populate `tenant_usage_snapshots` (orders per day, API calls, storage, seats used) so the dashboard isn’t running heavy ad-hoc queries.

[x] Phase 0 complete! 7 database migration files:
1. 026_platform_admins.sql - Platform admin table with permissions and helper functions
2. 027_subscription_plans.sql - Subscription plans table seeded from pricing.ts
3. 028_tenant_subscriptions.sql - Tenant subscriptions with billing, trials, and quota tracking
4. 029_support_tickets.sql - Support tickets and messages with SLA tracking
5. 030_extend_restaurants.sql - Added verification and suspension fields to restaurants
6. 031_tenant_usage_snapshots.sql - Daily usage snapshots with calculation functions
7. 032_platform_admin_rls_policies.sql - Cross-tenant RLS policies and audit logging


### Phase 1 – API surface (Next.js App Router) [x]
- Namespace under `web/app/api/v1/platform/*`.  
  - `GET /restaurants`: filter by status/trial/plan/search.  
  - `PATCH /restaurants/:id/verify`: mark verified, optional welcome email trigger.  
  - `PATCH /restaurants/:id/suspend`: toggle `is_active` with reason.  
  - `GET /subscriptions`, `PATCH /subscriptions/:id`: upgrade/downgrade, extend trials.  
  - `GET /usage`: aggregated metrics from `tenant_usage_snapshots`.  
  - `GET /logs`: paginated, filter by level/restaurant. Consider streaming via Supabase channel for live updates.  
  - `GET /support-tickets`, `POST /support-tickets/:id/reply`, `PATCH /support-tickets/:id`: update status/priority.
- All routes must perform role checks, sanitize inputs with Zod, and respond with typed payloads in `web/types/platform`.
[x] Phase 1 complete! I've created the complete API surface for the platform admin dashboard:
Created Files
## Core Infrastructure
- web/lib/platform-admin.ts - Platform admin middleware, auth helpers, and audit logging
- web/shared/schemas/platform.ts - Zod validation schemas for all platform API endpoints
- web/shared/types/platform.ts - TypeScript types for platform API responses

## API Endpoints (/api/v1/platform/)
### Restaurants:
- restaurants/route.ts - GET with filters (status, plan, verified, search)
- restaurants/[id]/verify/route.ts - PATCH to verify restaurants
- restaurants/[id]/suspend/route.ts - PATCH to suspend/unsuspend
### Subscriptions:
- subscriptions/route.ts - GET with filters
- subscriptions/[id]/route.ts - PATCH to update plan/status/trial
### Usage & Monitoring:
- usage/route.ts - GET aggregated metrics and trends
- logs/route.ts - GET logs with filtering and pagination
### Support:
- support-tickets/route.ts - GET with filters
- support-tickets/[id]/route.ts - GET single ticket + PATCH to update
- support-tickets/[id]/reply/route.ts - POST to reply
### All endpoints include:
- Platform admin authentication checks
- Zod validation
- Comprehensive error handling
- Audit logging
- Type-safe responses

### Phase 2 – UI/UX (route group `[locale]/(coorder)/platform`) [x]
- **Layout:** Protected layout with a left nav (Overview, Pending Approvals, Subscriptions, Accounts, Usage, Logs, Support). Provide locale switcher and admin profile menu.
- **Overview page:** Metric cards (tenants on trial, active subscribers, churn risk, unresolved tickets). Trend charts using `recharts`.
- **Pending approvals:** Data table (TanStack) showing new signups with quick actions (approve, reject, view details). Column-level filters, bulk approve.
- **Subscriptions:** Table with plan, renewal dates, payment status, seats used vs. quota. Inline downgrade/upgrade modals fed by `tenant_subscriptions`.
- **Accounts:** Drill-down view for each tenant listing owner + staff (pulls from `users`). Allow password reset email, invite resend, force logout.
- **Resource usage:** Visualize daily order volume, storage usage, AI credits; flag anything near quota.
- **Logs:** Stream + filters (level, endpoint, restaurant). Provide export to CSV. Use virtualization for performance.
- **Support/complaints:** Ticket inbox with Kanban-like lanes (New, Investigating, Resolved). Show conversation thread and quick responses (templates).

All user-facing strings must live under `web/messages/en/platform.json` (and localized copies). Reuse shadcn DataTable, Dialog, Badge, Tabs; avoid reinventing components.

### Phase 3 – Workflows & automation
- **Approval workflow:** On approve, set `is_verified`, optionally trigger onboarding email (Supabase function). On reject, record reason + send response.
- **Trial management:** Cron to email admins 3 days before trial end, surface highlight in dashboard.
- **Complaints SLA tracking:** auto-escalate tickets breaching SLA; display SLA timers in UI.
- **Audit logging:** Every platform action writes to `platform_audit_logs` with before/after snapshots for compliance.

### Phase 4 – Testing & hardening
- **Unit tests:** Jest + React Testing Library for list/table components, action modals, hooks. Mock fetch/React Query (if introduced).
- **API tests:** Add integration tests hitting the new route handlers with role mocks.
- **E2E smoke:** Playwright (or Cypress) focusing on login, approval, subscription change, ticket reply.
- **Performance:** Confirm paginated APIs default to sensible limits; add indexes on new tables (`status`, `restaurant_id`, `created_at`).
- **Security:** Pen-test checklist—role leakage, SQL injection (Zod+Supabase parameterization), log redaction.

## Immediate next steps
- Draft migrations for `tenant_subscriptions`, `support_tickets`, `platform_admins`, and extend `restaurants`.
- Define Supabase RLS policies and helper functions for platform admins (e.g., `rpc_get_platform_restaurant_summary`).
- Scaffold protected layout under `web/app/[locale]/(coorder)/platform` with placeholder pages to unblock UI work.
- Write Zod schemas and TypeScript types for new API payloads (`web/shared/schemas/platform`).
- Sync with product on KPIs needed for the Overview page to ensure the usage snapshot schema covers them.

## Requirements coverage
- Web review delivered with prioritized issues: **Done**.  
- Implementation plan for super-admin dashboard covering approval, subscriptions, accounts, resources, logs, complaints: **Done**.
