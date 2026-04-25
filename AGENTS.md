# AGENTS.md

This file is the working contract for AI agents in this repository.

## Mission

Help a founder operate restaurants from a phone with less stress and more control.

Everything you do should support:

- fast owner setup
- clean branch operations
- trustworthy permissions and numbers
- simple mobile-first workflows for founders, managers, and staff
- production-safe foundations that future agents can extend without guessing

## Mandatory Reading

Read these before any implementation:

1. `docs/foundation/README.md`
2. `docs/foundation/00_owner_business_operations_plan.md`
3. `docs/foundation/01_organization_branch_menu_foundation.md`
4. `docs/foundation/02_ai_agent_execution_plan.md`

Before any UI or UX implementation, also read:

5. `DESIGN.md`
   Use for web, mobile, public customer, founder control, branch operations, platform admin, marketing, shared UI primitives, visual assets, copy tone, and motion.

Also read these when the task touches the area:

- `docs/foundation/03_founder_control_route_map.md`
  Use for founder control, branch routing, redirects, and page ownership.
- `docs/foundation/05_control_branch_production_readiness.md`
  Use for control-plane, branch flow, auth, security, finance, attendance, onboarding, and AI support tasks.
- `docs/foundation/04_expo_mobile_execution_plan.md`
  Use only for mobile app or printer work.
- `docs/foundation/06_supabase_foundation_guidelines.md`
  Use for schema, RLS, RPC, Edge Function, bootstrap, or migration work.
- `docs/foundation/07_supabase_foundation_review_20260422.md`
  Use for current database strengths, residual risks, and follow-up priorities.

## Foundation Rules

These are non-negotiable:

1. Do not break customer ordering.
2. Treat `restaurant` as the branch-level operating unit.
3. Add multi-branch support through the organization layer above branches.
4. Keep branch menus branch-resolved first, even when inheritance is used.
5. Keep founder control simple, mobile-first, and organization-scoped.
6. Keep permissions, attendance, finance, reporting, and billing explicit and auditable.
7. Keep language preference separate from business-country rules.

If the task conflicts with these rules, stop and surface the conflict.

## Current Product Contract

### Route ownership

- Root domain:
  - marketing
  - auth
  - pending approval
  - platform admin
- Founder route:
  - `/{locale}/control/*`
  - organization-level ownership, branch setup, people, finance, reporting
- Branch route:
  - `/{locale}/branch/*`
  - `/{locale}/branch/{branchId}/*`
  - branch-scoped daily operations
- Customer route:
  - branch-scoped public ordering and restaurant web presence

### Actor model

- organization members:
  - founders
  - finance partners
  - accountants
  - branch general managers in the control model
- employees:
  - labor, attendance, schedules, local branch execution

Do not collapse those two models into one.

### API ownership

Prefer these surfaces first:

- org-aware founder APIs under `web/app/api/v1/owner/organization/*`
- permission-gated shared server services in `web/lib/server/*`

Treat these as transitional:

- `web/app/api/v1/restaurant/*`
- legacy `web/app/api/v1/owner/*` endpoints that only depend on `users.restaurant_id`

If you touch a transitional endpoint, either migrate it or harden it.

## Required Start-of-Task Protocol

Before editing code, produce a short working summary that covers:

- confirmation that the required foundation docs were read
- confirmation that the relevant local architecture was reviewed
- the relevant constraints in your own words
- the product goal of the task
- what must remain stable
- which files or modules are likely to change
- the target directories and why the code belongs there
- expected database impact
- expected API impact
- expected UI impact
- expected verification

Do not skip this.

## Task Framing Rules

When planning a change, always classify it first:

- founder control
- branch operations
- public customer
- platform approval or subscription
- shared domain foundation
- mobile app

Then choose the matching route, service, and permission model.

## File Placement Rules

### Web

- `web/app/`
  - routes, pages, API handlers
- `web/components/`
  - UI and interaction components
- `web/lib/`
  - server services, domain logic, helpers
- `web/shared/`
  - shared types and schemas
- `web/messages/`
  - translations

### iOS

- `mobile/SOder/SOder/views/`
- `mobile/SOder/SOder/services/`
- `mobile/SOder/SOder/models/`
- `mobile/SOder/SOder/localization/`

Do not create parallel structures when the correct home already exists.

## Code Rules

- Keep route handlers thin.
- Keep business logic in owned services.
- Keep authorization centralized.
- Keep side effects isolated.
- Keep money and attendance logic explicit.
- Use fully typed TypeScript.
- Do not introduce implicit `any`.
- Prefer boring names over clever ones.
- Reuse local patterns before inventing new abstractions.

## Security And Reliability Rules

- Never trust branch identity from the request body.
- Never let a legacy route bypass the org permission model when org context exists.
- Validate and sanitize input at the boundary.
- Preserve or improve auditability on sensitive actions.
- Do not hardcode secrets.
- Keep `supabase/sql/*` as the canonical final state for schema changes.
- When a live environment already exists, pair that baseline update with a forward-only rollout migration under `supabase/migrations/*` or explain why no rollout SQL is needed.
- Keep failure handling explicit for setup, money, invites, and approval flows.

## Performance Rules

- Prefer request-scoped or shared server caching where the repo already uses it.
- Avoid duplicate round-trips when the current request context already has the needed data.
- Use indexed filters and snapshot tables for cross-branch finance/reporting work.
- Do not add polling or expensive joins to founder-critical surfaces without a strong reason.

## Testing Rules

- Run the most relevant tests and linting for the changed area whenever feasible.
- Add tests for new non-trivial permission, branch-scope, finance, or attendance logic.
- Cover both happy path and meaningful failure path when you add risky logic.
- If you skip a test for a risky change, say why.

## Documentation Rules

Update docs when you change:

- architecture ownership
- product behavior
- route families
- permission expectations
- rollout assumptions
- production-readiness status

Do not leave the foundation set stale.

## Definition Of Done

Work is only done when:

- the foundation rules still hold
- the ownership boundary is clean
- branch scope remains explicit
- customer ordering remains stable
- verification was run or the gap was explained
- docs were updated when assumptions changed
- risks and follow-ups are called out clearly

## Final Rule

Act like a production engineer for a restaurant operations system:

- protect important flows
- reduce ambiguity
- tighten unsafe boundaries
- keep the codebase easy to extend
- leave future agents a safer contract than the one you started with
