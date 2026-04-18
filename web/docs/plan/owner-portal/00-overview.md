# Owner Portal — Architecture Overview

## Problem

Every user (owner, manager, chef, server) is currently routed through a
restaurant-specific subdomain (`branch.coorder.ai/dashboard/…`). The middleware
enforces that `users.restaurant_id` matches the accessed subdomain, which means:

- An owner with multiple branches can only "be" in one branch at a time.
- Org-level pages (organization settings, branch management, cross-branch overview)
  live awkwardly inside the single-branch dashboard.
- There is no concept of "managing the company" vs "operating a branch".

## Solution: Two Separate Portals

| Portal | URL pattern | Who uses it | Purpose |
|--------|-------------|-------------|---------|
| **Owner Portal** | `coorder.ai/{locale}/owner/…` | Founders, org-level roles | Manage the organization: branches, members, cross-branch reports, billing |
| **Branch Workspace** | `branch.coorder.ai/{locale}/branch/…` | Managers, staff, and founders drilling into a branch | Operate a branch: orders, menu, tables, employees, attendance |

> Note: the branch workspace route is renamed from `/dashboard/` to `/branch/`.
> See `01-route-rename.md` for the full rename plan.

## URL Structure

### Owner Portal (root domain)

```
coorder.ai/en/owner/
  dashboard/          ← org overview: cross-branch KPIs
  organization/       ← members, invites, org settings
  branches/           ← add/remove/jump-to branches
  reports/            ← org-wide sales rollup
  finance/            ← org finance rollup
  employees/          ← org-wide staff directory
  purchasing/         ← org purchasing summary
  promotions/         ← org-level promotions
```

### Branch Workspace (subdomain)

```
branch.coorder.ai/en/branch/
  (index)             ← today's metrics
  orders/
  menu/
  tables/
  employees/
  attendance/
  bookings/
  homepage/
  settings/
  reports/
  finance/
  promotions/
  purchasing/
  profile/
```

## Key Design Decisions

### 1. Root domain for Owner Portal

The `(coorder)` route group for platform admins already proves this pattern works.
Supabase auth cookies are scoped to `.coorder.ai` (see `getSharedCookieDomain()` in
`middleware.ts`), so a login on any subdomain is valid on the root domain without
re-authentication.

### 2. No subdomain matching for `/owner/` paths

The middleware's subdomain-match check (`restaurant.subdomain !== subdomain`)
must be skipped for paths under `/{locale}/owner/`. Owner portal requests are
authenticated purely via org membership.

### 3. Active-branch cookie drives branch context on the owner portal

When an owner views branch-scoped data from the owner portal (e.g., orders for a
specific branch), `restaurantId` is resolved from the `x-coorder-active-branch`
cookie. This mechanism is already built (Sprint 2). The owner portal prominently
shows an **Active Branch Selector** in the header so the owner always knows which
branch they are viewing.

### 4. RLS on root domain

The middleware currently calls `set_current_restaurant_id_for_session(restaurant_id)`
only when there is a subdomain. For owner-portal requests, this call must be made
with the active-branch cookie value so that any branch-scoped RLS-protected queries
continue to work correctly.

If no active-branch cookie is set, `restaurantId` is `null` and branch-scoped API
routes must return `400 { error: 'no_branch_selected' }` rather than silently
querying the wrong restaurant.

### 5. Login redirect split

After `POST /api/v1/auth/login`:

| User type | Redirect target |
|-----------|----------------|
| Founder (`founder_*` org role) | `coorder.ai/{locale}/owner/dashboard` |
| Branch staff / manager | `{subdomain}.coorder.ai/{locale}/branch` |
| Platform admin | `coorder.ai/{locale}/platform/…` (unchanged) |

### 6. Backwards compatibility

- Legacy `/dashboard/…` URLs redirect permanently (308) to `/branch/…`.
- Legacy `/dashboard/organization`, `/dashboard/branches`, `/dashboard/overview`
  redirect to their owner-portal equivalents.
- Existing sessions remain valid; founders are migrated on next login.

## Existing Infrastructure That Stays Unchanged

| Component | Why it needs no changes |
|-----------|------------------------|
| `resolveOrgContext()` | Already domain-agnostic |
| All `/api/v1/owner/organization/` routes | Use `resolveOrgContext()`, no subdomain dependency |
| Active-branch cookie system | Already handles multi-branch context |
| `buildAuthorizationService()` | Domain-agnostic |
| `supabaseAdmin` org/branch queries | Already bypass RLS correctly |
| iOS app | Connects to branch subdomains — branch workspace is unchanged |

## Sprints

- **Sprint 4** — `02-sprint-4.md` — Foundation: middleware, new route group, owner layout,
  branch rename, login redirect split.
- **Sprint 5** — `03-sprint-5.md` — Completion: all org pages migrated, branch-scoped
  APIs hardened, cross-branch features built out.
