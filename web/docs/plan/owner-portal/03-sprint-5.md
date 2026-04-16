# Sprint 5 — Owner Portal Completion

**Goal**: All org-level features fully migrated. Branch workspace is purely
operational. Root-domain null-`restaurantId` case is hardened. The two portals
are cleanly separated and enforced.

---

## S5-1: Active Branch Selector Component

**New file**: `web/components/features/owner/ActiveBranchSelector.tsx`

Displayed in the owner portal header. Allows the owner to pick which branch they
are currently inspecting when viewing branch-scoped data.

Behaviour:
- Fetches branch list from `GET /api/v1/owner/organization/restaurants`.
- On selection: calls `PUT /api/v1/owner/organization/active-branch` then
  reloads the current owner-portal page.
- Displays: `Viewing: [Branch Name] ▼`.
- If no branch is selected yet, shows `Select a branch`.

This is the owner-portal equivalent of the `BranchSwitcher` component used
inside the branch workspace sidebar. The two components serve the same cookie
mechanism but have different UI contexts.

---

## S5-2: `getCachedUser` — Root Domain Hardening

**File**: `web/lib/server/request-context.ts`

**Problem**: On the root domain, `users.restaurant_id` is the owner's original
branch. Without the active-branch cookie, all branch-scoped API calls silently
use the wrong restaurant.

**Changes**:
1. Add `isOwnerPortal: boolean` to the `AuthUser` interface.
2. Detect owner-portal context by checking the request path (passed in from
   middleware via a request header `x-coorder-portal: owner`) or by detecting
   that there is no subdomain and the path starts with `/owner/`.
3. When `isOwnerPortal === true` and no active-branch cookie is present:
   - Return `restaurantId: null` (do not fall back to `users.restaurant_id`).
   - Return `subdomain: null`.
4. When `isOwnerPortal === true` and active-branch cookie is present:
   - Validate the cookie via `is_org_member_for_restaurant` RPC (already done).
   - Use the cookie value as `restaurantId`.

**Middleware change**: Set a `x-coorder-portal: owner` request header when
path matches `/{locale}/owner/…`, so `getCachedUser` can detect the context
without re-parsing the URL.

---

## S5-3: Branch-Scoped API Routes — Null `restaurantId` Guard

**Files**: All `web/app/api/v1/owner/` routes that read `user.restaurantId`.

Currently, if `restaurantId` is null these routes return 401 or 500 with no
useful message. After S5-2 they will receive `null` when called from the owner
portal without a branch selected.

**Change**: Add an explicit guard at the top of each handler:
```ts
const user = await getUserFromRequest();
if (!user?.restaurantId) {
  return NextResponse.json(
    { error: 'no_branch_selected', message: 'Select an active branch first.' },
    { status: 400 }
  );
}
```

Affected route groups:
- `owner/orders/`
- `owner/categories/` + `owner/menu/`
- `owner/tables/`
- `owner/employees/`
- `owner/attendance/`
- `owner/bookings/`
- `owner/promotions/`
- `owner/purchasing/`
- `owner/reports/`
- `owner/finance/` (single-branch endpoints only; `finance/org-rollup` uses org context)
- `owner/schedules/`
- `owner/dashboard/` (metrics endpoints)
- `restaurant/settings/`

Org-level routes (`owner/organization/`, `owner/organization/members/`, etc.)
already use `resolveOrgContext()` and do not need this guard.

---

## S5-4: Cross-Branch Reports Page

**New file**: `web/app/[locale]/(owner)/owner/reports/page.tsx`

Aggregates sales across all accessible branches using `supabaseAdmin` queries
(same pattern as the org overview). Respects `accessibleRestaurantIds` from the
org context — a `founder_operations` member with `selected_shops` scope only
sees their assigned branches.

Metrics to show:
- Revenue by branch (bar chart)
- Top items per branch
- Day-over-day comparison

Uses existing `/api/v1/owner/reports/advanced-sales` logic, but aggregated.
A new API route `GET /api/v1/owner/organization/reports/summary` may be
needed (new in Sprint 5).

---

## S5-5: Cross-Branch Finance Page

**New file**: `web/app/[locale]/(owner)/owner/finance/page.tsx`

Wraps the existing `GET /api/v1/owner/finance/org-rollup` API route.
The API route already exists — only the owner portal page is new.

---

## S5-6: Cross-Branch Employees Page

**New file**: `web/app/[locale]/(owner)/owner/employees/page.tsx`

Wraps the existing `GET /api/v1/owner/organization/employees` API route.
The API route already exists — only the owner portal page is new.

---

## S5-7: Middleware — Enforce Separation

**File**: `web/middleware.ts`

Two new enforcement rules added to the middleware:

**Rule 1 — Block non-founders from owner portal**:
If path is `/{locale}/owner/…` and the user's org role is not a founder role,
redirect to their primary branch workspace:
```
https://{subdomain}.coorder.ai/{locale}/branch
```

**Rule 2 — Redirect founders away from org-level branch pages**:
If path is `/{locale}/branch/overview`, `/{locale}/branch/organization`, or
`/{locale}/branch/branches` and the user is a founder, redirect to the
corresponding owner portal URL. (These pages are redirect stubs from S4-4/S4-5,
so this is a belt-and-suspenders fallback.)

---

## S5-8: Permanent Redirects in `next.config.ts`

Replace the temporary redirect stubs (added in Sprint 4 as page files) with
static HTTP 308 redirects in the Next.js config:

```ts
async redirects() {
  return [
    // Branch workspace rename
    { source: '/:locale/dashboard/:path*', destination: '/:locale/branch/:path*', permanent: true },

    // Org pages moved to owner portal
    { source: '/:locale/branch/overview', destination: '/:locale/owner/dashboard', permanent: true },
    { source: '/:locale/branch/organization', destination: '/:locale/owner/organization', permanent: true },
    { source: '/:locale/branch/branches', destination: '/:locale/owner/branches', permanent: true },
  ];
}
```

Delete the page-file redirect stubs once these are in place.

---

## S5-9: i18n — New Translation Keys

**New files**:
```
web/messages/en/owner/portal.json
web/messages/ja/owner/portal.json
web/messages/vi/owner/portal.json
```

Keys needed:
```json
{
  "pageTitle": "Owner Portal",
  "nav_group_organization": "Organization",
  "nav_group_management": "Management",
  "nav_overview": "Overview",
  "nav_branches": "Branches",
  "nav_organization": "Settings",
  "nav_reports": "Reports",
  "nav_finance": "Finance",
  "nav_employees": "Employees",
  "nav_purchasing": "Purchasing",
  "nav_promotions": "Promotions",
  "activeBranch_label": "Viewing",
  "activeBranch_none": "Select a branch",
  "activeBranch_open": "Open Branch ↗",
  "noBranchSelected": "Select an active branch to view this data."
}
```

Existing namespaces (`owner/organization`, `owner/branches`, `owner/overview`)
are reused without changes.

---

## S5-10: Feature Flag for Owner Portal

**File**: `web/config/feature-flags.ts`

Add a flag to allow staged rollout:
```ts
ownerPortal: process.env.NEXT_PUBLIC_FEATURE_OWNER_PORTAL !== 'false', // default on
```

When `ownerPortal === false`:
- Login always redirects founders to the branch workspace (old behaviour).
- The `/owner/` middleware block is skipped.

This allows reverting to the old flow without a code deploy if issues arise.

---

## Sprint 5 Acceptance Criteria

- [ ] Owner portal loads on root domain without any subdomain in the URL.
- [ ] Active Branch Selector is visible and functional in the owner portal header.
- [ ] Branch-scoped API routes return `400 no_branch_selected` when no branch cookie.
- [ ] Cross-branch reports, finance, and employees pages render correctly.
- [ ] Non-founders cannot access `/owner/` routes.
- [ ] Founders visiting old `/branch/organization` are redirected to `/owner/organization`.
- [ ] All 308 redirects are in `next.config.ts`; page-file redirect stubs are deleted.
- [ ] New i18n keys exist in en/ja/vi.
- [ ] `ownerPortal` feature flag disables the new flow when set to `false`.
- [ ] `npm run build` and `npm run lint` pass.
