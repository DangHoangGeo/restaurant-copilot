## Jules, execute Workstream A on branch `refactor/security-api-hardening`:

Objective: Lock down data access, add defense-in-depth checks, and unify server logging.

Steps:
1. RLS Policy Refinement
   • In `infra/production/02_policies.sql`, replace each “FOR ALL TO authenticated” policy on tables (categories, menu_items, orders, etc.) with:
     – A broad SELECT policy for any authenticated user in the same restaurant.
     – INSERT/UPDATE/DELETE policies restricted to roles owner, manager (and chef for menu_items).
   • Write Supabase policy tests to verify correct permissions per role.

2. Explicit Role Checks in API Routes
   • In every CUD route under `web/app/api/v1/owner/.../route.ts` (categories, menu-items, settings):
     – After `getUserFromRequest()`, query the user’s role.
     – If role not in allowed list, return 403 before RLS.
   • Add unit tests covering allow and forbid scenarios for each endpoint.

3. Logging Standardization
   • Replace all `console.error` in API handlers with `logger.error(...)`, including route path and user ID context.

4. ProtectedLayout Audit
   • Confirm `web/middleware.ts` protects all `/dashboard/*` paths.
   • Remove or document redundant client-side auth in `web/components/ProtectedLayout.tsx`.

When each task is complete, push commits, open a PR titled “Workstream A complete” against `develop`, and report status.



## Jules, execute Workstream B on branch `refactor/menu-performance-refactor`:

Objective: Reduce payload sizes, improve UX responsiveness, and modularize menu code.

Steps:
1. Lazy-Load Menu Items
   • Update `GET /api/v1/owner/categories` (in `web/app/api/v1/owner/categories/route.ts`) to return only category metadata.
   • Create `GET /api/v1/owner/categories/[categoryId]/menu-items` to load items on category expansion.
   • In `menu-client-content.tsx`, fetch items when a user expands a category.

2. Optimistic UI & Targeted Refetch
   • Refactor CUD operations in `menu-client-content.tsx`:
     – Apply API response changes directly to local state.
     – Implement rollback on error instead of full reloadData().

3. Component Extraction
   • Split `menu-client-content.tsx` into:
     – `CategoryList.tsx`
     – `MenuItemList.tsx`
     – `MenuFilterBar.tsx`
     – `ItemModal.tsx`
   • Move shared logic into hooks: `web/hooks/useMenuData.ts` and `useBulkActions.ts`.

4. (Optional) Backend Filtering API
   • If needed for large menus, expose `/api/v1/owner/menu/search?term=…` and wire the client to use it for filtering.

Push commits, open a PR titled “Workstream B complete” against `develop`, and report status.


## Jules, execute Workstream C on branch `refactor/feature-ux`:

Objective: Build missing UIs and fix partial implementations to round out admin functionality.

Steps:
1. Audit Logs UI
   • Create `web/app/[locale]/(restaurant)/dashboard/audit-logs/page.tsx`.
   • Display a table with columns: Timestamp, User, Action, Target, Details.
   • Add pagination and filters (date range, user, action type).
   • Hook up to `GET /api/v1/owner/audit-logs`.

2. Bulk-Add Tables Fix
   • In `tables-client-content.tsx`, uncomment and implement `handleBulkAddSubmit()`.
   • Loop over input entries, POST to `/api/v1/owner/tables`.
   • Show per-item error handling and summary toast on completion.

3. Notification Center MVP
   • Scaffold `web/app/[locale]/(restaurant)/dashboard/notifications/page.tsx`.
   • Display a static list of system notifications (stub data).
   • Leave placeholders for future notification preferences.

4. Permissions UI Skeleton (Optional)
   • Under `dashboard/permissions/`, create a form listing roles (owner, manager, chef, server) with CRUD checkboxes for core resources.

Push commits, open a PR titled “Workstream C complete” against `develop`, and report status.


## Jules, execute Workstream D on branch `refactor/reports-analytics`:

Objective: Replace “Coming Soon” with a full reports dashboard.

Steps:
1. Backend Reports Endpoints
   • Create SQL views/functions for:
     – Sales totals by day/week/month
     – Sales by item and by category
     – Order volume trends
     – (Bonus) Inventory consumption rates
   • Expose via endpoints:
     – `GET /api/v1/owner/reports/sales-summary`
     – `GET /api/v1/owner/reports/by-item`
     – etc.

2. Reports UI Components
   • In `reports-client-content.tsx`, remove placeholder and:
     – Add date-range picker (start/end).
     – Render `<TimeSeriesChart data={…} />` for trends.
     – Render `<BarBreakdownChart data={…} />` for categorical breakdowns.
   • Add filters (item, category, employee) via dropdowns.

3. Chart Library & Reusable Components
   • Install and configure Recharts (or Chart.js).
   • Create `web/components/reports/TimeSeriesChart.tsx` and `BarBreakdownChart.tsx` with responsive containers.

4. Client-Side Caching
   • Use SWR or React Query to fetch report endpoints.
   • Invalidate cache on relevant data changes (orders, menu updates).

Push commits, open a PR titled “Workstream D complete” against `develop`, and report status.
