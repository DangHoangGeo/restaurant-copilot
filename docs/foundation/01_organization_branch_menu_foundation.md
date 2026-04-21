# Organization Branch Menu Foundation

## Purpose

This document defines the canonical architecture for founder control and branch operations.

If code, docs, or prompts disagree with this file, this file wins.

## Canonical Business Model

### Organization

The organization is the owner control layer.

It owns:

- founder and finance membership
- branch inventory at the company level
- company branding
- subscription and billing visibility
- cross-branch reporting
- cross-branch finance review
- shared menu foundations

### Branch

Each branch is an operating restaurant.

The existing `restaurant` table and concept remains the branch-level operating unit.

Each branch owns:

- resolved menu
- prices and availability
- tables and QR codes
- employees and schedules
- attendance
- purchases and expenses
- branch-level reports
- daily operations

## Route Contract

### Root domain

Used for:

- marketing
- signup
- login
- pending approval
- platform admin

### Founder control route

Use `/{locale}/control/*` for:

- organization setup
- branch setup
- branch selection and comparison
- owner-level people management
- organization money and finance review
- owner-level settings

### Branch route

Use `/{locale}/branch/*` and `/{locale}/branch/{branchId}/*` for:

- branch-scoped execution
- local branch dashboards
- menu
- orders
- tables
- employees
- attendance
- purchasing
- local reports

Do not push new founder workflows back into branch dashboards.

## API Contract

### Preferred surfaces

Use org-aware or domain-aware APIs first:

- `api/v1/owner/organization/*`
- shared server services under `web/lib/server/*`

### Transitional surfaces

These exist for compatibility and must be treated carefully:

- `api/v1/restaurant/*`
- legacy `api/v1/owner/*` endpoints that still rely on `users.restaurant_id`

When touching a transitional surface:

1. verify whether an org-aware equivalent already exists
2. migrate if practical
3. if not migrating, harden it to the current permission and branch-scope rules

## Branch Context Rules

### Effective branch

The effective branch is resolved server-side from:

1. authenticated user context
2. validated active-branch cookie for org members

### Important rule

Never trust branch identity from request body or client-only state.

All sensitive branch operations must resolve or validate branch access on the server.

## People And Permission Rules

### Roles

Organization roles:

- `founder_full_control`
- `founder_operations`
- `founder_finance`
- `accountant_readonly`
- `branch_general_manager`

Branch and labor actors:

- employees
- staff
- attendance participants

### Permission rule

Authorization should be explicit and centralized.

Do not rely on UI hiding alone.
Do not let legacy role mappings silently over-grant access when org context exists.

## Menu Foundation

### Branch-resolved first

Customer ordering reads the branch-resolved menu only.

### Shared inheritance

Organization-shared categories and items may flow into branches, but the branch remains the operational unit.

### Required properties

Inheritance must stay:

- explicit
- traceable
- detachable only by an explicit workflow
- auditable

## Money And Reporting Rules

- branch expenses and purchases stay branch-scoped
- branch monthly close creates the accounting boundary
- organization roll-ups should prefer closed branch data
- finance exports and billing actions must stay permission-gated and auditable

## AI Rules

AI may help with:

- onboarding generation
- menu copy
- branding drafts
- operator assistance

AI may not:

- silently change billing or finance records
- silently change permissions
- blur the boundary between owner and employee actions

## Stable Versus Transitional Architecture

### Stable direction

- organization above branch
- founder control route
- branch execution route
- org-aware permissions
- branch-resolved menu model

### Transitional implementation

- mixed legacy owner APIs
- some founder screens still calling legacy branch settings APIs
- compatibility redirects from old branch paths to control paths

Future work should move toward the stable direction, not deepen the transitional one.
