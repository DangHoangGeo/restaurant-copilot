# Sprint 4 — Owner Portal Foundation

**Goal**: An owner can log in and land on a functional owner portal on the root
domain. The branch workspace rename is complete. Org management pages are migrated.
The branch workspace remains fully operational.

---

## S4-0: Branch Workspace Rename (`/dashboard/` → `/branch/`)

**Priority**: Do this first. All subsequent tasks reference `/branch/` paths.

**What**: Mechanical rename of the `dashboard/` route directory to `branch/` and
update of every internal reference. Full detail in `01-route-rename.md`.

**Files changed**:
- `web/app/[locale]/(restaurant)/dashboard/` → `branch/` (git mv)
- `web/middleware.ts` — update regex patterns
- `web/app/api/v1/auth/login/route.ts` — update redirect URL
- `web/app/api/v1/auth/register/route.ts` — update redirect URL
- `web/contexts/RestaurantContext.tsx` — update onboarding path
- `web/components/features/admin/dashboard/layout/admin-sidebar.tsx` — update hrefs
- `next.config.ts` — add 308 redirect from `/dashboard/:path*` → `/branch/:path*`

**Verification**: `npm run build` passes; visiting `branch.localhost:3000/en/branch`
works; visiting `branch.localhost:3000/en/dashboard` redirects.

---

## S4-1: Middleware — Owner Portal Mode

**File**: `web/middleware.ts`

**What**: Add a detection block for paths `/{locale}/owner/…` that:
1. Requires authenticated user (redirect to login otherwise).
2. Skips `getRestaurantForUser` and the subdomain-match check entirely.
3. Validates org membership via a lightweight admin query:
   ```ts
   supabaseAdmin
     .from('organization_members')
     .select('role')
     .eq('user_id', userId)
     .eq('is_active', true)
     .maybeSingle()
   ```
4. Redirects non-org-members to `/{locale}/branch` on their subdomain.
5. Calls `set_current_restaurant_id_for_session(activeBranchCookie)` if the
   active-branch cookie is present, so branch-scoped RLS works correctly on the
   root domain.
6. No onboarding redirect — owners do not go through the restaurant onboarding
   flow on the owner portal.

**Insert point**: Add the owner-portal block immediately before the existing
`dashboard` protection block (line ~381).

---

## S4-2: New `(owner)` Route Group

**Create**:
```
web/app/[locale]/(owner)/
  owner/
    layout.tsx
    dashboard/
      page.tsx
    organization/
      page.tsx
      organization-client.tsx   (copy from dashboard/organization)
    branches/
      page.tsx
      branches-client.tsx       (copy from dashboard/branches)
```

All pages in this group call `resolveOrgContext()` directly — no
`getUserFromRequest()` dependency.

---

## S4-3: Owner Portal Layout

**New file**: `web/app/[locale]/(owner)/owner/layout.tsx`

Responsibilities:
- Call `resolveOrgContext()` to get org + member data.
- Redirect to `/{locale}/login` if no org context.
- Redirect to `/{locale}/branch` (on subdomain) if member is not a founder role.
- Render `OwnerSidebar` (see below).
- Does **not** wrap children in `RestaurantContext.Provider` — org context is
  provided via a new `OrgContext` (or passed as props).

**New file**: `web/components/features/owner/OwnerSidebar.tsx`

Navigation:
```
[Org name + logo]                     ← from ctx.organization

Organization
  ○ Overview         /owner/dashboard
  ○ Branches         /owner/branches
  ○ Settings         /owner/organization

Management
  ○ Reports          /owner/reports
  ○ Finance          /owner/finance
  ○ Employees        /owner/employees
  ○ Purchasing       /owner/purchasing
  ○ Promotions       /owner/promotions

[Active branch selector]              ← shows current branch, allows switching
[Open Branch ↗]                       ← links to branch.coorder.ai/en/branch
```

Conditional nav: items gated by `authz.can(permission)` so a `founder_finance`
member does not see Employees or Promotions.

---

## S4-4: Owner Dashboard (Org Overview)

**New file**: `web/app/[locale]/(owner)/owner/dashboard/page.tsx`

Logic: copy from `(restaurant)/branch/overview/page.tsx` (after rename).
The `OverviewClient` component is reused without changes.

**Old page**: `branch/overview/page.tsx` becomes a redirect stub:
```tsx
redirect(`/${locale}/owner/dashboard`);
```

---

## S4-5: Organization & Branches Pages Migration

Move the server data-fetching logic; reuse the existing client components.

**New files** (thin wrappers that call `resolveOrgContext()` and render existing clients):
- `web/app/[locale]/(owner)/owner/organization/page.tsx`
- `web/app/[locale]/(owner)/owner/branches/page.tsx`

**Old pages** become redirect stubs:
```tsx
// branch/organization/page.tsx
redirect(`/${locale}/owner/organization`);

// branch/branches/page.tsx
redirect(`/${locale}/owner/branches`);
```

---

## S4-6: Login Redirect Split

**File**: `web/app/api/v1/auth/login/route.ts`

After resolving `restaurantId`, add an org membership check:
```ts
const { data: orgMember } = await supabaseAdmin
  .from('organization_members')
  .select('role')
  .eq('user_id', data.user.id)
  .eq('is_active', true)
  .maybeSingle();

const isFounder = orgMember?.role?.startsWith('founder_') ?? false;

const redirectUrl = isFounder
  ? buildOwnerPortalUrl(defaultLanguage, isDevelopment, productionUrl)
  : buildBranchWorkspaceUrl(restaurantSubdomain, defaultLanguage, isDevelopment, productionUrl);
```

Extract two small helper functions to keep the login handler readable:
- `buildOwnerPortalUrl(locale, isDev, prodUrl): string`
- `buildBranchWorkspaceUrl(subdomain, locale, isDev, prodUrl): string`

---

## S4-7: Owner Auth Guard Helper

**New file**: `web/lib/server/owner/require-owner-context.ts`

```ts
export async function requireOwnerContext(locale: string): Promise<
  { ctx: OrgContext; authz: AuthorizationService } | NextResponse
> {
  const ctx = await resolveOrgContext();
  if (!ctx) return unauthorized();

  const authz = buildAuthorizationService(ctx)!;

  const founderRoles: OrgMemberRole[] = [
    'founder_full_control',
    'founder_operations',
    'founder_finance',
  ];
  if (!founderRoles.includes(ctx.member.role)) {
    return NextResponse.redirect(new URL(`/${locale}/branch`, ...));
  }

  return { ctx, authz };
}
```

All owner portal page server components call this at the top instead of calling
`resolveOrgContext()` directly.

---

## S4-8: Branch Sidebar Cleanup

**File**: `web/components/features/admin/dashboard/layout/admin-sidebar.tsx`

Remove from nav (these items now live in the owner portal):
- `Overview` → `/branch/overview`
- `Organization` → `/branch/organization`
- `Branches` → `/branch/branches`

Keep all operational items (orders, menu, tables, employees, finance, reports, etc.).

Rename the component file's directory from `admin/dashboard/layout/` to
`admin/branch/layout/` to match the new naming convention (optional, low priority,
can be a follow-up).

---

## S4-9: Accept-Invite Redirect

**File**: `web/app/api/v1/auth/accept-invite/route.ts`

After accepting an invite, redirect based on role:
```ts
const isFounder = member.role.startsWith('founder_');
const redirectUrl = isFounder
  ? buildOwnerPortalUrl(...)
  : buildBranchWorkspaceUrl(subdomain, ...);
```

---

## Sprint 4 Acceptance Criteria

- [ ] `coorder.ai/en/owner/dashboard` loads the org overview for founders.
- [ ] `coorder.ai/en/owner/organization` shows org members and settings.
- [ ] `coorder.ai/en/owner/branches` shows all branches with "Open" links.
- [ ] Logging in as a founder redirects to the owner portal, not a subdomain.
- [ ] Logging in as a manager redirects to `{subdomain}.coorder.ai/en/branch`.
- [ ] `{subdomain}.coorder.ai/en/branch` works (renamed from `/dashboard`).
- [ ] `{subdomain}.coorder.ai/en/dashboard` redirects to `/branch` (308).
- [ ] Non-founders are blocked from `/owner/` routes (403 or redirect).
- [ ] `npm run build` passes with no TypeScript errors.
