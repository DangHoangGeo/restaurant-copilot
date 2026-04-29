# Role And Branch Access Scenarios

## Purpose

This note defines the intended least-privilege access model for organization
roles, branch-scoped managers, and employees.

It is based on the current codebase review on 2026-04-27. Use it before
changing roles, invites, branch routing, people, finance, purchasing, or any
legacy owner/restaurant API.

## Task Classification

- Primary area: shared domain foundation
- Also affected: founder control and branch operations
- Canonical route families:
  - organization/company work: `/{locale}/control/*`
  - branch execution work: `/{locale}/branch/{branchId}/*`
- Canonical API direction:
  - prefer `web/app/api/v1/owner/organization/*`
  - keep branch identity resolved server-side
  - treat `web/app/api/v1/owner/*` and `web/app/api/v1/restaurant/*` as transitional when they depend on `users.restaurant_id`

## Current Codebase Findings

The current implementation already has a usable organization access foundation:

- Organization roles live in `web/lib/server/organizations/types.ts` and
  `web/shared/types/organization.ts`.
- Default role permissions live in
  `web/lib/server/authorization/types.ts`.
- The central authorization service is
  `web/lib/server/authorization/service.ts`.
- Organization context resolution is handled by
  `web/lib/server/organizations/service.ts`.
- Active branch selection uses a server-set, httpOnly cookie in
  `web/lib/server/organizations/active-branch.ts`.
- Explicit branch routes are guarded by
  `web/lib/server/organizations/branch-route.ts`.
- Branch route permission mapping lives in
  `web/lib/branch-route-permissions.ts`.
- Transitional legacy authorization is bridged by
  `web/lib/server/rolePermissions.ts`.

The current implementation also has residual exposure risk:

1. `users.role` and `users.restaurant_id` are still powerful in legacy owner and
   restaurant APIs. Many routes still authorize with `owner` or `manager`
   instead of the org permission service.
2. New invite acceptance maps some org roles to legacy branch roles:
   - `founder_full_control` and `founder_operations` become legacy `owner`
   - `founder_finance` and `branch_general_manager` become legacy `manager`
   - `accountant_readonly` is intended to have no legacy branch
     `restaurant_id`
3. The canonical SQL baseline still defines `public.users.restaurant_id` as
   `NOT NULL`, while invite acceptance tries to create accountant users with
   `restaurant_id = null`. This must be reconciled before relying on
   accountant-only accounts in production.
4. Updating an organization member's role or shop scope changes
   `organization_members` and `organization_member_shop_scopes`, but does not
   currently synchronize the legacy `users.role` or `users.restaurant_id`.
   Downgrades can therefore leave stale legacy branch authority behind.
5. Selected branch scope input is validated as UUIDs, but the route/service
   layer should also prove every selected restaurant belongs to the same
   organization before inserting scope rows.
6. Some access helpers check the legacy branch fast path before org context.
   If an org member has a legacy `manager` role, direct API calls can bypass
   the more restrictive org-role intent.

## Access Principles

Use these rules for all new role work:

1. Organization member access is company/control access.
2. Employee access is labor/branch execution access.
3. Branch access is not enough to see all company data.
4. A role may access only the branches in its `shop_scope`.
5. `selected_shops` must only contain restaurants linked to the organization.
6. Financial data must be separated by meaning:
   - live operational revenue
   - expenses and purchases
   - payroll preparation
   - closed monthly snapshots
   - exports for accounting
7. People data must be separated by sensitivity:
   - roster and role
   - schedule and attendance
   - salary/payroll
   - private profile, bank, tax, and insurance fields
8. UI hiding is never authorization. Every sensitive API must enforce the same
   rule server-side.

## Role Scenarios

### Founder Full Control

Scenario: the company owner who can operate the full business.

Needs:

- manage organization settings, billing, approval/onboarding, and branches
- invite, edit, deactivate, and scope organization members
- manage all branch menus, branch settings, employees, schedules, attendance,
  purchases, promotions, reports, finance, exports, and close actions
- see sensitive people and finance data because they are accountable for the company

Should not be blocked from:

- cross-branch rollups
- member permission overrides
- branch switching
- payroll preparation and month close

Default scope:

- usually `all_shops`

### Founder Operations

Scenario: a trusted operations partner who runs restaurant work but should not
own company administration.

Needs:

- see assigned branches and operational health
- manage branch setup, branch menu operations, tables, orders, bookings,
  promotions, employees, schedules, attendance approvals, and local purchases
- see operational reports needed to improve service

Should not access:

- billing and subscription controls
- organization settings
- member invite/removal/permission controls
- finance exports and final accounting close unless explicitly granted
- company-wide confidential data outside assigned branches

Default scope:

- `all_shops` for a true co-operator
- `selected_shops` for a regional operator

### Founder Finance

Scenario: a finance partner who prepares money workflows but should not run
daily branch operations by default.

Needs:

- see revenue reports, spending, purchases, expense records, payroll summaries,
  month-close status, and exports for assigned branches
- create or correct finance records only when the founder explicitly wants
  finance partners to manage expenses
- review closed data and unresolved finance tasks

Should not access by default:

- orders and table operations
- menu editing
- promotions
- branch homepage/customer appearance settings
- employee private profile fields unless needed for payroll
- member management and organization settings

Current caution:

- The current default grants `purchases`, which also means write access in some
  services. If the intent is read/review only, split purchases into read and
  manage permissions before expanding finance users.

Default scope:

- usually `all_shops` for a company finance partner
- `selected_shops` for a branch-specific finance helper

### Accountant Readonly

Scenario: an external accountant who reviews or exports data after the business
period is ready.

Needs:

- read closed monthly snapshots
- read/export sales, expenses, purchases, payroll summaries, and tax-supporting
  reports for assigned branches
- see enough branch identity to understand the report source

Should not access:

- live order operations
- branch settings
- menu, tables, promotions, bookings, or customer presentation controls
- employee private profile details beyond explicit payroll/tax export outputs
- member management, billing controls, or organization settings
- any write path except possibly marking an internal review note in a future
  accountant-specific workflow

Default scope:

- `selected_shops` unless the founder intentionally grants company-wide access

Implementation rule:

- accountant access should go through org-aware finance/report APIs, not legacy
  branch APIs.

### Branch General Manager

Scenario: a manager responsible for one or more branches, with no company-wide
ownership.

Needs:

- access only assigned branches
- run local branch operations: orders, bookings, tables, menu availability,
  employees, schedules, attendance approvals, purchases, expenses, promotions,
  and local operational reports
- update branch settings that are operationally local

Should not access:

- other branches
- organization settings
- billing
- member invites and permission overrides
- cross-branch company finance except assigned branch rollups
- final company exports unless explicitly granted

Default scope:

- `selected_shops`

### Branch Employee Manager

Scenario: a branch employee with local management duties, represented in
`employees`, not as an organization member unless they also need control access.

Needs:

- branch execution views for their branch
- local staff coordination if the owner assigns that responsibility
- attendance and schedules for direct branch work

Should not access:

- founder control
- organization members
- cross-branch data
- billing
- company reports

Default scope:

- one branch through `employees.restaurant_id`

### Chef

Scenario: kitchen execution.

Needs:

- kitchen/order item state
- menu item availability when operationally needed
- possibly stock/inventory for assigned branch

Should not access:

- reports, finance, employees, schedules, salary, billing, company settings,
  branch customer branding, or other branches

Default scope:

- one branch through `employees.restaurant_id`

### Server Or Cashier

Scenario: service floor execution.

Needs:

- orders, order items, tables, bookings, and customer service flows for the
  assigned branch
- own attendance if enabled

Should not access:

- reports, finance, purchases, employees, payroll, branch settings, menu
  structure, promotions, billing, company settings, or other branches

Default scope:

- one branch through `employees.restaurant_id`

### Part-Time Staff

Scenario: limited labor participant.

Needs:

- own attendance and assigned shift information
- minimal task surface for the branch if enabled

Should not access:

- company data, branch management, reports, people lists, finance, or settings

Default scope:

- one branch through `employees.restaurant_id`

## Permission Gaps To Resolve

The current permission set is useful but too coarse for least privilege:

- `purchases` mixes viewing spending with creating or editing spending records.
- `employees` mixes roster access with private profile, schedules, salary, and
  sensitive payroll workflows.
- `reports` mixes live operational reporting with closed accounting data.
- `restaurant_settings` mixes branch identity, customer appearance, tables,
  menu structure, and local setup.
- `finance_exports` is export-oriented but some finance workflows need read
  access without export.

Recommended future permission split:

- `branch_reports_view`
- `finance_live_view`
- `finance_closed_view`
- `finance_export`
- `expenses_view`
- `expenses_manage`
- `purchases_view`
- `purchases_manage`
- `employee_roster_view`
- `employee_private_view`
- `employee_manage`
- `schedule_manage`
- `attendance_approve`
- `salary_close`
- `menu_manage`
- `branch_settings_manage`
- `promotions_manage`
- `orders_service`
- `organization_members_manage`
- `organization_settings_manage`
- `billing_manage`

Do not add all of these at once unless the UI and API are ready. Use this list
to avoid stretching a coarse permission beyond its real meaning.

## Immediate Hardening Order

1. Validate `selected_restaurant_ids` against `organization_restaurants` before
   creating or updating member shop scopes.
2. Reconcile accountant accounts with the database baseline:
   make no-branch org users a supported schema path, or choose another safe
   profile model that does not grant legacy branch access.
3. When member role or scope changes, synchronize or intentionally disable
   legacy `users.role` and `users.restaurant_id` so downgrades do not keep old
   branch authority.
4. In mixed helpers and APIs, resolve org context before the legacy
   owner/manager fast path whenever the user has organization membership.
5. Audit direct legacy APIs under `web/app/api/v1/owner/*` and
   `web/app/api/v1/restaurant/*` that still rely on `users.restaurant_id`.
6. Split coarse permissions before adding more finance, payroll, private people
   data, or external accountant workflows.
7. Add tests for branch scope, role downgrade, accountant access, finance
   read/export separation, and direct legacy API bypass attempts.

## Server-Side Access Contract

Every sensitive handler should follow this order:

1. authenticate the caller
2. resolve organization context
3. if org context exists, use organization permissions and branch scope as the
   source of truth
4. only use legacy `users.role` / `users.restaurant_id` when no org context
   exists
5. validate branch IDs against the caller's accessible branches
6. validate the requested action permission
7. perform the database change through a service that receives the already
   validated branch or organization ID

Never trust branch identity from a request body for sensitive actions.

## UI Contract

Founder control should show access by need:

- Full founder: all company and branch controls.
- Operations founder: operations and people controls, no billing or member
  permission controls.
- Finance founder: finance and report controls, not branch execution controls
  unless explicitly granted.
- Accountant: accounting/report export surface only, preferably from control
  finance instead of branch execution.
- Branch general manager: branch operations for assigned branches only, with
  clear branch labels and no company-level controls.
- Employees: branch execution or personal attendance surfaces only.

The UI must not be the only barrier. Hidden controls must match server-side
authorization.

## Definition Of Done For Role Access Work

A role/access change is done only when:

- the scenario and actor are named
- the route family is correct
- branch scope is server-validated
- the role cannot see branches outside its scope
- org members and employees stay separate
- legacy APIs do not bypass org permissions
- people and finance data are separated by sensitivity
- customer ordering still works
- tests cover at least one denied path for every new sensitive permission
