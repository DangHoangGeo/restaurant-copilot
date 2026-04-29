# Owner Business Operations Plan

## Goal

The product must let a founder run one or more restaurants from a phone without losing control of branch operations, permissions, money, or setup quality.

This phase is not about adding every possible feature. It is about making the owner operating loop production-safe.

The growth strategy is owner OS first, consumer ordering network later. The system should first help small restaurants and multi-branch founders operate the business. A network-wide customer ordering experience should be added only after enough restaurants already run their live menus, branch operations, and business workflows through the product.

## Product Foundation

The owner foundation is complete only when the following product statements are true:

1. An owner can subscribe, create the company, and create the first branch.
2. Platform approval can verify the company and activate the first branch subscription or trial.
3. The owner can finish onboarding from the founder `control` route.
4. The owner can add branches and keep each branch operationally independent.
5. The owner can add owner-level members and branch employees without collapsing the permission model.
6. The owner can manage menu, people, money, and reports without leaving branch scope ambiguous.
7. AI can reduce setup and operational work without becoming an ungoverned decision-maker.

## Operating Model

### Founder control

Founder work is organization-first:

- company setup
- branch setup and switching
- owner-level access control
- subscription and billing visibility
- cross-branch reporting
- cross-branch finance review

### Branch operations

Branch work is execution-first:

- orders
- tables
- menu
- employees
- attendance
- purchasing and expenses
- local finance inputs
- local reports

### Customer ordering

Customer ordering stays branch-scoped and stable. It is not the current architecture target for major changes.

## Owner Lifecycle

### 1. Signup and subscription intent

At signup, the founder should be able to:

- choose a plan
- choose a billing cycle
- register the company
- create the first branch
- enter a pending approval state cleanly

### 2. Platform approval

Platform approval currently remains an explicit operational step. Approval should:

- approve the organization
- verify linked branches
- bootstrap the branch trial or active subscription
- preserve a clear audit trail

### 3. Founder onboarding

After approval, the founder should land in `control/onboarding`, not a branch dashboard.

Onboarding should establish:

- company name and contact details
- branch basics
- timezone and currency
- tax defaults
- brand basics
- opening hours
- initial shared menu categories
- AI-assisted copy and branding suggestions

### 4. Ongoing control

After onboarding, the founder should primarily work in:

- `control/overview`
- `control/restaurants`
- `control/menu`
- `control/people`
- `control/finance`
- `control/settings`

## People Model

### Organization members

Organization members are not employees.

Use organization members for:

- founder full control
- founder operations
- founder finance
- accountant readonly
- branch general manager in the control model

### Employees

Employees exist for:

- schedules
- attendance
- labor tracking
- branch execution

Do not use employee records to represent owner-level control.

## Menu Model

The menu foundation must support:

- branch-local menu ownership
- organization-shared menu inheritance
- explicit source tracking
- branch overrides that remain auditable

Customer ordering always reads the resolved branch menu.

## Money Model

The money foundation must support:

- branch-level expenses and purchases
- branch monthly close
- closed monthly snapshots
- organization roll-up from closed branch data
- exportable reports for accountants

Rules:

- branch data is the source
- closed snapshots are the accounting boundary
- org roll-up must not silently mix incomplete live data into “final” numbers

## AI Support Model

AI support is part of the owner foundation when it:

- accelerates onboarding
- drafts multilingual branding or menu content
- helps organize owner work
- stays inside explicit permissions and review points

AI support is not production-ready when it:

- silently updates financial or permission-sensitive data
- bypasses review for owner-facing setup
- pretends placeholder UI is a real operational assistant

## Launch Priorities

When tradeoffs appear, optimize in this order:

1. founder control from a phone
2. clear branch operations
3. trustworthy permissions and numbers
4. safe setup and onboarding
5. maintainable architecture

Do not chase marketplace behavior before the restaurant operating system is strong. See `13_growth_roadmap_owner_os_to_consumer_network.md` for the staged expansion path from 1,000 Japan restaurants to a later 10,000-restaurant consumer ordering network.

## Current Production Interpretation

The current product should be treated as:

- usable foundation for owner signup, approval, control routing, people, money, and menu inheritance
- partially mixed old and new implementation across some branch settings and owner APIs
- strong enough for focused hardening, not for careless feature layering

## Definition Of Ready For Production Work

A production-facing task in this repo is not ready until it says:

- which actor it serves
- whether it belongs to root, control, branch, or platform
- which branch and org boundaries apply
- which permissions apply
- what data must remain auditable
- what must remain stable

If that is unclear, stop and frame the task first.
