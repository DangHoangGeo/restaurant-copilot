# Supabase Foundation Review 2026-04-22

## Scope

This review covered:

- canonical SQL under `supabase/sql/*`
- bootstrap ordering in `supabase/bootstrap.sql`
- operational Edge Functions under `supabase/functions/*`

The intent was to validate that the new foundation is not just a flattened history, but a maintainable baseline for long-term product work.

## What Is Strong Now

- The database has a single canonical home under `supabase/`.
- Domain boundaries are visible and map to product ownership.
- Cross-domain dependency order is explicit in bootstrap.
- The org-over-branch model exists without collapsing branch operations into the control plane.
- Attendance, finance, platform support, and shared-menu concepts are modeled separately instead of being buried in generic tables.

## Hardening Added In This Review

- Replaced raw JWT restaurant parsing in policies with shared helper functions.
- Added `public.get_request_restaurant_id()` for public request context.
- Added `public.is_service_role()` and `public.is_internal_operator()` for internal job and platform RPC hardening.
- Added `public.request_can_access_restaurant(...)` for restaurant-scoped RPC checks.
- Added explicit authorization checks to sensitive onboarding, finance, support, and platform summary RPCs.
- Added explicit `search_path` on every remaining `SECURITY DEFINER` function.
- Added optional `INTERNAL_FUNCTION_SECRET` enforcement to internal Edge Functions when JWT verification is disabled.
- Added an explicit `grants.sql` layer so public, authenticated, and internal-only SQL functions are no longer left on default execute permissions.
- Tightened finance, billing, gallery, and attendance RLS so branch membership alone does not over-grant access to sensitive operational data.

## Current Strengths To Preserve

- public customer access stays branch-scoped
- branch operations remain branch-first
- organization ownership stays above branch operations
- reporting and snapshots remain explicit instead of inferred
- storage access already respects both branch and organization ownership

## Residual Watchlist

### 1. Legacy branch-role authority still lives in `public.users`

The current baseline still uses `users.role` for a large part of branch RLS and branch-side operational authority.

That is workable, but it is a legacy carryover from the earlier single-restaurant model.

Rule for future work:

- do not expand founder or accountant authority through `users.role`
- put new owner-control authority in organization membership and permissions instead

### 2. Role checks in RLS are still repetitive

Restaurant identity is now centralized, but many policies still repeat role subqueries against `public.users`.

That is acceptable for now, but future cleanup should converge more of those checks on helper functions so role semantics change in one place.

### 3. Billing is still branch-centered even though organization billing exists

The current model can support multi-branch operators, but subscription enforcement is still centered on `tenant_subscriptions.restaurant_id`.

If pricing, invoicing, or limits become organization-wide, redesign carefully instead of stretching the current branch subscription table beyond its intent.

### 4. Legal and tax modeling will need a dedicated profile before full multi-country scale

The current baseline is strong enough for product development, but long-term Japan and Vietnam compliance will likely need explicit legal-entity and tax-profile tables rather than continuing to grow `restaurants`.

That should be added deliberately before country-specific reporting becomes production-critical.

### 5. Direct browser access should stay behind owned APIs for privileged analytics

The foundation now has explicit function grants, but future work should still avoid adding direct browser calls to privileged RPCs when an owned API route is the safer contract.

That keeps auth, logging, and rate-limiting in one place and makes later grant hardening easier.

## Recommendation

Use the current baseline as the product foundation.

Do not do another schema reset soon.

For the next phase, prefer:

1. helper-driven RLS cleanup
2. explicit legal/tax profile design
3. org-level billing design only when business rules truly require it
4. keep privileged analytics and admin actions behind owned API routes

That path gives the product room to grow without turning every quarter into a database rewrite.
