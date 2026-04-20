# Organization and Branch Menu Foundation

## Goal

Preserve the current customer ordering experience, then expand the platform so one business can run multiple branches with different menus, different staff, and shared founder-level control.

This should become the product foundation before deeper feature work on promotions, purchasing, payroll-grade attendance, and tax-ready reporting.

## What Stays Stable

- customer QR ordering flow
- customer session and table flow
- multilingual customer menu support
- branch-level live order operations

The current ordering flow should stay branch-scoped. We should not redesign it unless a real operational problem forces that change.

## Core Business Model

### 1. Organization

The organization is the business control layer.

It owns:

- founders and co-founders
- finance permissions
- shared settings
- billing
- cross-branch reporting and analytics

### 2. Branch

Each branch is an operating restaurant.

A branch owns:

- its resolved menu, including inherited organization-shared content and branch-local content
- its prices
- item availability
- tables and QR codes
- staff and schedules
- attendance records
- purchases and local expenses
- branch-level reports and analytics

In the current codebase, the existing `restaurant` concept should become the branch-level unit. Multi-shop support should be added above it through an organization layer.

## Shared Founder Support

The system should support multiple owner-level people in one organization.

Recommended model:

- organization members for founders, finance partners, and trusted operators
- employee records for labor and attendance only
- scoped access per branch where needed

Recommended owner-side roles:

- `founder_full_control`
- `founder_operations`
- `founder_finance`
- `accountant_readonly`
- `branch_general_manager`

This keeps control, payroll, and audit responsibilities clean.

## Route Model and Naming Rule

The system should stop using the generic `dashboard` route name as the long-term product architecture.

That name is now too ambiguous because both founder-level work and branch-level work have been placed under it.

## Founder control route

- canonical host: organization subdomain
- canonical purpose: founder, co-founder, finance, and accountant control plane
- recommended route family name: `control`

This route should own:

- organization management
- branch creation and archive
- branch basic information
- branding and identity setup
- access management
- cross-branch finance, reporting, and analytics

## Branch operations route

- canonical host: organization subdomain with explicit branch context
- canonical purpose: day-to-day restaurant execution
- recommended route family name: `operations`

This route should own:

- menu
- staff and schedules
- attendance review
- purchases and expenses
- bookings
- branch-level reports and analytics

## Naming rule

Do not continue extending the product under a generic `dashboard` route in future architecture docs.

The current `dashboard` naming should be treated as transitional legacy naming inside the existing codebase.  
The target architecture should refer to:

- founder `control` route
- branch `operations` route

This keeps route ownership clear for both humans and AI agents.

## Host rule update

- public marketing, signup, login, and platform admin stay on the root domain
- each approved organization gets one company subdomain
- founder control and branch operations both run under that company subdomain
- legacy branch subdomains may remain as compatibility aliases during migration, but they are not the target operating model

## Branch-Specific Menu Strategy

This is the most important product update from your latest direction.

### Product Rule

Each branch can have a different menu.

At the same time, every branch should automatically inherit organization-shared categories and shared menu items.

That inherited content does not eliminate branch ownership. It means the branch menu becomes an explicit resolved menu made from:

- organization-shared categories and items
- branch-local categories and items that remain branch-owned
- branch-level operational controls such as availability, visibility, and pricing where supported

That difference may include:

- categories
- items
- prices
- tax treatment
- availability
- seasonal items
- branch-only items
- hidden items

### Implementation Rule

Keep customer ordering branch-scoped first, but make shared organization content inherit into branch menus automatically.

That means the simplest and safest next step is:

- one branch has one active resolved menu set
- customer ordering reads the branch menu only
- organization-shared categories and items flow into each branch menu automatically
- branch-local categories and items stay owned by the branch
- branch overrides stay explicit at the branch layer

### Explicit Source Tracking Rule

Inheritance must be explicit and traceable.

- inherited branch menu records must keep a durable link to the organization-shared source category or item
- branch-local records must remain clearly marked as branch-owned and not silently converted into shared records
- sync, detach, archive, and removal actions on inherited content must stay auditable
- customer ordering should always read the resolved branch menu, not guess at ownership during checkout

### Why this is the right first move

It protects the current customer ordering flow while giving founders a cleaner multi-branch menu operating model.

The branch still remains the operational unit, but founders no longer need to recreate the same categories and shared items branch by branch.

Explicit source tracking also prevents hidden coupling because the system can always tell whether a menu record came from the organization layer or was created locally by one branch.

### Recommended Rollout

#### Phase 1: Organization-shared inheritance foundation

- add organization-shared menu categories and shared items
- automatically inherit those shared records into each branch menu
- keep explicit source tracking between organization records and branch-resolved records
- preserve branch-local categories and items as branch-owned records
- add branch review tools for inherited versus local menu content

#### Phase 2: Branch controls and selective overrides

After the inheritance foundation is stable, optionally add:

- richer branch overrides for price, availability, and visibility
- selective detach or branch-only replacement workflows where needed
- comparison and rollout tools for shared menu updates across branches

This should stay operationally simple and should not make daily branch menu work harder.

## Customer Ordering Data Flow

```mermaid
flowchart TD
    A["Customer scans branch QR"] --> B["Table and branch identified"]
    B --> C["Customer session created for branch"]
    C --> D["Resolved branch menu loaded from inherited and local sources"]
    D --> E["Customer places order"]
    E --> F["Order stored with branch id"]
    F --> G["Branch operations route and mobile app receive realtime updates"]
```

## Founder Control Data Flow

```mermaid
flowchart TD
    A["Founder or co-founder signs in on root domain"] --> B["Organization scope resolved"]
    B --> C["Visible branches filtered by permission"]
    C --> D["Founder selects one branch or all branches"]
    D --> E["Control views load for setup, access, money, and cross-branch review"]
    E --> F["Monthly finance close aggregates approved branch data into organization views"]
```

## Branch Operations Data Flow

```mermaid
flowchart TD
    A["Branch manager signs in to branch route"] --> B["Branch context resolved"]
    B --> C["Menu, people, expenses, bookings, and local tasks load"]
    C --> D["Branch manager acts on daily operations"]
    D --> E["Branch reports and analytics show local performance"]
```

## Data Modeling Direction

### Add above the current restaurant layer

- `owner_organizations`
- `organization_members`
- `organization_restaurants`
- `organization_member_shop_scopes`
- `organization_member_permissions`
- `organization_menu_categories`
- `organization_menu_items`

### Keep branch-owned domains explicit

- `menu_categories`
- `menu_items`
- `tables`
- `employees`
- `attendance_records`
- `purchase_orders`
- `expenses`
- `branch_promotions`

### Keep menu inheritance ownership explicit

- organization-shared menu records should have stable organization-level identifiers
- branch menu records should carry explicit source metadata or mapping records when they inherit organization-shared content
- branch-local menu records should remain branch-owned even when they sit beside inherited content in the same branch menu
- reporting, audit logs, and future sync workflows should rely on explicit ownership data instead of inferred matching by name

### Add monthly finance snapshots

- `branch_monthly_finance_closures`
- `organization_monthly_finance_rollups`

These snapshot tables are important for stable reporting, accountant exports, and AI-agent maintainability.

## Production Safety Rules

The organization and branch foundation should also be designed for safe rollout and safe recovery.

- organization and branch migrations must include backfill and reconciliation steps for existing single-restaurant data
- member role changes, branch scope changes, and active-branch changes must be audit logged
- destructive menu copy actions should produce durable operation logs and post-copy validation results
- month-end finance snapshots should become immutable after close; any correction should happen through an explicit reopen or adjustment workflow
- destructive branch or menu actions should always have a confirmation step and a documented recovery path

Without these rules, the product may be functionally correct in development but still risky to operate in production.

## Mobile-First Owner Design Rules

- default to one clear branch picker
- show only the most urgent actions first
- use short action labels
- reduce deep settings pages
- design owner actions around today, this week, and this month

The owner should be able to do most daily work from a phone:

- switch branch
- check who is late
- approve attendance exceptions
- review sales
- create a quick discount or promotion
- record a purchase

The branch manager should be able to do most daily branch work from a phone:

- update menu availability
- review employee attendance issues
- record expenses
- manage bookings
- review branch reports and analytics

## AI-Agent Maintainability Rules

- keep authorization logic centralized
- keep finance calculations in one domain layer
- keep branch scope explicit in every route and query
- keep background jobs separate from route handlers
- define schema contracts clearly for each domain
- add invariant tests for money, permissions, and attendance approvals

The system should be easy for AI agents to extend without creating hidden coupling across orders, reports, and permissions.

## Recommended Next Implementation Order

1. Build organization and shared-founder access above the current restaurant layer.
2. Keep the current customer ordering flow intact and formalize branch-resolved menu ownership with organization-shared inheritance and explicit source tracking.
3. Add branch review, comparison, and override tools for inherited versus branch-local menu content.
4. Complete secure attendance, approvals, and payroll-grade daily hour summaries.
5. Add purchases, expenses, and monthly finance closure snapshots.
6. Add promotions and discount codes with branch scope and audit logs.

## Launch Guidance

For the Japan-first release to Vietnamese owners:

- make branch operations simple first
- make permissions trustworthy
- make monthly numbers exportable
- keep multilingual UI flexible
- avoid adding powerful but confusing abstractions too early

That gives the business a strong base for Japan first, then Vietnam and other markets later.
