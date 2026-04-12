# AI Agent Execution Plan

## PM Goal

This document is the execution plan for AI agents to implement the next owner and business-operations phase of the platform.

The goal is not to ship many disconnected features. The goal is to build a strong foundation so restaurant owners in Japan can run multiple branches simply, safely, and with less stress, while keeping the current customer ordering flow stable.

## Non-Negotiable Product Rules

1. Do not break the current customer menu ordering flow.
2. Treat each existing `restaurant` as a branch-level operating unit.
3. Add multi-branch support above the current restaurant layer through an organization model.
4. Keep branch menus independent first.
5. Keep the owner and manager experience mobile-first.
6. Keep permissions explicit and auditable.
7. Keep finance and attendance logic reliable enough for real operations.

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

## Global Definition of Done

A phase is only complete when all of the following are true:

- code is implemented in the correct domain boundaries
- database changes are added in migrations
- web routes and services use the new model correctly
- UI is usable on mobile
- existing customer ordering is not broken
- basic verification was run and documented
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
8. Risks, follow-ups, or known gaps.

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

### Phase 0 Status

`In progress / not complete yet`

What is confirmed fixed:

- booking status route now reads `bookingId` correctly from params
- broken platform trial cron was disabled instead of continuing to fail on missing RPCs
- low-stock route was partially corrected to use `inventory_items`
- item-detail report no longer crashes on missing cost data

What still blocks Phase 0 completion:

- daily usage snapshot still buckets data by UTC instead of Japan local day
- low-stock UI still expects the old response fields
- aggregate dashboard still queries a nonexistent inventory `name` column
- item profit margin is now reported as real `0%` instead of unavailable / not tracked

PM status:

- Phase 0 should stay open until those four gaps are fixed and verified

### Phase 1 Status

`Completed with Phase 2 follow-ups`

What is confirmed delivered:

- migration `037_organization_foundation.sql` adds the organization layer above restaurants
- existing restaurant remains the branch-level operating unit
- organization membership, branch scope tables, and permission override tables exist
- registration now bootstraps an organization for a newly created restaurant
- organization summary, members, and branch-list API routes were added
- centralized organization context and authorization services were added
- shared types were added for the new organization domain

What Phase 1 does not solve yet:

- multi-branch runtime switching is not complete
- owner-side branch context is not yet propagated through the existing restaurant-scoped JWT and RLS model
- invite flow only works for users who already exist
- non-owner org-member onboarding is still incomplete

PM status:

- Phase 1 can be treated as complete for foundation delivery
- the remaining operational gaps move into Phase 2 by design

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

`Open`

Remaining blockers before Phase 0 can be closed:

- fix Japan-local day boundaries for `daily-usage-snapshot`
- align low-stock UI with the new API response shape
- fix aggregate dashboard low-stock query to stop reading nonexistent inventory columns
- render profit margin as unavailable until COGS exists

### PM Note to AI Agent

Do this first. Do not start organization or finance work on top of a broken reporting base.

---

## Phase 1: Build the Organization Foundation

### Goal

Support one business owning multiple branches and multiple founder-level members.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that the current `restaurant` remains the branch-level unit and this phase adds an organization layer above it

### Scope

- add organization tables above the current restaurant layer
- map existing single-owner restaurants into the new organization model
- add organization membership and scoped permissions
- preserve current login behavior while expanding the data model

### Core Tables

- `owner_organizations`
- `organization_members`
- `organization_restaurants`
- `organization_member_shop_scopes`
- `organization_member_permissions`

### Completion Definition

- one organization can own multiple restaurants
- one founder-level user can access multiple branches through the organization model
- a second founder-level user can be added without being modeled as an employee
- RLS and permission checks still isolate data correctly
- existing single-restaurant users still work after migration

### Current Status

`Complete`

Delivered in this phase:

- organization foundation migration created
- organization bootstrap added to registration flow
- organization context/service layer added
- centralized org authorization scaffolding added
- owner organization API endpoints added

Accepted follow-ups moved to Phase 2:

- branch runtime switching under the existing JWT and RLS model
- onboarding for org members who do not already own a restaurant
- email invite flow for users who do not yet exist

### PM Note to AI Agent

Keep this phase mostly backend and authorization-focused. Do not try to finish every owner UI here.

---

## Phase 2: Shared Founder and Branch Access Control

### Goal

Make founder, co-founder, finance, and manager access explicit and maintainable.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that founders are not modeled as employees and branch scope must remain explicit

### Scope

- implement organization-level roles
- implement branch-scoped permissions
- centralize permission checks in one server-side authorization layer
- update owner navigation and data loading to respect scope
- define the active-branch context model for multi-branch founders
- add onboarding for organization members who do not already have a `users.restaurant_id`
- build invite-by-email flow instead of requiring pre-existing user rows

### Required Roles

- `founder_full_control`
- `founder_operations`
- `founder_finance`
- `accountant_readonly`
- `branch_general_manager`

### Completion Definition

- role and scope checks are not duplicated across many routes
- a founder can see all allowed branches
- a branch manager sees only assigned branches
- finance-only users can read reports without getting operational write access
- audit-sensitive actions are permission-gated
- a founder can intentionally switch active branch context without breaking RLS
- Phase 2 defines how JWT/session branch context is resolved for branch-scoped operations
- invited members can join even if they did not already have a restaurant or existing `users` row
- invite-by-email flow supports pending invite, acceptance, and membership activation

### Risks / Follow-Ups Carried Into Phase 2

- the existing `restaurant_id` JWT claim still controls branch-level RLS; Phase 2 must define how active branch context changes when a founder operates a different branch
- the `users.restaurant_id` column is still single-valued; org members who do not already own a restaurant need a separate onboarding path
- there is no invite-by-email flow yet; `POST /api/v1/owner/organization/members` currently requires the target user to already exist in `users`

### PM Requirements For Phase 2

- do not patch branch switching in an ad hoc way inside individual routes
- define one explicit branch-context strategy for JWT, session, and server authorization
- keep branch-scoped RLS trustworthy during the transition from single-restaurant assumptions
- design member onboarding so founders, finance users, and managers are not forced through owner-style restaurant creation
- implement invites as a first-class workflow, not as a hidden prerequisite on an existing user record

### PM Note to AI Agent

This phase should reduce future complexity, not add it. Prefer one clean permission layer over many local checks.

---

## Phase 3: Branch Management and Branch-Specific Menus

### Goal

Let owners manage multiple branches, each with its own menu, while preserving the working customer order flow.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that branch menus stay independent first and customer ordering must not be redesigned

### Scope

- add owner branch list and branch switcher
- keep menu data branch-scoped
- add branch menu duplication tools
- add branch menu comparison for owner review
- confirm customer menu loads only the selected branch menu

### Completion Definition

- an owner can manage multiple branches from one account scope
- each branch can have different categories, items, prices, and availability
- copying a menu from one branch to another works
- editing one branch menu does not change another branch menu
- customer QR ordering continues to load the correct branch menu

### PM Note to AI Agent

Do not introduce a global shared catalog in this phase. Branch independence is the correct first release model.

---

## Phase 4: Employee Scheduling, QR Attendance, and Approvals

### Goal

Make staffing and attendance reliable enough for day-to-day branch operations.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that attendance events, approvals, and finalized work-hour summaries are separate layers

### Scope

- improve employee schedule management
- support daily working hour review
- replace weak QR attendance assumptions with a secure branch-ready flow
- add manager approval for exceptions and finalized hours

### Required Outcomes

- schedule creation and editing
- branch-level employee assignment
- QR check-in and check-out
- exception handling for missing or incorrect scans
- approval workflow for payroll-grade daily summaries

### Completion Definition

- employees can check in and out through a valid QR flow
- attendance events are tied to the correct branch and employee
- managers can approve or reject corrections
- finalized daily hours are generated from approved attendance data
- owner or manager can review attendance from mobile without confusion

### PM Note to AI Agent

Do not treat raw scan events as final payroll truth. Keep attendance events, approvals, and finalized summaries separate.

---

## Phase 5: Purchasing and Expense Management

### Goal

Give branches a simple way to record equipment purchases, supplier spending, and daily food expenses.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that branch-scoped operational simplicity matters more than procurement-system complexity

### Scope

- add purchase and expense data model
- add branch-level purchase entry UI
- add supplier, category, and receipt attachment support where practical
- connect purchases to monthly finance reporting

### Completion Definition

- branch managers can record purchases from mobile
- expenses are branch-scoped and categorized
- purchase records can be reviewed by founders or finance users
- spending appears in monthly finance summaries
- exports are possible for accountant review

### PM Note to AI Agent

Keep the first version simple. Recording real spending accurately is more important than building a complex procurement system.

---

## Phase 6: Monthly Finance Close and Tax-Ready Reporting

### Goal

Give owners a monthly cashflow view that is trustworthy enough for internal review and accountant handoff.

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

- owners can create and disable branch promotions
- discount usage is recorded against orders
- reports can distinguish gross sales from discounted sales
- branch-specific promotions do not leak into other branches unless intentionally copied

### PM Note to AI Agent

Promotions must plug into the finance model cleanly. Do not implement them as untracked price edits.

---

## Phase 8: Final UX Simplification Pass

### Goal

Reduce owner stress and remove avoidable complexity before broader rollout.

### Mandatory First Step

- read all foundation docs
- write the implementation brief
- confirm that owner UX is operational, mobile-first, and should feel simpler after the new foundations land

### Scope

- simplify owner navigation into business language
- improve mobile layouts for high-frequency tasks
- reduce duplicate settings and unnecessary labels
- verify multilingual owner and employee flows

### Completion Definition

- the owner experience centers on branches, people, money, and settings
- the most common daily actions can be done comfortably on mobile
- founder and manager workflows feel simpler after the new features land
- Japanese, Vietnamese, and English owner-side language selection still works where supported

### PM Note to AI Agent

This phase is not cosmetic cleanup only. It is part of product quality.

---

## Suggested Agent Work Packages

Each phase should be broken into small agent tickets. Recommended ticket size:

- one migration-focused ticket
- one backend/domain ticket
- one UI ticket
- one verification and cleanup ticket

Avoid assigning one giant ticket that touches every domain at once.

## Required Verification Checklist Per Phase

- schema migration reviewed
- RLS or auth impact checked
- mobile layout checked
- happy path manually verified
- one regression check on customer ordering flow
- docs updated

## Release Gate Before Production

Do not release the owner upgrade until these are true:

- organization and branch permissions are trustworthy
- customer ordering is stable
- monthly finance numbers are internally consistent
- attendance approval flow is clear
- branch managers can operate without founder intervention for daily tasks

## First Agent Starting Order

If an AI implementation agent starts today, the first active sequence should be:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3

After that, Phase 4 and Phase 5 can overlap carefully, and Phase 6 should start only when attendance and expenses have stable approved inputs.
