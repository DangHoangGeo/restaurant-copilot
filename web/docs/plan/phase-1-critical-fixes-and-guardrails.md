# Phase 1: Critical Fixes & Guardrails (Weeks 0–2)

Goal: Eliminate critical security/stability risks, standardize validation, and lay a foundation for predictable APIs. Target a 10/10 Security and Stability score.

Outcomes
- No exploitable CSS injection vectors.
- Rate limiting and CSRF protection on all state-changing and auth endpoints.
- Consistent, masked API errors with correlation IDs, logged server-side.
- Shared Zod schemas for pagination/filtering adopted by all list endpoints.
- Indexed queries for orders and dashboard metrics.

Key Workstreams and Tasks
1) CSS Injection Remediation
- Verify color sanitization in Admin layout and migrate to CSS custom properties.
  - Files: `web/app/[locale]/(restaurant)/dashboard/admin-layout-client.tsx`, `web/lib/utils/colors.ts` (or `web/lib/utils/`), `web/app/[locale]/(restaurant)/dashboard/layout.tsx`.
  - Actions:
    - Ensure sanitizeHexColor enforces regex: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ and returns a safe default on failure.
    - CreateThemeProperties should write values to :root as CSS variables only (no raw string interpolation in style tags).
    - Add unit tests for valid/invalid inputs.
  - Tests: Jest unit tests in `web/lib/utils/__tests__/colors.test.ts`.
  - Acceptance: No inline <style> with unsanitized user input; all colors flow through sanitizeHexColor; tests pass.

2) Rate Limiting
- Introduce a reusable guard and apply everywhere.
  - Files: `web/lib/server/rateLimit.ts` (new if missing), `web/app/api/**`.
  - Actions:
    - Implement token-bucket limiter using `@upstash/ratelimit` or equivalent. Export protectEndpoint(req, key, config).
    - Apply to all POST/PATCH/PUT/DELETE routes and auth endpoints.
      - Examples to update: `/api/v1/owner/orders`, `/api/v1/owner/orders/[id]/status`, `/api/v1/owner/menu/menu-items/**`, `/api/v1/owner/categories/**`, customer `/api/v1/customer/orders`, login/signup APIs.
    - Add per-IP and per-tenant limits; expose X-RateLimit-* headers.
  - Tests: Integration tests mocking limiter; confirm 429 on exceed.
  - Acceptance: All state-changing endpoints invoke protectEndpoint; headers present; tests pass.

3) CSRF Protection
- Add double-submit cookie strategy and origin checks for all sensitive actions.
  - Files: `web/lib/server/csrf.ts` (new), affected API routes under `web/app/api/**`, `web/middleware.ts` for strict Origin/Referer allowlist on mutation routes.
  - Actions:
    - generateCsrfToken(res): sets httpOnly CSRF cookie + return token for client header `x-csrf-token`.
    - validateCsrf(req): compare cookie and header; reject 403 if mismatch.
    - Enforce same-site Lax+ secure cookies in production.
    - For APIs called only by same-origin app, enforce strict Origin/Referer allowlist.
  - Tests: Unit tests for token creation/validation; route tests asserting 403 on missing/invalid token.
  - Acceptance: All POST/PATCH/DELETE verify CSRF; documented exceptions for idempotent GET.

4) Error Masking and Structured Logging
- Standardize error responses and add request correlation.
  - Files: `web/lib/server/apiError.ts`, `web/lib/logger.ts`, all API handlers.
  - Actions:
    - Wrap all errors via handleApiError({ req, err, messageKey }) returning generic message and correlationId.
    - Log server-side with level, requestId, userId, restaurantId, route, error stack.
    - Ensure NextResponse includes `x-request-id` header.
  - Tests: Route tests ensure no raw error.message leaks; correlation id present.
  - Acceptance: All routes use createApiSuccess/handleApiError; no sensitive details in responses.

5) Shared Validation (Zod) and Defensive Defaults
- Centralize schemas and enforce pagination, sorting, filtering limits.
  - Files: `web/shared/schemas/common.ts` (new), `web/lib/utils/validation.ts` (ensure exports), all list API routes.
  - Actions:
    - Define paginationSchema: { cursor?: string.uuid().optional(), page?: number.min(1).default(1), pageSize: number.int().min(1).max(100).default(25) }.
    - sortSchema with allowlisted fields per endpoint; reject unknown.
    - dateRangeSchema with max window (e.g., 92 days) unless feature-flagged.
    - Apply to `/api/v1/owner/orders`, `/api/v1/owner/categories`, `/api/v1/owner/dashboard/*`, `/api/v1/customer/orders` GET.
  - Tests: Unit tests per schema; route tests for invalid params -> 400.
  - Acceptance: All list endpoints validate input; limits enforced.

6) Database Indexes for Hot Paths
- Ensure efficient queries for orders and dashboard.
- Files: `supabase/sql/10_branch_core/keys.sql` (verify current hot-path indexes), update the canonical `supabase/sql/*` foundation if more are needed.
  - Actions:
    - Add/verify composite indexes: orders(restaurant_id, created_at DESC), orders(restaurant_id, status, created_at DESC), order_items(order_id), tables(restaurant_id), menu_items(restaurant_id, category_id).
    - Analyze query plans for `/api/v1/owner/orders` and dashboard metrics; adjust indexes.
  - Tests: Manual EXPLAIN on staging, record timings; ensure p95 query latency < 150ms for typical ranges.
  - Acceptance: Query p95 under targets in staging dataset.

Definition of Done
- Security regression tests added to CI, covering CSRF and rate limits.
- All state-changing routes protected; lint passes; no ESLint warnings.
- Documentation: `web/docs/security/guardrails.md` updated with how to extend protections.
- Rollback: Feature flags allow disabling strict date limits or CSRF checks for specific routes in emergencies.

Quality Gates and Metrics
- 0 high/critical issues in Snyk/Dependabot.
- 100% adoption of standardized error format across APIs.
- 90%+ line coverage on validation and security utilities.
- Manual pen-test checklist completed and signed off.
