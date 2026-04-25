# Founder Control Route Map

## Purpose

This file maps the current runtime route ownership so future work does not confuse:

- founder control
- branch operations
- legacy aliases
- compatibility redirects

## Canonical Entry Flow

1. Owner signs up on the root domain.
2. Signup creates the organization, first branch, founder membership, and requested plan metadata.
3. Platform approval verifies the organization and boots trial or subscription state.
4. Approved founder enters `/{locale}/control/onboarding`.
5. After onboarding, founder default entry becomes `/{locale}/control/overview`.
6. Founder drills into a branch from `control/restaurants`.
7. Branch execution lives under `/{locale}/branch/{branchId}/*`.

## Founder-Owned Pages

These pages belong to founder control:

- `control/overview`
- `control/restaurants`
- `control/restaurants/[branchId]`
- `control/menu`
- `control/people`
- `control/finance`
- `control/settings`
- `control/homepage`
- `control/onboarding`
- `control/profile`

## Founder Control UX Model

Founder control should be organized by owner work area, not by a wall of metrics.

- One-time setup:
  - `control/settings`
  - `control/restaurants`
- Frequent operation settings:
  - `control/menu`
  - `control/people`
- Insight and analyst work:
  - `control/overview`
  - `control/finance`

`control/overview` is the owner command center. It should help the owner choose the right work area from a phone, surface only meaningful attention items, and then route into branch-level detail when local execution is needed.

## Branch-Owned Pages

These pages belong to branch execution:

- `branch`
- `branch/[branchId]`
- `branch/[branchId]/orders`
- `branch/[branchId]/menu`
- `branch/[branchId]/tables`
- `branch/[branchId]/employees`
- `branch/[branchId]/bookings`
- `branch/[branchId]/reports`
- `branch/[branchId]/purchasing`
- `branch/[branchId]/finance`
- `branch/[branchId]/promotions`
- `branch/[branchId]/staff`
- `branch/[branchId]/profile`
- `branch/[branchId]/onboarding`

## Compatibility Behavior

The repo currently supports compatibility redirects and aliases:

- `branch/settings`
  - founder users are redirected to `control/settings`
- `branch/homepage`
  - founder users are redirected to `control/homepage`
- `branch/branches`
  - founder users are redirected to `control/restaurants`
- `branch/organization`
  - founder users are redirected to `control/people`

This is compatibility behavior, not the target long-term ownership model.

## Branch Context Model

The current branch routing contract is:

- `branch/{branchId}` is the explicit branch route
- a validated active-branch cookie allows org members to switch effective branch context
- branch-scoped routes should use server-side branch validation, not client-only assumptions

## Legacy Warning

Some founder setup flows still call legacy branch settings APIs even though the page lives in `control`.

That means route ownership is ahead of full API migration. Treat those API dependencies as hardening targets, not as the desired final contract.
