# Restaurant Copilot

Restaurant Copilot exists to help a founder operate one or more restaurants from a phone.

This repository is not a generic admin panel. It is a mobile-first operating system for:

- owner subscription and approval
- organization and branch setup
- manager and staff operations
- branch-resolved menu management
- finance, reporting, and audit-sensitive workflows
- AI-assisted setup and operator support

## Product Foundation

Before this product is production-ready for owner operations, all of the following must be true:

1. An owner can sign up, select a plan, and create the initial company and first branch.
2. Platform approval can verify the organization and bootstrap the branch subscription or trial.
3. The approved owner lands in the founder `control` route and completes onboarding there.
4. The owner can add branches, invite owner-level members, and add branch employees safely.
5. Each branch can operate independently for menu, staff, finance inputs, and daily execution.
6. Monthly finance and reporting remain explicit, auditable, and branch-scoped first.
7. AI support helps owners set up and operate faster, but does not silently change sensitive data.

## Route Model

The current product contract is:

- Root domain:
  - marketing
  - signup and login
  - pending approval
  - platform admin
- Founder control route: `/{locale}/control/*`
  - organization-level ownership
  - branch setup and switching
  - cross-branch people, money, and reporting
- Branch operations route: `/{locale}/branch/*` and `/{locale}/branch/{branchId}/*`
  - branch-scoped execution
  - menu, orders, tables, employees, purchasing, local finance
- Customer route:
  - branch-scoped QR ordering and public restaurant experience

## Data Model

The current architectural direction is:

- `owner_organizations` is the company control layer
- `restaurants` remains the branch-level operating unit
- organization members are owner-level and finance-level actors
- employees are labor and attendance actors
- branch menus are resolved at the branch level, even when they inherit organization-shared items

Preferred domain boundaries:

- organization
- branch
- menu
- orders
- people
- attendance
- money
- settings

## What Is Stable Now

The repo already contains meaningful production foundation work:

- organization layer above branches
- founder `control` route shell and branch drill-down views
- active-branch context via server-validated cookie
- branch-scoped dynamic route entry
- platform approval flow with subscription bootstrap
- organization invites and pending-invite acceptance flow
- shared-menu inheritance foundation
- branch monthly finance close and org roll-up foundation
- attendance event and approval foundation
- purchasing and expense foundations
- AI-assisted organization onboarding generation

## What Is Transitional

The codebase still contains mixed old and new surfaces. Future work must treat these as transitional:

- legacy branch dashboard routes and aliases
- legacy branch-scoped APIs under `/api/v1/restaurant/*`
- legacy owner APIs under `/api/v1/owner/*` that still depend on `users.restaurant_id`
- UI flows that call legacy settings endpoints from founder control screens

If you touch one of these surfaces, either:

1. migrate it to the org-aware contract, or
2. harden it so it cannot bypass the current permission model

## AI Support Position

AI support is part of the product foundation, but it must be honest and scoped:

- Production foundation today:
  - owner onboarding generation
  - menu and branding assistance
  - operator-facing content generation
- Not a production claim:
  - placeholder customer chat UI with canned responses

The owner AI foundation should reduce setup time, improve clarity, and stay inside explicit guardrails.

## Mandatory Reading For Work In This Repo

Before implementing or reviewing code, read:

1. [`docs/foundation/README.md`](docs/foundation/README.md)
2. [`docs/foundation/00_owner_business_operations_plan.md`](docs/foundation/00_owner_business_operations_plan.md)
3. [`docs/foundation/01_organization_branch_menu_foundation.md`](docs/foundation/01_organization_branch_menu_foundation.md)
4. [`docs/foundation/02_ai_agent_execution_plan.md`](docs/foundation/02_ai_agent_execution_plan.md)

Also read these when relevant:

- [`docs/foundation/03_founder_control_route_map.md`](docs/foundation/03_founder_control_route_map.md) for route ownership and redirects
- [`docs/foundation/05_control_branch_production_readiness.md`](docs/foundation/05_control_branch_production_readiness.md) for current risks and execution order
- [`docs/foundation/04_expo_mobile_execution_plan.md`](docs/foundation/04_expo_mobile_execution_plan.md) only for mobile app work

## Working Rules

- Do not break customer ordering.
- Keep branch scope explicit in schema, services, APIs, and UI.
- Do not model founders as employees.
- Prefer org-aware authorization and route ownership over legacy shortcuts.
- Keep finance, attendance, permissions, and billing audit-friendly.
- Keep mobile usability ahead of dashboard sprawl.

## Development Commands

### Web

```bash
cd web
npm install
npm run dev
npm run build
npm run lint
npm run test
```

### iOS

```bash
cd mobile/SOder
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug build
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug test
```

### Database

```bash
# Canonical bootstrap lives in supabase/bootstrap.sql
# Self-contained SQL lives in supabase/sql/
# Forward-only rollout migrations live in supabase/migrations/
# Edge Functions live in supabase/functions/
# Apply to a blank or reset Supabase database with:
# ./infra/scripts/apply_supabase_baseline.sh
# Apply to a live Supabase database with:
# ./infra/scripts/apply_supabase_migrations.sh
```

## Repository Layout

```text
web/                    Next.js app for founder control, branch ops, and customer surfaces
mobile/SOder/           Current SwiftUI staff app
infra/                  Bootstrap scripts and SQL test fixtures
supabase/               Canonical self-contained database foundation, config, and edge functions
docs/                   Foundation docs, plans, and archived legacy docs
```

## Delivery Standard

Good changes in this repository do three things at once:

- solve the operator problem
- preserve the architecture contract
- leave the next engineer or AI agent with less ambiguity than before
