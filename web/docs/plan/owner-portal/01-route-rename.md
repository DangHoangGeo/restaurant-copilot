# Route Rename: `/dashboard/` → `/branch/`

## Why rename?

`/dashboard` is generic and ambiguous now that two distinct portals exist:
- Owner portal at `/owner/…`
- Branch workspace at `/dashboard/…` (current)

Renaming to `/branch/` makes the intent explicit:
`branch.coorder.ai/en/branch/orders` = "I am operating this branch's orders".

## Scope

All routes inside:
```
web/app/[locale]/(restaurant)/dashboard/
```
become:
```
web/app/[locale]/(restaurant)/branch/
```

The Next.js route group `(restaurant)` stays the same — only the `dashboard`
directory is renamed to `branch`.

## Files That Change

### App Router pages (mechanical rename)

| Old path | New path |
|----------|----------|
| `dashboard/layout.tsx` | `branch/layout.tsx` |
| `dashboard/page.tsx` | `branch/page.tsx` |
| `dashboard/loading.tsx` | `branch/loading.tsx` |
| `dashboard/admin-layout-client.tsx` | `branch/admin-layout-client.tsx` |
| `dashboard/orders/` | `branch/orders/` |
| `dashboard/menu/` | `branch/menu/` |
| `dashboard/tables/` | `branch/tables/` |
| `dashboard/employees/` | `branch/employees/` |
| `dashboard/attendance/` (if exists) | `branch/attendance/` |
| `dashboard/bookings/` | `branch/bookings/` |
| `dashboard/homepage/` | `branch/homepage/` |
| `dashboard/settings/` | `branch/settings/` |
| `dashboard/reports/` | `branch/reports/` |
| `dashboard/finance/` | `branch/finance/` |
| `dashboard/promotions/` | `branch/promotions/` |
| `dashboard/purchasing/` | `branch/purchasing/` |
| `dashboard/profile/` | `branch/profile/` |
| `dashboard/staff/` | `branch/staff/` |
| `dashboard/onboarding/` | `branch/onboarding/` |

Org-level pages (`overview/`, `organization/`, `branches/`) are **not** renamed
here — they move to the owner portal (see `02-sprint-4.md`).

### Middleware (`web/middleware.ts`)

```ts
// Before
.match(new RegExp(`^/${locale}/dashboard(/.*)?$`))
// After
.match(new RegExp(`^/${locale}/branch(/.*)?$`))
```

Also update the onboarding redirect:
```ts
// Before
redirect(`/${locale}/dashboard/onboarding`)
// After
redirect(`/${locale}/branch/onboarding`)
```

### Login route (`web/app/api/v1/auth/login/route.ts`)

```ts
// Before
`http://${subdomain}.localhost:3000/${lang}/dashboard`
// After
`http://${subdomain}.localhost:3000/${lang}/branch`
```

### RestaurantContext (`web/contexts/RestaurantContext.tsx`)

```ts
// Before
pathname.includes('/dashboard/onboarding')
router.push(`/${locale}/dashboard/onboarding`)
// After
pathname.includes('/branch/onboarding')
router.push(`/${locale}/branch/onboarding`)
```

### Admin sidebar (`web/components/features/admin/dashboard/layout/admin-sidebar.tsx`)

All `href` values change from `/dashboard/…` to `/branch/…`.

### Redirect rule in `next.config.ts`

```ts
async redirects() {
  return [
    {
      source: '/:locale/dashboard/:path*',
      destination: '/:locale/branch/:path*',
      permanent: true,   // 308 — SEO-safe
    },
  ];
}
```

This covers any bookmarked links or external references to the old path.

### Internal `href` references

Search and replace across the entire `web/` directory:
- `/dashboard` → `/branch` (in `href`, `router.push`, `redirect`, `NextResponse.redirect`)
- Exclude: `web/docs/` (documentation should reference both names during transition)

Key files with hardcoded dashboard paths:
- All `page.tsx` files that call `redirect()`
- All client components that call `router.push()`
- `web/app/api/v1/auth/accept-invite/route.ts`
- `web/app/api/v1/auth/register/route.ts`
- `web/components/features/admin/organization/BranchSwitcher.tsx`

## Execution Order (within Sprint 4)

1. Add the 308 redirect rule to `next.config.ts` first (safety net for live users).
2. Rename the directory in git: `git mv web/app/[locale]/\(restaurant\)/dashboard web/app/[locale]/\(restaurant\)/branch`
3. Update all `href`, `redirect()`, `router.push()` references.
4. Update middleware regex patterns.
5. Update login + register + accept-invite redirect URLs.
6. Update `RestaurantContext.tsx`.
7. Run `npm run build` to catch any remaining references.

## iOS App Impact

The iOS SwiftUI app constructs URLs to the branch dashboard. All hardcoded
`/dashboard` path segments must be updated to `/branch`. Coordinate with the
mobile build before removing the 308 redirect (keep it for at least one release
cycle).

Search in `mobile/SOder/SOder/` for: `"dashboard"` in URL construction strings.
