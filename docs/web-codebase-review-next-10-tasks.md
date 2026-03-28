# Web Codebase Deep Review: Recommended Next 10 Tasks

This review focuses on the **web app** (`/web`) and prioritizes high-leverage work that improves reliability, security, developer velocity, and user experience.

## Current Snapshot (high signal)

- The project has a strong foundation: Next.js App Router, TypeScript strict mode, next-intl, Supabase SSR/auth, and reusable UI primitives.
- However, several cross-cutting concerns are partially implemented or inconsistent (security middleware, API protection, tests, platform UX, and loading/error states).
- There is already an internal API abstraction (`createApiHandler`) for authz/rate-limit/validation, but most API routes are still ad hoc.

---

## Priority Tasks (Top 10)

## 1) Standardize API protection and authorization across all API routes
**Why now:** `createApiHandler` already centralizes auth, authorization, validation, and protection logic, but many routes still bypass it.

**Evidence:**
- Shared API handler with built-in protection exists (`lib/server/apiHandler.ts`).
- Some core auth routes still use custom in-memory rate limiter logic (`app/api/v1/auth/login/route.ts`, `app/api/v1/auth/register/route.ts`).
- Settings mutation route explicitly notes missing role-based authorization (`app/api/v1/restaurant/settings/route.ts`).

**Action:**
- Migrate API routes incrementally to `createApiHandler`.
- Enforce role checks for every mutating owner/platform route.
- Remove bespoke per-route protection code after migration.

**Definition of done:**
- All write routes use shared protection + explicit role authorization.
- No TODOs remain for authorization in critical write routes.

---

## 2) Replace in-memory auth rate limiting with durable shared limiter everywhere
**Why now:** in-memory counters reset per instance/redeploy and do not coordinate across replicas.

**Evidence:**
- Auth routes maintain local `ipCounters` objects in-process (`app/api/v1/auth/login/route.ts`, `app/api/v1/auth/register/route.ts`).
- A reusable Upstash-backed limiter already exists (`lib/server/rateLimit.ts`).

**Action:**
- Move all auth endpoints (login/register/forgot-password/2FA) to the shared Upstash limiter path.
- Emit consistent 429 error shapes for frontend handling.

**Definition of done:**
- No auth endpoint uses local memory token buckets.
- 429 responses include consistent error schema and retry hints.

---

## 3) Implement a real test command and CI-quality test gate
**Why now:** test dependencies and test files exist, but there is no `npm test` script, so tests are not operational via standard workflow.

**Evidence:**
- Jest config and setup are present (`web/jest.config.ts`, `web/jest.setup.ts`).
- Existing unit tests exist in `lib/**/__tests__`.
- `package.json` scripts do not include `test`.

**Action:**
- Add scripts: `test`, `test:watch`, `test:coverage`.
- Ensure tests run in CI/local with a single documented command.

**Definition of done:**
- `npm test` passes from `/web`.
- Coverage threshold and failure policy are defined.

---

## 4) Fix current lint warnings and raise linting strictness incrementally
**Why now:** current warnings signal stale closure / hook dependency risk in platform overview components.

**Evidence:**
- Missing dependency warnings in platform overview components (`components/platform/overview-metrics.tsx`, `components/platform/overview-trends.tsx`).

**Action:**
- Refactor data-fetch hooks/callbacks to remove `react-hooks/exhaustive-deps` warnings.
- Introduce "no warnings" policy for changed files.

**Definition of done:**
- `npm run lint` shows zero warnings on touched scope.

---

## 5) Harden CSP and security header policy to reduce XSS risk
**Why now:** CSP currently permits `'unsafe-inline'` and `'unsafe-eval'` for scripts, weakening protection.

**Evidence:**
- CSP includes permissive script directives in middleware (`web/middleware.ts`).

**Action:**
- Remove `unsafe-eval` first, then phase out inline script allowances using nonce/hash strategy.
- Add report-only rollout before enforcement tightening.

**Definition of done:**
- Production CSP no longer includes `unsafe-eval`.
- CSP violations are monitored and triaged.

---

## 6) Complete platform admin UX TODOs (logout and locale switching)
**Why now:** core platform header actions are marked TODO and currently use brittle direct `window.location` behavior.

**Evidence:**
- Explicit TODO markers for logout and locale switching (`components/platform/platform-header.tsx`).

**Action:**
- Implement robust logout flow through API + router.
- Implement locale switching with route helpers rather than string replacement.

**Definition of done:**
- Header actions work reliably across nested routes and locale-prefixed paths.

---

## 7) Improve customer-side error handling and feedback loops
**Why now:** customer checkout/order flow still has TODO placeholders for user-facing error handling.

**Evidence:**
- TODOs for toast/redirect behavior in customer layout order flow (`components/features/customer/layout/CustomerLayout.tsx`).

**Action:**
- Add localized toast/error banners for session missing, restaurant missing, and order API failures.
- Track error categories in logs/analytics.

**Definition of done:**
- No silent failures in order placement.
- All common failure paths show actionable localized UI feedback.

---

## 8) Unify loading/error empty states with shared UX primitives
**Why now:** some pages still use placeholder loading UI with TODO comments rather than consistent skeleton components.

**Evidence:**
- Menu dashboard has TODO to replace temporary spinner/loading UI (`app/[locale]/(restaurant)/dashboard/menu/menu-client-content.tsx`).

**Action:**
- Standardize with reusable loading, empty, and error patterns from `components/ui/states` and skeletons.
- Apply to menu/orders/reports/platform pages.

**Definition of done:**
- All major dashboard surfaces use a consistent state-system (loading/error/empty/success).

---

## 9) Remove duplicate/legacy files and tighten type boundaries
**Why now:** duplicate components and permissive TS settings increase maintenance drag.

**Evidence:**
- Duplicate 2FA form file appears present (`components/features/profile/TwoFactorAuthForm.tsx` and `components/features/profile/TwoFactorAuthForm-new.tsx`).
- TypeScript config still allows JS files (`web/tsconfig.json`, `allowJs: true`).

**Action:**
- Remove unused duplicate files after confirming references.
- Set `allowJs: false` once any JS stragglers are migrated.

**Definition of done:**
- Duplicate profile component removed.
- Type boundaries are stricter and migration plan documented.

---

## 10) Clean up feature flag behavior and migration hygiene
**Why now:** feature flags should be controlled by environment; migration numbering should be deterministic.

**Evidence:**
- `lowStockAlerts` is effectively always on due to `|| true` (`web/config/feature-flags.ts`).
- Migration folder contains duplicate numbering (`infra/migrations/012_*.sql` appears twice).

**Action:**
- Make all flags environment-driven with explicit defaults.
- Adopt monotonic migration naming convention and CI check for duplicates.

**Definition of done:**
- Feature flags are predictable across environments.
- Migration naming collisions are prevented automatically.

---

## Suggested execution order (first 6 weeks)

1. API protection + durable rate limiting (Tasks 1–2)
2. Testing + lint stabilization (Tasks 3–4)
3. Security hardening (Task 5)
4. UX completion for platform/customer flows (Tasks 6–8)
5. Maintenance cleanup and governance (Tasks 9–10)

This sequence balances **risk reduction first** (security/reliability) and **velocity gains** (testability/consistency), then UX polish.
