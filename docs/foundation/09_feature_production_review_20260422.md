# Feature Production Review

Date: 2026-04-22

## Scope

This review checks the current web and Supabase-backed product surfaces against the new canonical foundation.

The target bar is:

- stable multi-branch founder operations
- explicit and auditable permissions
- customer ordering that does not break
- production-safe performance for long-lived growth
- security posture aligned with strong modern app guidance such as centralized access control, distributed rate limiting, least privilege, auditable privileged actions, and atomic money/order flows

This is a readiness review, not a promise that every route is equally production-ready.

## Executive Summary

The new Supabase foundation is materially stronger than the runtime application layer above it.

What is strong now:

- org-aware owner foundation under `web/app/api/v1/owner/organization/*`
- centralized org authorization in `web/lib/server/authorization/service.ts`
- platform admin route guarding through `web/lib/platform-admin.ts`
- public restaurant and menu resolution based on canonical customer-entry context

What is still holding the product back from an enterprise claim:

- mixed authorization models between org-aware control code and legacy single-restaurant role code
- process-local rate limiting on auth-critical routes
- public session and ordering flows that still rely on weak join secrets and non-atomic write sequences
- some legacy routes that no longer match the canonical database contract
- admin analytics paths that still compute from raw tables instead of stable reporting surfaces

## Highest Priority Findings

### 1. Customer session and ordering flows are not yet production-safe

Why this matters:

- these are direct revenue paths
- they must be atomic, abuse-resistant, and consistent under failure

Evidence:

- `web/app/api/v1/customer/session/create/route.ts`
  - uses `GET` to create a new session and order
  - returns a passcode derived from the last 4 characters of the order id
- `web/app/api/v1/customer/session/join/route.ts`
  - accepts that derived passcode as the session gate
- `web/app/api/v1/customer/orders/create/route.ts`
  - updates the parent order and inserts order items in separate non-transactional steps
  - even documents the inconsistency risk in comments
- `web/app/api/v1/customer/orders/[orderId]/route.ts`
  - exposes order details by `orderId` plus `restaurantId` without a stronger session-bound proof
- `web/app/api/v1/customer/orders/history/route.ts`
  - still queries `order_sessions`, which is not part of the current canonical Supabase foundation

Required direction:

- move customer session creation, join validation, and item insertion to canonical RPCs
- use random high-entropy join secrets, not identifier-derived passcodes
- use `POST` for session creation and other state changes
- require a session-scoped proof for customer order reads

### 2. Auth throttling is still not enterprise-grade

Why this matters:

- brute-force resistance must survive multiple instances and serverless scale

Evidence:

- `web/app/api/v1/auth/register/route.ts`
  - uses an in-process token bucket via `ipCounters`
- `web/app/api/v1/auth/login/route.ts`
  - uses the same in-process token bucket pattern
- `web/lib/server/rateLimit.ts`
  - disables rate limiting entirely when Upstash is not configured
  - allows some mutation traffic through when origin or referer is absent

Required direction:

- make distributed rate limiting mandatory in staging and production
- move auth routes onto the shared hardened limiter
- tighten mutation protection so the secure path is the default, not a best-effort fallback

### 3. Access control is still split between two systems

Why this matters:

- broken access control is the most dangerous long-term regression class in a multi-branch product

Evidence:

- `web/lib/server/authorization/service.ts`
  - clean org-aware model and the right target
- `web/lib/server/rolePermissions.ts`
  - legacy single-restaurant role matrix
- `web/lib/server/apiHandler.ts`
  - still requires `user.restaurantId` and legacy resource checks
- `web/lib/server/organizations/branch-route.ts`
  - still grants a legacy `owner` or `manager` fast path when `user.restaurantId === branchId`
- many routes under `web/app/api/v1/owner/*` and `web/app/api/v1/restaurant/*`
  - still depend on the legacy model

Required direction:

- continue migrating privileged routes to org-aware authz
- shrink legacy access paths behind explicit compatibility boundaries
- stop expanding `users.role` as an authority source

### 4. Some runtime routes no longer cleanly match the canonical foundation

Why this matters:

- the product can look healthy while specific flows are already broken against the new database truth

Evidence:

- `web/app/api/v1/customer/orders/history/route.ts`
  - references `order_sessions`
- `web/app/api/v1/customer/menu/reorder/route.ts`
  - still contains placeholder session logic and a mock restaurant id fallback
- `web/app/api/v1/owner/schedules/[scheduleId]/route.ts`
  - still resolves restaurant scope through placeholder session logic and a mock restaurant id fallback

Required direction:

- remove or repair endpoints that still depend on pre-foundation assumptions
- add contract tests for customer ordering and legacy compatibility surfaces

### 5. Platform analytics still rely too much on raw table scans

Why this matters:

- enterprise-readiness includes predictable performance as data volume grows

Evidence:

- `web/app/api/v1/platform/overview/route.ts`
  - loads all restaurants and subscriptions, then calculates metrics in memory
- `web/app/api/v1/platform/usage/route.ts`
  - uses better snapshot data, but still performs range scans directly for trend assembly
- `web/app/api/v1/owner/organization/overview/route.ts`
  - computes branch KPIs from raw orders for the request

Required direction:

- move platform and founder overview metrics onto snapshot or aggregate RPC surfaces
- reserve raw table reads for drill-down views, not overview dashboards

## Feature Matrix

Status legend:

- `production-strong`
- `transitional`
- `not production-safe yet`

## Founder / Owner

### Registration and login

Status: `transitional`

Current state:

- signup and login work
- CAPTCHA is present
- bootstrap into restaurant plus organization exists

Primary concerns:

- process-local rate limiting
- login path contains fallback logic that can recreate missing `users` rows from auth metadata
- the auth surface still depends heavily on legacy `users.restaurant_id`

Key files:

- `web/app/api/v1/auth/register/route.ts`
- `web/app/api/v1/auth/login/route.ts`
- `web/lib/server/request-context.ts`

### Pending approval and owner blocking

Status: `transitional`

Current state:

- request context nulls the effective `restaurantId` for blocked owner accounts
- this is a practical safety guard for suspended or unapproved restaurants

Primary concerns:

- the guard still lives inside a legacy request-context shape
- owner experience and route behavior still depend on that compatibility layer

Key files:

- `web/lib/server/request-context.ts`

### Organization overview

Status: `production-strong`

Current state:

- built on resolved org context
- filters to accessible branches
- aligns with the new ownership model

Primary concerns:

- overview metrics should eventually come from snapshots for large organizations

Key files:

- `web/app/api/v1/owner/organization/overview/route.ts`
- `web/lib/server/authorization/service.ts`

### Organization members, invites, and permissions

Status: `production-strong`

Current state:

- centralized org-context resolution
- founder-only member management
- clear permission ownership

Primary concerns:

- add stronger integration coverage for invite lifecycle and permission overrides

Key files:

- `web/app/api/v1/owner/organization/members/route.ts`
- `web/app/api/v1/owner/organization/members/[memberId]/permissions/route.ts`
- `web/app/api/v1/owner/organization/invites/route.ts`

### Branch switching and cross-branch access

Status: `transitional`

Current state:

- new active-branch and org-context machinery exists
- branch route activation supports multi-branch movement

Primary concerns:

- legacy branch fast path still exists for single-restaurant owner or manager records

Key files:

- `web/lib/server/organizations/branch-route.ts`
- `web/app/api/v1/owner/organization/active-branch/route.ts`

### Shared menu and org-level menu workflows

Status: `production-strong`

Current state:

- new org-aware shared menu routes exist
- this aligns with the branch-first plus inheritance-aware foundation

Primary concerns:

- keep branch-resolved menu behavior explicit when extending sync and copy flows

Key files:

- `web/app/api/v1/owner/organization/shared-menu/route.ts`
- `web/app/api/v1/owner/organization/menu/copy/route.ts`
- `web/app/api/v1/owner/organization/menu/compare/route.ts`

### Branch operational owner APIs

Status: `transitional`

Current state:

- core route coverage exists for tables, orders, employees, attendance, purchasing, bookings, reports, and settings

Primary concerns:

- large parts of this surface still rely on `getUserFromRequest`, `checkAuthorization`, `user.restaurantId`, and `supabaseAdmin`
- this is compatible, but not the final security model

Key files:

- `web/app/api/v1/owner/orders/route.ts`
- `web/app/api/v1/owner/employees/route.ts`
- `web/app/api/v1/owner/menu/menu-items/route.ts`
- `web/lib/server/apiHandler.ts`
- `web/lib/server/rolePermissions.ts`

### Finance, reports, and exports

Status: `transitional`

Current state:

- org-aware finance routes exist
- legacy reporting routes also still exist

Primary concerns:

- reporting remains split across old and new access models
- overview surfaces still rely on raw reads more than stable reporting tables

Key files:

- `web/app/api/v1/owner/organization/finance/*`
- `web/app/api/v1/owner/reports/*`
- `web/app/api/v1/owner/dashboard/*`

## Platform Admin

### Organization approvals

Status: `production-strong`

Current state:

- centralized platform-admin gate
- clear service ownership for pending organizations and approval actions

Key files:

- `web/app/api/v1/platform/organizations/pending/route.ts`
- `web/app/api/v1/platform/organizations/[id]/approval/route.ts`
- `web/lib/platform-admin.ts`

### Restaurant verify and suspend

Status: `production-strong`

Current state:

- centralized platform-admin auth
- audit logging hooks are present

Primary concerns:

- extend with stronger end-to-end tests for verify, suspend, and re-enable flows

Key files:

- `web/app/api/v1/platform/restaurants/[id]/verify/route.ts`
- `web/app/api/v1/platform/restaurants/[id]/suspend/route.ts`

### Support tickets

Status: `production-strong`

Current state:

- guarded platform routes
- pagination and filtering exist
- reply flow is separated cleanly

Primary concerns:

- continue watching message volume growth and index needs

Key files:

- `web/app/api/v1/platform/support-tickets/route.ts`
- `web/app/api/v1/platform/support-tickets/[id]/route.ts`
- `web/app/api/v1/platform/support-tickets/[id]/reply/route.ts`

### Platform overview and usage

Status: `transitional`

Current state:

- route protection is solid
- usage snapshots and summary RPCs are already being used in part

Primary concerns:

- overview still performs in-memory calculations from full datasets
- this will become a performance and cost liability as tenant count grows

Key files:

- `web/app/api/v1/platform/overview/route.ts`
- `web/app/api/v1/platform/usage/route.ts`

## Branch Users / Staff

### Daily order operations

Status: `transitional`

Current state:

- routes exist for creating, listing, and updating orders
- some flows already call canonical database functions

Primary concerns:

- branch operations still mostly trust the legacy single-restaurant user model
- cross-route consistency is not yet fully centralized

Key files:

- `web/app/api/v1/owner/orders/route.ts`
- `web/app/api/v1/owner/orders/[orderId]/status/route.ts`

### Employee management

Status: `transitional`

Current state:

- employee list and invite flows exist

Primary concerns:

- invite, `users` insert, and `employees` insert are not handled as a single atomic unit
- failure leaves cleanup and rollback gaps

Key files:

- `web/app/api/v1/owner/employees/route.ts`

### Attendance, schedules, purchasing, and branch finance

Status: `transitional`

Current state:

- these feature families exist and map to the new domain foundation

Primary concerns:

- most runtime routes are still legacy-authz surfaces
- at least one schedule mutation route still contains placeholder restaurant resolution
- these areas need targeted actor-flow tests before an enterprise claim

Key files:

- `web/app/api/v1/owner/attendance/*`
- `web/app/api/v1/owner/schedules/route.ts`
- `web/app/api/v1/owner/purchasing/*`
- `web/app/api/v1/owner/reports/*`

## Public Customer

### Restaurant discovery and branch context resolution

Status: `production-strong`

Current state:

- public restaurant resolution uses branch and org-aware customer-entry helpers
- this matches the new branch-first public model

Key files:

- `web/app/api/v1/customer/restaurant/route.ts`
- `web/app/api/v1/customer/entry/resolve/route.ts`
- `web/lib/server/customer-entry.ts`

### Public menu read

Status: `production-strong`

Current state:

- menu lookup is resolved through canonical public context
- response caching is present

Primary concerns:

- keep read caching in sync with menu invalidation rules as menu inheritance grows

Key files:

- `web/app/api/v1/customer/menu/route.ts`

### Session create and join

Status: `not production-safe yet`

Primary concerns:

- `GET` performs state changes
- session join secret is weak and derived from order id
- no strong abuse controls are visible on the public join path

Key files:

- `web/app/api/v1/customer/session/create/route.ts`
- `web/app/api/v1/customer/session/join/route.ts`

### Customer order create and order status views

Status: `not production-safe yet`

Primary concerns:

- order writes are not atomic
- order read access is not strongly session-bound
- one history path references a non-canonical table

Key files:

- `web/app/api/v1/customer/orders/create/route.ts`
- `web/app/api/v1/customer/orders/[orderId]/route.ts`
- `web/app/api/v1/customer/orders/history/route.ts`

### Reviews and promotions

Status: `transitional`

Current state:

- feature routes exist

Primary concerns:

- these paths were not the deepest part of this pass
- they should be included in the next customer-flow end-to-end review after session and ordering are repaired

Key files:

- `web/app/api/v1/customer/reviews/create/route.ts`
- `web/app/api/v1/customer/promotions/*`

## Ten-Year Hardening Priorities

If the goal is to minimize future migrations and keep the system stable for the next decade, do these next:

1. Make org-aware authorization the only privileged control model.
2. Make distributed rate limiting mandatory for all auth and public mutation paths.
3. Move customer session creation, join validation, and order writes into canonical transactional RPCs.
4. Replace identifier-derived passcodes with random secrets or signed session tokens.
5. Remove all `GET` routes that mutate state.
6. Move founder and platform overviews onto snapshot and aggregate reporting surfaces.
7. Add end-to-end CI coverage for founder, platform admin, and customer ordering flows.
8. Remove or explicitly quarantine legacy endpoints that no longer match the canonical Supabase contract.

## Recommended Release Gates

Do not claim enterprise readiness across all actors until these gates are true:

- no privileged owner route depends on `checkAuthorization` or the old `rolePermissions` matrix
- no auth-critical route uses process-local rate limiting
- customer session and order flows are transactional and abuse-resistant
- customer order reads require stronger proof than `orderId` plus branch identity
- platform and founder dashboards read from stable aggregate surfaces, not full raw scans
- every critical actor has at least one passing local-stack end-to-end flow in CI

## Review Basis

This review was based on:

- required foundation docs under `docs/foundation/*`
- current route inventory across owner, platform, restaurant, and customer APIs
- authorization and request-context services
- targeted inspection of the highest-risk runtime paths

It should be updated whenever:

- a legacy route family is migrated or deleted
- customer ordering/session architecture changes
- platform or founder reporting moves to new aggregate surfaces
- the org authorization model becomes the only privileged path
