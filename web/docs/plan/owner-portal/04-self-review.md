# Self-Review: Owner Portal Plan

This document records the architectural review performed before starting
Sprint 4. Every risk listed here must be addressed before the item goes to
production.

---

## Security

### SR-1: Middleware bypass via crafted requests

**Risk**: A malicious user sends `GET /en/owner/dashboard` to a branch subdomain
without going through the normal flow.

**Mitigation**: The middleware runs on every request regardless of subdomain.
The owner-portal detection is path-based (`/{locale}/owner/…`), not host-based.
The org-membership validation query in S4-1 runs on every such request.

**Status**: Addressed in S4-1.

---

### SR-2: Active-branch cookie tampering

**Risk**: A user forges the `x-coorder-active-branch` cookie to access a branch
they are not authorised for.

**Mitigation**: The `is_org_member_for_restaurant` RPC is already called in
`getCachedUser()` to validate the cookie value. This is a `SECURITY DEFINER`
function that reads `auth.uid()` — it cannot be bypassed by the cookie value alone.

**Status**: Already handled (Sprint 2). No new risk.

---

### SR-3: Branch-scoped RLS on root domain

**Risk**: On the root domain, `set_current_restaurant_id_for_session` is not
called, causing branch-scoped RLS to fail silently (either return wrong data
or no data).

**Mitigation**: S4-1 (middleware) calls this RPC with the active-branch cookie
value when path is `/owner/…` and the cookie is present. When the cookie is
absent, `restaurantId` is `null` and branch-scoped API routes return 400
(S5-3 guard).

**Status**: Addressed in S4-1 + S5-3.

---

### SR-4: Founder role check must be server-side

**Risk**: Client-side code gates UI on `authz.canManageMembers()` but the
server-side check is missing or weak.

**Mitigation**: Every owner-portal page server component calls
`requireOwnerContext()` (S4-7), which validates the org role before rendering.
API routes use `resolveOrgContext()` + `authz.canManageMembers()` / `authz.can(permission)`.

**Status**: Addressed in S4-7. Requires code review to confirm every owner
portal page file uses `requireOwnerContext()` and not a plain `resolveOrgContext()`.

---

### SR-5: CSRF on cookie-setting endpoints

**Risk**: `PUT /api/v1/owner/organization/active-branch` sets a cookie that
controls which restaurant's data is returned. A CSRF attack could switch the
active branch.

**Mitigation**: Supabase session cookies are `HttpOnly` and `SameSite=Lax`.
The `PUT` endpoint reads the Supabase auth session to validate membership
before accepting the value. A cross-origin request cannot read or set the
session cookie.

**Status**: Acceptable risk level. No additional mitigations needed.

---

## Scalability (Target: Millions of Users)

### SC-1: Middleware DB queries on every request

**Risk**: The middleware currently performs 1–3 DB round-trips per request
(`getRestaurantForUser`, subdomain cache lookup, and now org membership check
for owner portal). At scale this is a bottleneck.

**Current mitigation**: In-process `userRestaurantCache` (5-minute TTL) already
exists. The org membership check in S4-1 adds one more query per first request,
cached in the same in-process map.

**Required for scale**: Replace in-process caches with a shared Redis/Upstash
cache so all edge instances share the same data. This is tracked in
`phase-3-api-and-database-scalability.md`. Owner portal work does not make this
worse, but the Redis migration should happen before reaching high traffic.

**Status**: Known gap, pre-existing. Not introduced by this plan.

---

### SC-2: `resolveOrgContext()` is called on every owner-portal page render

**Risk**: This function makes 3 parallel DB queries (org row, accessible
restaurant IDs, permission overrides). At high request rates this adds load.

**Mitigation short-term**: Wrap in `React.cache()` (already uses it in some
places). The cache is per-request so it avoids duplicate calls within a single
render.

**Mitigation long-term**: Embed the org context into the Supabase JWT as a
custom claim (`organization_id`, `org_role`) so the middleware can read it
without a DB query. This requires a Supabase hook to set the claim on login.
Track as a follow-up in Phase 3.

**Status**: Short-term mitigation sufficient for Sprint 4–5. Long-term noted.

---

### SC-3: Active Branch Selector fetches branch list on every page

**Risk**: Every page load on the owner portal triggers `GET /api/v1/owner/organization/restaurants`.

**Mitigation**: Cache the branch list in React state at the layout level and pass
it down as a prop. The layout renders once per navigation; child pages do not
re-fetch.

**Status**: Must be addressed in S5-1 design (do not put the selector in a leaf
component that re-fetches).

---

### SC-4: Supabase connection pooling under load

**Risk**: `supabaseAdmin` is used heavily in owner-portal queries. Under load,
the connection pool may exhaust.

**Mitigation**: The existing Supabase hosted plan includes PgBouncer. Ensure
`supabaseAdmin` is configured to use the pooled connection string
(`postgres://…?pgbouncer=true&connection_limit=1`). Verify the env var
`SUPABASE_SERVICE_ROLE_KEY` targets the pooled endpoint.

**Status**: Check infrastructure config before Sprint 5 launch.

---

## Migration Safety

### M-1: Existing founders on old subdomain sessions

**Risk**: A founder currently logged in has a valid session. When they next
navigate, they land on the branch workspace but the org pages are now stubs
that redirect to the owner portal on the root domain. If the root domain is on
a different origin, the Supabase session cookie must be readable there.

**Mitigation**: `getSharedCookieDomain()` in the middleware scopes all Supabase
cookies to `.coorder.ai`. The root domain `coorder.ai` is covered by this
wildcard. No re-login required.

**Status**: Safe. Verify the cookie domain env var is set in production.

---

### M-2: iOS app hardcoded `/dashboard` paths

**Risk**: The iOS app constructs `/dashboard/…` URLs. After the rename to
`/branch/…`, these URLs redirect via 308. If the app doesn't follow redirects,
it will break.

**Mitigation**: iOS `URLSession` follows redirects by default. The 308 redirect
is safe for the transition period. Coordinate a mobile release that updates the
hardcoded paths before removing the redirect rule.

**Status**: Add a note to the mobile team. Keep the 308 redirect permanently
until confirmed mobile releases are in the majority of active installations.

---

### M-3: SEO impact of 308 redirects

**Risk**: Search engines may have indexed `/{locale}/dashboard/` paths.

**Mitigation**: 308 (Permanent Redirect) is the correct signal to search engines
to update their index. Google processes 308 redirects equivalently to 301.
No PageRank is lost.

**Status**: No action needed beyond the `next.config.ts` redirect rule.

---

## Completeness Check

### Missing from current plan

| Gap | Where to add |
|-----|--------------|
| `owner/purchasing/page.tsx` — org purchasing summary | Sprint 5, add as S5-11 |
| `owner/promotions/page.tsx` — org promotions list | Sprint 5, add as S5-12 |
| `owner/profile/` — should this be in owner portal or branch workspace? | Decision needed: keep in branch workspace, link from owner portal header |
| Password reset redirect — currently goes to `/{locale}/dashboard`, needs to go to correct portal | Update `forgot-password` route in Sprint 4 |
| 2FA verify redirect — same issue | Update `two-factor/verify` route in Sprint 4 |
| `BranchSwitcher` component in branch workspace sidebar — still calls `/owner/` org routes | Remove from branch sidebar in S4-8; it's replaced by the owner portal |

---

## Outstanding Decisions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Should `founder_operations` and `founder_finance` be sent to the owner portal on login, or to a branch? | **Owner portal** — they manage at org level even if they can't change org settings. |
| 2 | Can a founder also be a branch staff member (dual role)? | Not supported currently. The permission system has one role per org. Branch-level staff roles (`manager`, `chef`, `server`) are the old single-restaurant roles, not org roles. |
| 3 | Where does branch `settings/` live — owner portal or branch workspace? | **Branch workspace** — it's branch-specific (language, brand colour, hours). Global org settings stay in owner portal. |
| 4 | Should the owner portal have its own logo/branding separate from the org logo? | **No** — use `ctx.organization.name` and org logo in the owner portal sidebar. |
| 5 | Do branch managers need read access to the org overview? | **No** — they should only see their branch data. The `founderRoles` check in the overview page already enforces this. |
