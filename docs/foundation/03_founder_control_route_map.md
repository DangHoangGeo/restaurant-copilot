# Founder Control Route Map

**Status**: Working artifact  
**Date**: April 17, 2026  
**Purpose**: classify the current legacy dashboard so Phase 1 and Phase 2 work can move intentionally instead of screen-by-screen guesswork.

## Foundation Confirmations

- The customer ordering flow stays stable and branch-scoped.
- The existing `restaurant` stays the branch-level operating unit.
- Multi-branch support is added above branches through the organization layer.
- Founder control moves toward the root-domain `control` route.
- Branch execution stays focused in the branch-scoped route.

## Current Legacy Dashboard Classification

### Move to founder `control` route

- `dashboard/overview`
  - founder cross-branch review
- `dashboard/branches`
  - branch list, branch switching, menu copy, branch setup
- `dashboard/organization`
  - organization members, invites, access scope
- `dashboard/finance`
  - founder-facing money review and month-close workflow
- `dashboard/promotions`
  - founder-controlled promotion policy and rollout
- `dashboard/settings`
  - restaurant identity, tax defaults, payment defaults
- `dashboard/homepage`
  - branch branding and public-facing identity ownership
- `dashboard/onboarding`
  - founder-owned setup path

### Keep in branch `operations` route

- `dashboard`
  - local branch dashboard
- `dashboard/orders`
  - branch daily order execution
- `dashboard/menu`
  - branch menu ownership
- `dashboard/tables`
  - branch QR and table setup
- `dashboard/employees`
  - branch people operations
- `dashboard/bookings`
  - branch booking operations
- `dashboard/reports`
  - branch-local reports and analytics
- `dashboard/purchasing`
  - branch purchases and expenses

### Remove, defer, or merge during refactor

- `dashboard/profile`
  - should become account-level, not owner-route architecture
- `dashboard/staff`
  - overlaps with `employees` and should be merged or clarified before long-term ownership is decided

## Phase 1 Implementation Notes

- Add a root-domain `control` shell first.
- Reuse existing organization and overview services instead of rebuilding them.
- Keep legacy founder screens reachable while the new route shell comes online.
- Move page ownership in slices instead of relocating every screen at once.

## Founder Product Shape

- `control/overview` should behave like an owner cockpit:
  - organization-wide today KPIs
  - current month finance-close coverage
  - staffing visibility across branches
  - branch drill-down links into team and money workflows
- `control/people` should combine:
  - organization member and permission management
  - cross-branch employee visibility
  - explicit branch drill-down into branch employee operations
- `control/finance` should start with:
  - combined monthly finance across branches
  - visibility into which branches are still missing a closed month
  - branch-by-branch drill-down into the selected branch finance workspace

Permission notes:
- `control/overview` is available to all founder-level control roles.
- `control/restaurants` and menu copy/compare actions are shown only for users with `restaurant_settings`.
- `control/people` is shown when the role has `employees`.
- `control/finance` is shown when the role has `reports` or `finance_exports`.
- `control/settings` is shown only for roles with `organization_settings`.

Compatibility note:

- `control/money` currently exists as an alias and redirects to `control/finance`.

This keeps founder control organization-first while preserving branch-scoped execution for local staff and finance actions.

## Immediate Safe Sequence

1. Introduce the `control` route shell and founder navigation.
2. Land founder overview on the new route using shared organization context.
3. Add bridge screens for Restaurants, People, Finance, and Settings.
4. Move individual founder screens from legacy `dashboard` to `control` only after each page is stable.

## Current owner entry workflow

- Founder starts from the public homepage pricing/subscription path.
- Signup creates the company, requested subdomain, founder membership, and first branch in a pending approval state.
- Platform admin approval is required before the founder can access the root-domain `control` route.
- The first approved destination is `control/onboarding`, not `control/overview`.
- `control/homepage` should stay blocked until onboarding is completed.
