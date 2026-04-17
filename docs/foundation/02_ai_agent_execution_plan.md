# AI Agent Execution Plan

## PM Goal

This document is the execution plan for AI agents to implement the next owner and business-operations phase of the platform.

The goal is not to ship many disconnected features. The goal is to build a strong foundation so restaurant owners in Japan can run multiple branches simply, safely, and with less stress, while keeping the current customer ordering flow stable.

## Non-Negotiable Product Rules

1. Do not break the current customer menu ordering flow.
2. Treat each existing `restaurant` as a branch-level operating unit.
3. Add multi-branch support above the current restaurant layer through an organization model.
4. Keep branch menus independent first.
5. Founder and co-founder experience must live on the organization-subdomain control route.
6. Branch manager experience must live on the organization-subdomain operations route with explicit branch context.
7. Keep permissions explicit and auditable.
8. Keep finance and attendance logic reliable enough for real operations.

## Refactor Authority

AI agents are explicitly allowed to refactor and reorganize the codebase to create a strong long-term foundation.

That means:

- existing route structure does not need to be preserved if it conflicts with the new architecture
- existing mixed founder/branch dashboard structure should be treated as transitional legacy code
- shared modules, shared data contracts, and shared database foundations should be created before feature-by-feature UI expansion
- preserving bad structure is not safer than refactoring it when the target architecture is already clear

The goal is not to minimize code movement. The goal is to create a codebase that is easier to maintain, reason about, and extend safely.

## Mandatory Foundation Reading

Before any AI agent starts any implementation task, it must read these documents first:

1. `docs/foundation/README.md`
2. `docs/foundation/00_owner_business_operations_plan.md`
3. `docs/foundation/01_organization_branch_menu_foundation.md`
4. `docs/foundation/02_ai_agent_execution_plan.md`

This is mandatory for every phase and every new agent handoff.

The agent must begin by restating these foundation constraints in its own words:

- customer ordering must remain stable
- the current `restaurant` maps to a branch-level operating unit
- multi-branch support is added through an organization layer above branches
- branch menus are independent first
- owner UX must stay mobile-first and operationally simple
- permissions, finance, and attendance logic must remain explicit and auditable

If the agent has not read and restated this foundation, it is not ready to implement.

## Definition of Ready for Any AI Agent Task

An AI agent should not start implementation until the task package clearly states:

- confirmation that the foundation documents were read
- a short summary of the foundation constraints in the agent's own words
- the product goal
- the exact files or modules likely to change
- the database impact
- the API impact
- the UI impact
- the rollout or rollback impact
- the monitoring or operational impact
- the tests or verification expected
- the completion definition

If these are missing, the agent should first produce a short implementation brief before changing code.

## Mandatory Start-of-Task Protocol

Every implementation task must begin in this order:

1. Read the active foundation documents.
2. Write a short implementation brief that restates the product direction.
3. List the exact task boundaries.
4. Name what must not change.
5. Only then begin code changes.

The start-of-task brief must explicitly say:

- what part of the foundation this task supports
- what existing behavior must remain stable
- what new behavior is being added
- what data boundaries and permission boundaries apply

If an AI agent cannot produce this brief clearly, the task should stop there and be reframed before implementation continues.

## Architectural Execution Rule

The implementation order must follow this logic:

1. shared foundation first
2. founder control route second
3. branch operations refactor third
4. branch feature expansion only after the new route and shared foundation are stable

Shared foundation means:

- database model and migrations
- authorization and policy layer
- branch-context and organization-context resolution
- shared server domain modules
- shared schemas and types
- shared UI primitives and route shells

Do not implement new founder or branch screens on top of unstable shared layers.

## Global Definition of Done

A phase is only complete when all of the following are true:

- code is implemented in the correct domain boundaries
- database changes are added in migrations
- web routes and services use the new model correctly
- UI is usable on mobile
- existing customer ordering is not broken
- basic verification was run and documented
- rollout, recovery, and support implications were documented for risky changes
- the related docs in `docs/foundation/` are updated if behavior changed

## Agent Delivery Format

For every phase, the AI agent should deliver:

1. Confirmation that the foundation docs were read.
2. Short summary of the relevant foundation constraints.
3. Summary of what changed.
4. List of migrations added or updated.
5. List of API routes added or updated.
6. List of UI screens added or updated.
7. Verification performed.
8. Rollout, rollback, or backfill notes where relevant.
9. Monitoring, alerts, or runbook updates where relevant.
10. Risks, follow-ups, or known gaps.

## Required Prompt Shape for Future AI Agents

Every future implementation prompt should include this instruction near the top:

`Before making changes, read docs/foundation/README.md, docs/foundation/00_owner_business_operations_plan.md, docs/foundation/01_organization_branch_menu_foundation.md, and docs/foundation/02_ai_agent_execution_plan.md. Start by summarizing the foundation constraints and explain how your task fits them. Do not implement anything until that summary is written.`

This is part of the task contract, not optional context.

## Phase Execution Rule

For every phase below, the first step is always:

`Read the foundation docs and write the implementation brief.`

No phase is allowed to start directly with schema changes, route changes, or UI changes.

## Per-Phase Completion Rule

Each phase is only complete if the delivery includes:

1. proof the foundation docs were read
2. a short summary of the big-picture constraints
3. the implementation changes
4. the verification results
5. the remaining risks

If the agent skips the foundation summary, the phase is incomplete.

## Recommended Delivery Sequence

The work should be executed in this order.

## Current Status Snapshot

Important interpretation rule:

- the current codebase contains partially delivered work from earlier phases
- that historical delivery does not lock the architecture for the next implementation wave
- if earlier implementation lives in the wrong route, wrong module boundary, or wrong ownership surface, it may be moved or replaced
- future execution order should follow the target architecture, not the legacy file layout

### Phase 0 Status

`Completed — 2026-04-17`

What is confirmed fixed and verified in the codebase:

- booking status route reads `bookingId` correctly from params
- broken platform trial cron disabled instead of continuing to fail on missing RPCs
- low-stock route uses `inventory_items` with `menu_items!inner` join for localized names
- item-detail report no longer crashes on missing cost data
- daily usage snapshot uses JST `+09:00` day boundaries (not UTC) for all date math
- low-stock UI (`LowStockAlerts`) response shape matches `DashboardLowStockItem` exactly
- aggregate dashboard inventory query uses `menu_items!inner` join — no nonexistent `name` column on `inventory_items`
- item profit margin returns `null` from API and renders as "N/A" in `items-report-tab` (not `0%`)
- `lib/server/dashboard/dates.ts` added with `getLocalDayRange`, `bucketToLocalDate`, and `getLocalDateRange` helpers
- aggregate dashboard reads per-branch `timezone` from `restaurants` table, defaults to `Asia/Tokyo`

PM status:

- Phase 0 is complete. All four originally-listed blockers are verified fixed.

### Legacy Organization Foundation Snapshot

`Historical implementation snapshot`

What is confirmed delivered:

- migration `037_organization_foundation.sql` adds the organization layer above restaurants
- existing restaurant remains the branch-level operating unit
- organization membership, branch scope tables, and permission override tables exist
- registration now bootstraps an organization for a newly created restaurant
- organization summary, members, and branch-list API routes were added
- centralized organization context and authorization services were added
- shared types were added for the new organization domain

What this legacy implementation does not solve yet:

- multi-branch runtime switching is not complete
- owner-side branch context is not yet propagated through the existing restaurant-scoped JWT and RLS model
- invite flow only works for users who already exist
- non-owner org-member onboarding is still incomplete

PM status:

- this historical work is useful input, but the new execution phases below now control the target order
- the remaining operational gaps should be resolved through the new shared-foundation-first sequence

---

## Phase 0: Stabilize the Current Base

### Goal

Fix known owner-side breaks before adding new business features.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that this phase is stabilizing the base for organization, branch, finance, and attendance work

### Scope

- fix owner reports that are out of sync with schema
- fix low-stock and dashboard aggregate queries that reference wrong columns
- fix booking update bug
- fix broken scheduled job SQL assumptions

### Completion Definition

- owner report pages load without schema errors
- dashboard summary and low-stock views use valid columns
- booking update route works with the correct booking id handling
- existing scheduled jobs run against the current schema or are clearly disabled with a replacement plan
- no regression in customer ordering flow

### Current Status

`Completed — 2026-04-17`

### PM Note to AI Agent

This base work is complete, but do not regress it while building the new foundation.

---

## Target Execution Order

The target execution order now supersedes the legacy route structure in the codebase.

Historical implementation work may still exist, but future work should follow the phases below.

## Phase 1: Shared Foundation Reset

### Goal

Build the shared foundation first so later founder and branch work lands on stable architecture instead of the old mixed dashboard structure.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that shared database, domain, auth, and UI foundations must land before route-specific expansion

### Scope

- refactor database and migration foundations where needed
- centralize organization context, branch context, and authorization services
- centralize shared types, schemas, and validation
- define shared UI primitives, layout shells, and route conventions
- create or refactor shared server domain modules before feature-specific pages
- create a clear target folder structure for founder control route and branch operations route

### Completion Definition

- the database foundation supports organization and branch separation cleanly
- shared auth and permission checks are centralized
- shared types and schemas are reusable across owner and branch flows
- route shells and shared components exist for the new architecture
- agents no longer need to build new features on top of the legacy mixed dashboard structure

### PM Note to AI Agent

This phase is allowed to move files, rename modules, and reorganize folders aggressively if that improves the foundation.

---

## Phase 2: Founder Control Route Foundation

### Goal

Build the root-domain founder control route before refactoring branch features.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that founders and co-founders must land on the root-domain control route, not a branch subdomain

### Scope

- add the founder control route shell on the root domain
- update auth and redirect behavior so founder-level users land on the root domain after login
- move organization management, branch setup, and access management into the founder route
- move restaurant basic information ownership into the founder route
- add branch selection and cross-branch overview in the founder route

### Completion Definition

- founder and co-founder login lands on the root-domain control route
- restaurant basic information is owned by the founder route
- organization members and access are managed from the founder route
- cross-branch overview exists in the founder route
- the founder route no longer depends on branch-scoped page ownership assumptions

### PM Note to AI Agent

Do not wait for branch refactor to start the founder route. Founder control is the primary product surface.

---

## Phase 3: Founder Feature Execution

### Goal

Implement the founder-first feature set on top of the shared foundation and new control route.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that founder workflow is business control, setup, access, and money review rather than daily branch task execution

### Scope

- organization and shared-founder access flows
- branch creation, archive, and identity setup
- founder-controlled restaurant configuration
- founder-level money and finance surfaces
- founder-level promotion policy and rollout controls
- founder-level month-end and export workflows

### Completion Definition

- founders can manage restaurants, access, and configuration without entering branch-scoped surfaces
- founder-controlled finance and review flows live in the control route
- founder-controlled settings no longer depend on the branch operations route
- founder UI is mobile-first and coherent on the root domain

### PM Note to AI Agent

This phase should make the founder route genuinely useful before branch refactor begins.

---

## Phase 4: Branch Operations Route Refactor

### Goal

Refactor the existing branch features into a focused branch operations route after the founder route is stable.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm which existing branch screens stay, move, merge, or get removed

### Scope

- move founder-only screens out of the legacy branch dashboard
- refactor branch navigation into the operations route
- remove duplicated settings and low-value admin-style surfaces
- keep only branch-owned operational features in the branch route
- preserve branch manager reporting and analytics as part of the branch route

### Completion Definition

- branch route is clearly operational, not founder-administrative
- branch manager can run the restaurant without founder-only setup screens in the way
- branch reports and analytics remain available for branch managers
- branch route naming and structure match the target architecture

### PM Note to AI Agent

This is a real refactor phase, not a cosmetic rename. Remove architectural confusion, not just labels.

---

## Phase 5: Branch Feature Migration and Cleanup

### Goal

Finish migrating branch features onto the new operations route and shared foundation.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that branch features must now consume shared foundations instead of route-local legacy logic

### Scope

- branch menu workflows
- branch people workflows
- branch attendance workflows
- branch expenses and purchasing workflows
- branch bookings workflows
- branch reports and analytics workflows

### Completion Definition

- branch features are implemented on shared modules and shared data contracts
- branch managers can use menu, employees, attendance, expenses, bookings, and local reports from one coherent route
- branch-local reports and analytics are preserved and understandable
- legacy branch-specific duplication is reduced or removed

### PM Note to AI Agent

Do not rebuild every branch feature from scratch if the shared foundation already supports it. Migrate intentionally.

---

## Phase 6: Finance Close and Tax-Ready Reporting

### Goal

Give founders a trustworthy month-end finance workflow once founder control and branch operations are both on stable foundations.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that finance outputs must be based on approved and finalized operational inputs

### Scope

- monthly revenue summaries
- discount and refund summaries
- labor cost summaries from approved attendance
- purchase and expense summaries
- monthly finance snapshot tables
- export package for accountant or tax preparation workflow

### Completion Definition

- each branch has a monthly finance close snapshot
- organization-level monthly rollup works across branches
- totals are derived from approved and finalized operational data
- founders and finance users can export monthly summaries
- the reporting output is clear enough for Japan-first accounting operations

### PM Note to AI Agent

This phase must use stable snapshot logic, not ad hoc live queries everywhere.

---

## Phase 7: Promotions and Discount Codes

### Goal

Add controlled promotion tools without making money reporting unreliable.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that promotions must be branch-scoped first and must not bypass finance tracking

### Scope

- branch-scoped promotions
- discount codes or promo codes
- validity dates
- usage limits
- audit trail for owner review

### Completion Definition

- founders can create and disable branch promotions from the control route
- discount usage is recorded against orders
- reports can distinguish gross sales from discounted sales
- branch-specific promotions do not leak into other branches unless intentionally copied

### PM Note to AI Agent

Promotions must plug into the finance model cleanly. Do not implement them as untracked price edits.

---

## Phase 8: Final UX Simplification Pass

### Goal

Reduce owner stress and remove avoidable complexity after the new foundation, founder route, and branch route are in place.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that simplification should happen after the architectural split is implemented

### Scope

- simplify founder route navigation into business language
- simplify branch route navigation into operational language
- improve mobile layouts for high-frequency tasks
- reduce duplicate settings and unnecessary labels
- verify multilingual founder and employee flows

### Completion Definition

- the founder experience centers on organization, restaurants, access, money, and settings
- the branch experience centers on operations, people, expenses, bookings, and local reports
- the most common daily actions can be done comfortably on mobile
- founder and manager workflows feel simpler after the refactor
- Japanese, Vietnamese, and English owner-side language selection still works where supported

### PM Note to AI Agent

This phase is not cosmetic cleanup only. It is the final simplification pass after the real architecture work is done.

---

## Cross-Cutting Production Readiness Track

This work is required before production release even if the feature phases are complete.

### Goal

Make the owner upgrade safe to launch, observe, support, and recover in production.

### Scope

- rehearse risky migrations and backfills on production-like data
- define rollback or containment plans for organization, attendance, and finance changes
- add dashboards and alerts for scheduled jobs and owner-critical failures
- document runbooks for invite repair, branch access repair, attendance correction, failed exports, and month-close adjustments
- verify attachment storage, audit logging, and RLS behavior for new owner domains
- define rollout controls such as feature flags, staged enablement, or guarded release sequencing

### Completion Definition

- critical migrations and backfills were rehearsed before production
- the team can detect failed finance jobs, branch-access failures, and invite failures quickly
- at least one safe recovery path exists for each critical owner workflow introduced by this plan
- support runbooks exist for the most likely operational failures
- launch can be gated by explicit production checks instead of assumption

### PM Note to AI Agent

Do not treat production readiness as someone else's cleanup phase after feature delivery. It is part of the implementation contract.

---

## Suggested Agent Work Packages

Each phase should be broken into small agent tickets. Recommended ticket size:

- one migration-focused ticket
- one shared foundation or backend/domain ticket
- one route/UI ticket
- one verification and cleanup ticket

Avoid assigning one giant ticket that touches every domain at once.

## Required Verification Checklist Per Phase

- schema migration reviewed
- RLS or auth impact checked
- mobile layout checked
- happy path manually verified
- one regression check on customer ordering flow
- logging, alert, and job-monitoring impact reviewed for the changed area
- rollback, backfill, or recovery path noted for risky data changes
- reconciliation check added when money, attendance, or scheduled jobs are touched
- docs updated

## Release Gate Before Production

Do not release the owner upgrade until these are true:

- organization and branch permissions are trustworthy
- customer ordering is stable
- founder control route and branch operations route are clearly separated in ownership and navigation
- monthly finance numbers are internally consistent
- attendance approval flow is clear
- branch managers can operate without founder intervention for daily tasks
- staging rehearsal covered multi-branch founders, manager scope, invite flow, attendance approval, purchases, and month-end export
- risky migrations or backfills were rehearsed and have a rollback or containment plan
- alerts exist for failed scheduled jobs, failed exports, and owner-critical authorization failures
- support runbooks exist for invite repair, branch access repair, attendance correction, and month-close correction
- finance snapshot outputs were reconciled against sample branch data before launch

## First Agent Starting Order

If an AI implementation agent starts today, the first active sequence should be:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4

After that, Phase 5 can continue the branch migration, and Phase 6 should start only when attendance and expenses have stable approved inputs on the new shared foundation.
