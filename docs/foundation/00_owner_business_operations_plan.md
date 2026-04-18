# Owner Business-Operations Plan

**Status**: Active foundation plan  
**Date**: April 13, 2026  
**Reviewed Against**: `9f02ecc`

**Current Direction Update**: Customer menu ordering is working well and should remain stable. The next expansion is multi-branch restaurant operations, where each branch can keep its own menu, pricing, availability, staff, and reporting rules without breaking the existing ordering flow.

## Executive Summary

This document is the complete business-operations review and implementation plan for the restaurant owner dashboard, owner-facing data flow, and scheduled jobs.

The current product already has a usable single-restaurant dashboard for menu, orders, tables, employees, bookings, reports, homepage, and settings. However, the owner product requested here is not complete yet. The biggest gaps are:

1. Multi-shop ownership is not supported.
2. Founder control and branch operations are still mixed into one dashboard surface.
3. Restaurant basic setup is not clearly owned by founders yet.
4. Promotions and discount codes are not implemented as a real owner feature.
5. Attendance and scheduling exist in basic form, but the QR approval workflow is not secure or complete enough for payroll-grade use.
6. Reports are not yet reliable enough for monthly cashflow review or tax submission.
7. Purchase and expense management are effectively missing from the owner dashboard.
8. Some existing owner report and inventory paths are out of sync with the current database schema.

This plan is intentionally written as a business-operations plan, not just a feature plan. The goal is not simply to let owners click more buttons. The goal is to help an owner run one or more restaurants in Japan with less stress, better control, and cleaner monthly numbers.

The main owner product shape should be:

- `Shops`
- `People`
- `Money`
- `Settings`

That structure is easier for restaurant owners than a large admin-style dashboard with too many unrelated sections.

This plan should now be read together with `01_organization_branch_menu_foundation.md`, which sets the foundation for shared founders, branch-level operations, and branch-specific menus.

---

## Product Goals

The owner experience should support:

1. Full restaurant management for owners who operate multiple shops.
2. Employee scheduling and daily working hours with QR-based check-in/check-out and approval.
3. Dynamic monthly cashflow reports that are clean enough to hand to an accountant or use for tax preparation.
4. Purchase management for equipment, supplier invoices, and daily food procurement.
5. A dedicated founder route that is separate from the branch operating route.
6. Founder-controlled setup for each restaurant's basic information and business configuration.

Product principles:

- Mobile-first before desktop polish.
- Fewer screens, fewer taps.
- Use operational language, not technical language.
- Avoid deep menu trees.
- Prefer guided defaults over configuration overload.
- Optimize for owner stress reduction before analytics depth.
- Make Japan the operational default for the first launch.
- Build foundations that AI agents can safely extend and maintain over time.

---

## Launch Market Focus

## Initial Market

- Country: Japan
- Initial target users: Vietnamese restaurant owners in Japan
- Later expansion: Vietnam, then other countries

## Important Implication

The product should not be designed as a generic global admin panel with many country switches from day one.

It should be:

- Japan-first in operations
- multilingual in UI
- modular enough to expand later

This means:

- tax and finance flows should match Japan first
- date, time, and currency defaults should match Japan first
- accounting exports should be useful to a Japan-based accountant first
- owner and employee UI should remain selectable in Vietnamese, Japanese, or English

This launch should also assume that some businesses are operated by more than one founder or trusted owner-level partner.

## Language Strategy

The existing multilingual approach is already a strength.

Current direction to preserve:

- owner and employee can select their familiar language
- customer ordering/menu already supports Japanese, English, and Vietnamese

Recommended operating model:

- owner language is independent from restaurant country
- staff language is independent from owner language
- system calculations, reports, and tax rules follow branch country rules

In other words:

- language is a UI preference
- country is an operations/compliance setting

That separation is important for Vietnamese owners running Japanese businesses.

---

## Shared Ownership Model

Many real restaurant businesses are not operated by a single owner account.

Common real-world cases:

- husband and wife founders
- siblings running operations together
- investor plus operator partnerships
- founder plus trusted finance partner
- founder plus area manager with near-owner permissions

The system should support this directly instead of forcing these users into staff roles.

## What the foundation should support

- multiple founder-level members in one organization
- different permission levels for each founder or partner
- branch-scoped access for some members
- read-only finance access for accountants or bookkeepers
- full-control access for one or more core founders

## Recommended access roles

Organization-level roles:

- `founder_full_control`
- `founder_operations`
- `founder_finance`
- `accountant_readonly`

Branch-level roles:

- `branch_owner`
- `general_manager`
- `people_manager`
- `staff`

## Recommended access scopes

Each organization member should have:

- a role
- a scope
- a permission set

Scope should support:

- all shops
- selected shops only

Permission groups should support:

- reports
- finance exports
- purchases
- promotions
- employees
- attendance approvals
- restaurant settings
- organization settings
- billing and subscription

## Operational rule

Do not model shared founders as employees.

Employees are labor and attendance entities.  
Founders and co-owners are control and accountability entities.

That separation is important for:

- clean permissions
- correct audit logs
- cleaner payroll logic
- easier future maintenance

## Route Separation Rule

The system should no longer treat founder work and branch work as one combined dashboard.

### Founder / Co-Founder route

- canonical login destination should be the root domain, not a branch subdomain
- this is the control plane for founders, co-founders, finance partners, and accountants
- this route owns organization-level control and founder-level branch control

### Branch route

- canonical destination should be the branch-scoped restaurant route
- this route is for branch managers and local operators running the restaurant day to day
- this route should stay focused on high-frequency operational work

### Product rule

Do not keep extending founder workflows inside the current branch-scoped dashboard structure.

The current codebase mixes founder work and branch work too heavily.  
That should now be treated as refactor work, not as the base structure for future features.

## Founder-Owned Restaurant Setup

For the new direction, the founder or co-founder should set up each restaurant's basic information.

That includes:

- restaurant name
- subdomain
- address and contact details
- branding and homepage basics
- tax and currency defaults
- payment method configuration
- QR and operating defaults
- who can access the branch

Branch managers should not be the primary owner of these setup tasks.

Branch managers should focus on:

- menu
- employees
- schedules and attendance review
- expenses and purchases
- bookings
- local branch operations

If a branch manager needs basic restaurant information changed, that should flow through founder-controlled settings or a future approval/request mechanism.

---

## Business-Operations Lens

The owner does not wake up wanting:

- a promotion dashboard
- a reporting tab
- a beautiful analytics chart

The owner wakes up asking:

- Which shop needs attention first?
- Who is late or missing today?
- How much money came in today?
- What do I need to buy tomorrow?
- Are this month’s numbers ready for payroll, accountant review, and tax preparation?

So the product should be designed around the owner's real operating loops.

## Core Owner Loops

### 1. Opening the day

- check staffing
- check shift gaps
- check low-stock warnings
- check booking load
- check unresolved issues from yesterday

### 2. Running the day

- monitor sales
- monitor staff attendance
- approve exceptions
- react to supplier or stock issues

### 3. Closing the day

- review sales and discounts
- review labor hours
- review purchase records
- confirm unresolved attendance issues

### 4. Closing the month

- review revenue, tax, discounts, refunds
- review expenses and purchases
- review approved labor hours
- export accountant-ready package

This is the operational backbone the owner dashboard must support.

---

## Current State Review

### Already Present

- Owner dashboard shell with mobile bottom navigation.
- Restaurant settings and homepage management.
- Menu management.
- Order management.
- Table and QR management.
- Employee list, schedules, attendance, performance tabs.
- Reports page with charts and export actions.
- Booking UI and booking APIs.
- Low-stock concept in dashboard and reporting.

### Partially Implemented

- Employee schedules and attendance.
- Reports and exports.
- Inventory and low-stock alerts.
- Discount handling in iOS checkout.
- Bookings management.

### Missing or Not Production-Ready

- Multi-shop owner model.
- Promotions/coupons CRUD and redemption.
- Secure QR credential model for attendance.
- Approval workflow suitable for payroll review.
- Tax-ready monthly finance package.
- Purchase and supplier management.
- Reliable scheduled reporting jobs for owner finance.

---

## Business Readiness Assessment

With the current codebase, an owner can partially manage a restaurant, but cannot yet run the full business smoothly without spreadsheets, messaging apps, and manual accounting support.

### What an owner could do today

- manage core restaurant profile
- manage menu and tables
- process and track orders
- use basic employee, schedule, and attendance screens
- use basic reports and exports

### What an owner would still need external tools for

- managing multiple shops under one account
- reliable payroll-hour approval
- structured promotions and coupon control
- supplier and purchasing management
- month-end cashflow review
- tax/accounting preparation

### Conclusion

The current system is operationally helpful, but not yet sufficient as the main control system for a multi-shop owner in Japan.

---

## Key Findings From Code Review

### 1. Multi-shop ownership is blocked by the current tenancy model

The current model assumes one user belongs to one `restaurant_id`. Signup creates exactly one restaurant, and login resolves to exactly one restaurant dashboard.

Impact:

- an owner cannot manage multiple branches under one account
- cross-shop reporting and centralized settings are impossible
- promotions, purchases, and finance cannot be managed at group level
- shared founder access cannot be modeled cleanly

### 2. Attendance exists, but the QR flow is not owner-grade

The current attendance scan flow treats `qrToken` as the `employee_id` and only allows the logged-in employee to scan for themself.

Impact:

- no secure QR credential
- no kiosk mode
- no manager-assisted scan flow
- no clear separation between raw attendance events and approved payroll hours

### 3. Report and inventory logic are inconsistent with the schema

Some owner report APIs still query columns that do not exist in the current schema shape, or use placeholder logic for low-stock calculations.

Impact:

- some dashboard widgets may silently fail or drift from reality
- monthly finance reports cannot be trusted until the reporting layer is corrected

### 4. Scheduled job foundation exists, but owner finance jobs are not reliable yet

There is already a scheduled usage snapshot edge function, but the SQL behind it still references older table and column patterns.

Impact:

- daily and monthly rollups are not dependable
- staff hours and revenue snapshots cannot be used as the base for accounting reports

### 5. Promotions and discount codes are still only planned, not delivered

The codebase contains discount inputs in iOS checkout and planning docs for promotions and coupons, but no live owner-facing promotions module.

Impact:

- owners cannot create reusable offers
- discount codes are free text, not validated business objects
- no reporting by promotion effectiveness

### 6. Purchase management is effectively absent from the owner product

There are expense tables in production SQL, but they are not wired into the owner dashboard and do not model tenant ownership correctly for this use case.

Impact:

- no supplier management
- no purchase orders
- no invoice attachment flow
- no expense-to-cashflow linkage

---

## Unfinished Feature Inventory

## A. Multi-Shop Owner Management

### Current status

- not implemented

### Missing pieces

- owner organization or group entity
- branch membership model
- shared founder membership model
- branch switcher in UI
- group-level summary dashboard
- shared vs branch-local settings
- consolidated reports across shops

## B. Promotions and Discount Codes

### Current status

- not implemented as a full owner feature
- iOS checkout has manual discount input only

### Missing pieces

- promotions table
- coupons table
- redemption tracking
- validation API
- owner UI for CRUD
- promotion performance reports
- branch-scoped or group-scoped campaigns

## C. Employee Scheduling and Working Hours

### Current status

- basic employee list, schedule, attendance, and verification UI exists

### Missing pieces

- secure employee QR credential lifecycle
- re-issue and disable QR credentials
- shared kiosk scanning mode
- manager override flow
- late, early, and overtime calculations
- payroll summary by day, week, and month
- approval queue and audit log
- employee self-service view for schedule and attendance

## D. Monthly Cashflow and Tax Reporting

### Current status

- reports UI exists with charts and exports
- not accounting-grade

### Missing pieces

- monthly close pipeline
- revenue, discount, tax, and refund separation
- expense integration
- shop-by-shop and consolidated summaries
- tax-ready export package
- accountant handoff format
- finalized monthly snapshot job

## E. Purchase Management

### Current status

- no owner dashboard workflow

### Missing pieces

- suppliers
- purchase records
- purchase orders
- receiving flow
- invoice and receipt attachments
- equipment purchase tracking
- food procurement tracking
- stock adjustment linkage

---

## Required Application Routes

## 1. Founder / Co-Founder Route

Canonical destination:

- root domain after login

Purpose:

- let founders manage one or many restaurants from one control surface
- keep business control separate from branch execution

Recommended primary navigation:

- `Overview`
- `Restaurants`
- `People With Access`
- `Money`
- `Settings`

Core founder responsibilities:

- create restaurant
- set restaurant basic information
- manage restaurant subdomain and identity
- manage branding and homepage basics
- manage tax, payment, and configuration defaults
- manage founders, co-founders, accountants, and managers
- review branch health across the organization
- manage month-end and cross-branch finance outputs
- manage promotions and branch-level rollout decisions

Founder route screens should feel like:

- control
- review
- setup
- approval
- finance

Not like a branch operator's task list.

## 2. Branch Route

Canonical destination:

- branch-scoped restaurant route

Purpose:

- let branch managers and local operators run the restaurant smoothly every day

Recommended primary navigation:

- `Dashboard`
- `Orders`
- `Menu`
- `People`
- `Expenses`
- `Bookings`

Core branch responsibilities:

- manage day-to-day menu operations
- manage employees and schedules
- review attendance exceptions
- record expenses and purchases
- manage bookings
- monitor low stock and branch alerts
- handle daily branch execution

Branch route screens should feel like:

- action
- speed
- local branch context
- today and this week

Not like company administration or founder setup.

## 3. Explicit Separation of Ownership

Founder route owns:

- organization settings
- restaurant creation and archive
- restaurant basic information
- branch identity and subdomain
- brand and homepage control
- tax and payment defaults
- access management
- finance close and accountant export
- promotion policy and rollout

Branch route owns:

- menu management
- employee operations
- attendance review
- expenses and purchases
- bookings
- daily branch reports and alerts

Branch route should not own:

- organization membership
- billing
- restaurant basic identity
- subdomain changes
- tax configuration
- founder-level finance close
- company-wide settings

## 4. Refactor Rule for Current Codebase

The current branch dashboard contains a mix of:

- founder setup
- founder controls
- branch operations
- some low-value screens that do not belong in the launch-critical workflow

The plan now requires an explicit refactor:

### Move to founder route

- organization management
- restaurant basic info and profile
- homepage and branding ownership
- settings that change identity, subdomain, tax, payment, or organization access
- multi-branch finance and promotion control

### Keep in branch route

- menu
- employees
- attendance review
- expenses and purchases
- bookings
- orders and tables
- local operational dashboard

### Remove, defer, or simplify

- low-frequency screens that do not help the founder control the business
- low-frequency screens that do not help the branch manager run the restaurant
- duplicated settings surfaces
- admin-style features that add complexity without operational value

---

## Japan-First Operating Requirements

For the first release, the owner system should assume Japanese restaurant operations by default.

## Operational defaults

- timezone: Asia/Tokyo
- currency: JPY
- default tax configuration for Japan
- Japan-style business day and month-end assumptions

## Finance expectations

The first release should produce monthly outputs that help owners answer:

- gross sales
- discounts
- tax collected
- refunds or cancellations
- purchases and expenses
- labor cost input base
- net operating picture for the month

The export does not need to replace an accountant, but it must reduce manual work for the owner.

## Compliance positioning

This plan assumes:

- accountant-ready, not fully automated tax filing
- payroll-supporting attendance approval, not full payroll engine
- invoice or receipt attachment and export, not full ERP

That is the right first-release scope.

## Production Readiness Additions

Executing the feature roadmap alone is not enough to make the owner system production-ready.

Before release, the plan also needs explicit work for rollout safety, monitoring, recovery, and support operations.

### 1. Release operations

- staging environment should mirror the production auth, RLS, scheduled jobs, storage, and branch-switching behavior closely enough for rehearsal
- every migration that changes owner data, organization membership, attendance, or finance must be rehearsed on production-like data first
- every risky feature should have a feature-flagged rollout or an equivalent controlled release path
- iOS release and web release should have one coordinated launch checklist for owner-critical features

### 2. Observability and alerts

The first release should include dashboards and alerts for:

- failed or delayed scheduled finance snapshot jobs
- invite acceptance failures
- active-branch or branch-scope authorization failures
- attendance approval backlog or stuck correction flows
- month-end export failures
- unusual error spikes on owner dashboard APIs

If these are not visible, owners will discover failures before the team does.

### 3. Data safety and correction workflows

The first release should define:

- backup and recovery expectations for critical owner data
- reconciliation scripts or queries for finance snapshots
- explicit correction workflows for attendance summaries and monthly close data
- immutable closed-month outputs with controlled reopen or adjustment rules
- secure storage rules for invoice, receipt, and attachment uploads

### 4. Supportability

The team should have runbooks for:

- resending or repairing organization invites
- correcting branch membership or scope problems
- rerunning failed scheduled jobs safely
- correcting attendance after approval disputes
- reopening or adjusting a month-end close when a late expense or refund is discovered

### 5. Performance and reliability expectations

The owner product should define acceptable production behavior for:

- mobile branch switching responsiveness
- owner dashboard load on poor mobile connections
- month-end export generation time
- degraded behavior when a background job is delayed or fails

These do not need enterprise-grade SLO language for the first release, but they do need explicit targets and fallback expectations.

---

## Owner Stress Optimization

The first release should optimize for these pain points in order:

1. labor uncertainty
2. cashflow uncertainty
3. purchasing forgetfulness
4. branch switching confusion
5. promotion complexity

This means the product priority order should not be based on what is easiest to build. It should be based on what removes the most mental load from the owner.

## High-Stress Owner Moments

### Morning

- "Who is actually here?"
- "Do I have enough staff?"
- "Do I need to buy anything today?"

### Midday rush

- "Which branch is having a problem?"
- "Do I have a staffing issue?"

### Night

- "Did everyone check out properly?"
- "Did we miss any purchases or expenses?"

### End of month

- "Are my labor hours correct?"
- "How much tax am I collecting?"
- "Can I send this to my accountant?"

The dashboard should explicitly help with these moments.

---

## Proposed Data Model Changes

## Phase A: Multi-Shop Foundation

Add:

- `owner_organizations`
- `organization_members`
- `organization_restaurants`
- `organization_member_shop_scopes`
- `organization_role_templates`
- `organization_member_permissions`

Recommended model:

- a user may belong to one or many organizations
- an organization owns one or many restaurants
- a restaurant still remains the tenant boundary for operational data
- organization-level access is used for switching, rollups, and shared controls
- organization members can be multiple founders, finance partners, accountants, or delegated operators

Keep:

- `restaurant_id` on transactional tables for strict RLS isolation

This avoids breaking the current tenant model while allowing group ownership.

## Recommended permission design

Use explicit permission objects, not only role name checks spread through route files.

Recommended pattern:

- role template defines default capabilities
- member permission overrides are stored centrally
- APIs read a shared authorization layer
- UIs consume capability flags from one source of truth

Do not rely on:

- hardcoded role strings in many routes
- staff-role reuse for founder permissions
- ad hoc conditional UI hiding without backend authorization

## Recommended core entities

- `owner_organizations`
  - business group or ownership group
- `organization_members`
  - who belongs to the group
- `organization_restaurants`
  - which restaurants belong to the group
- `organization_member_shop_scopes`
  - which shops a member can access
- `organization_role_templates`
  - reusable role definitions
- `organization_member_permissions`
  - explicit grants for special cases
- `audit_logs`
  - sensitive action traceability

## Phase B: Promotions

Add:

- `promotions`
- `promotion_scopes`
- `coupons`
- `coupon_redemptions`
- `order_discounts`

Core fields:

- discount type: percentage or fixed
- active window
- max uses
- branch scope or organization scope
- minimum spend
- stackability rule

## Phase C: Attendance and Payroll Approval

Add:

- `employee_qr_credentials`
- `attendance_events`
- `attendance_daily_summaries`
- `attendance_approvals`

Model split:

- `attendance_events`: raw scans
- `attendance_daily_summaries`: system-calculated daily hours
- `attendance_approvals`: owner or manager approved result for payroll

This is much safer than storing only one mutable attendance row per day.

## Phase D: Finance and Purchasing

Add:

- `suppliers`
- `purchase_orders`
- `purchase_order_items`
- `purchase_receipts`
- `expenses`
- `expense_attachments`
- `monthly_financial_snapshots`

Recommended principle:

- sales data stays operational
- monthly financial snapshots are derived and frozen after close

---

## Target Owner Data Flow

## 1. Multi-Shop Flow

1. Founder logs in.
2. System loads organization memberships and capability profile.
3. Founder lands on either:
   - branch dashboard if they only have one shop, or
   - group overview if they manage multiple.
4. Branch switcher controls the active shop context.
5. All operational APIs remain scoped by `restaurant_id`.
6. Group-level dashboards read aggregated, read-only views across linked restaurants.
7. Sensitive screens and actions are filtered by capability, not by UI convention alone.

## 1A. Shared Founder Access Flow

1. Organization owner invites a co-founder or trusted partner.
2. System assigns an organization role template.
3. System assigns shop scope:
   - all shops, or
   - selected shops.
4. Member logs in and sees only allowed modules and branches.
5. Every sensitive action is audit logged with:
   - actor
   - role
   - shop scope
   - object changed
   - timestamp

## 2. Employee Schedule and Attendance Flow

1. Owner creates employee.
2. System creates user membership and employee profile.
3. Owner assigns shifts by day.
4. System issues or rotates employee QR credential.
5. Employee scans at kiosk or self-scan flow.
6. System writes raw `attendance_events`.
7. Job or server-side function builds `attendance_daily_summaries`.
8. Owner or manager reviews daily exceptions.
9. Owner approves hours for payroll.
10. Monthly payroll export is generated.

Operational note:

- raw scans should never be treated as final payroll truth
- approval is the business control point

## 3. Promotions Flow

1. Owner creates promotion.
2. Owner optionally creates coupon codes.
3. Promotion is scoped to a branch or organization.
4. Order or checkout validates the coupon.
5. System stores redemption and applied discount.
6. Reports show revenue impact, usage count, and conversion.

## 4. Monthly Finance Flow

1. Orders, refunds, discounts, tax, and expenses are recorded daily.
2. Nightly jobs compute daily snapshots.
3. End-of-month close compiles:
   - gross sales
   - discounts
   - net sales
   - tax collected
   - expenses
   - cashflow summary
4. Owner reviews and confirms the month.
5. System generates export package for accounting or tax use.

Operational note:

- monthly close should freeze a report snapshot so the owner and accountant see the same month

## 5. Purchasing Flow

1. Founder or authorized branch manager creates or selects supplier.
2. Branch manager records a purchase or raises a PO.
3. Goods are received.
4. Stock is updated where relevant.
5. Receipt or invoice is attached.
6. Expense is posted to finance reports.

---

## Jobs and Scheduled Processing

The owner product needs stable daily and monthly jobs. Existing jobs should be corrected first, then extended.

## Required Jobs

### 1. Daily Operational Snapshot Job

Runs nightly per restaurant.

Outputs:

- order count
- gross sales
- discounts
- tax
- refunds
- active staff hours
- low-stock counts

### 2. Attendance Summary Job

Runs every few minutes or on-demand after scan events.

Outputs:

- daily attendance summary
- missing checkout flags
- overtime flags
- late arrival flags

### 3. Promotion Status Job

Runs hourly or nightly.

Outputs:

- activate scheduled promotions
- expire finished promotions
- notify owners of nearing limits or end dates

### 4. Monthly Finance Close Job

Runs at month end or manually when the owner closes the month.

Outputs:

- monthly financial snapshot
- branch rollup
- organization rollup
- accountant export package

### 5. Owner Alert Digest Job

Runs daily in the morning.

Outputs:

- missing checkouts
- unapproved attendance
- low-stock items
- unpaid supplier records
- upcoming bookings pressure

This should eventually become the owner's "what needs attention today" inbox.

### 6. Purchase Reminder Job

Runs daily.

Outputs:

- recurring supplier reminders
- unpaid invoice reminders
- receiving reminders for open purchase orders

### 7. Permission Drift Audit Job

Runs daily or weekly.

Outputs:

- members with unusually broad access
- disabled members still attached to shops
- founder or accountant roles with inconsistent scope
- missing audit-log coverage for sensitive actions

## Important Fix Before Adding More Jobs

The current usage snapshot and reporting SQL must be corrected to the actual schema before any finance automation is trusted.

---

## UX Design Plan

## General UI Rules

- mobile-first layout
- one primary action per screen
- lists as cards on mobile
- use sheets and drawers instead of desktop-heavy modals
- founder route and branch route must not share the same navigation model by default
- default every page to the one question the user is trying to answer

## Founder Route UX

Replace the current broad mixed dashboard with a clearer founder home:

- today sales
- pending approvals
- low stock
- unpaid purchases
- month-to-date cashflow

Secondary information only after that:

- recent orders
- promotions performance
- trend charts

Quick actions:

- add restaurant
- switch branch
- manage access
- export month report

Primary mobile home card groups:

- `Today`
- `Restaurants`
- `People With Access`
- `Money`
- `Attention Needed`

Founder route should also own:

- branch list and health summary
- organization members and access
- restaurant basic setup
- founder-level finance close

## Branch Route UX

Branch route should feel like the branch manager's operating tool, not the founder's control panel.

Branch route home should prioritize:

- today's bookings
- today's staffing issues
- low-stock alerts
- expenses to record
- branch sales snapshot

Quick actions:

- update menu item availability
- add employee shift
- resolve attendance issue
- record expense
- confirm booking

## Founder Restaurants UX

- branch cards with health summary:
  - today sales
  - active orders
  - staff on shift
  - alerts
- access-management sheet for founders and trusted partners

## Branch People UX

Tabs:

- Employees
- Schedule
- Attendance
- Payroll

Prioritize:

- fast filtering
- weekly schedule entry
- attendance inbox
- one-tap approve
- missing scan resolution
- export monthly hours

## Founder Money UX

Tabs:

- Cashflow
- Promotions
- Purchases
- Taxes

Each tab must answer:

- what changed today
- what needs attention
- what the owner should do next

### First-release recommendation

Do not overload `Money` with deep accounting vocabulary.

Start with:

- Sales
- Discounts
- Expenses
- Purchases
- Month End

Then map advanced accounting logic underneath those simple labels.

## Founder Access Management UX

This should be simple enough for a non-technical founder.

Recommended mobile-first flow:

1. `Organization`
2. `People With Access`
3. open member
4. choose:
   - role
   - shops
   - sensitive permissions

Avoid exposing raw permission matrices first.
Use presets with an advanced override only where necessary.

Example presets:

- Full Founder
- Operations Founder
- Finance Founder
- Accountant
- Branch Owner
- General Manager

## Branch Manager UX Scope Rule

Branch managers should not spend their time in:

- restaurant basic info setup
- branding and homepage management
- organization membership settings
- tax or payment configuration
- billing or subscription

If a screen is rarely used and mainly about business control, it belongs in the founder route, not the branch route.

---

## Implementation Roadmap

## Phase 0: Stabilization and Schema Alignment

**Goal**: fix the current owner data layer and lock the route separation direction before adding major features

### Tasks

1. Correct report APIs that query outdated columns.
2. Correct low-stock APIs to use `inventory_items`.
3. Fix booking status update route.
4. Fix scheduled snapshot SQL and edge function assumptions.
5. Add regression tests for owner reports, bookings, and attendance.
6. Define Japan-first finance output shape before further report work.
7. Define unified authorization architecture before adding shared-founder features.
8. Audit the current branch dashboard and classify every major screen as:
   - founder route
   - branch route
   - remove or defer

### Deliverables

- owner dashboard metrics return valid data
- reports page loads reliably
- nightly snapshot works with current schema
- bookings can be confirmed or canceled successfully
- owner month-end numbers have a stable calculation base
- the next phases have one permission model instead of route-by-route permission drift
- the team has an approved founder-route vs branch-route map before more UI is added

## Phase 1: Shared Foundation and Architecture Reset

**Goal**: build the shared database, domain, auth, component, and route foundations before executing founder or branch surfaces

### Tasks

1. Finalize organization or group data model.
2. Finalize organization membership and permission model.
3. Centralize shared authorization, organization context, and branch context.
4. Create shared server domain modules, schemas, and types.
5. Create shared UI primitives and route shells for founder route and branch route.
6. Define the target folder and module structure for the refactor.
7. Allow codebase reorganization where the existing layout blocks the new architecture.

### Deliverables

- shared database and service foundations support the target architecture
- shared auth and permission model is centralized
- shared types, schemas, and UI foundations exist before route-specific implementation
- the team has a clear target code structure and is free to reorganize toward it

## Phase 2: Founder Control Route Foundation

**Goal**: let one founder manage multiple shops from a dedicated founder route without breaking tenant isolation

### Tasks

1. Add root-domain founder route shell.
2. Add branch switcher inside founder route.
3. Add group overview dashboard.
4. Add organization access-management UI.
5. Move restaurant basic information ownership into the founder route.
6. Update auth and login redirect behavior so founders and co-founders land on the root domain.

### Deliverables

- one owner account can manage multiple branches
- one organization can have multiple founders or partners
- members can be scoped to selected shops
- branch context switching works on mobile and desktop inside the founder route
- group-level summary is available
- founder or co-founder login lands on the root-domain control surface
- restaurant basic information is managed from the founder route
- operational data remains safely branch-scoped
- sensitive actions are capability-checked and audit logged

## Phase 3: Founder Feature Execution

**Goal**: build founder features first on top of the new shared foundation and founder route

### Tasks

1. Implement founder-controlled restaurant setup and profile flows.
2. Implement founder-controlled organization and access workflows.
3. Implement founder-level finance review, cross-branch overview, and month-end surfaces.
4. Implement founder-level promotion policy and rollout controls.

### Deliverables

- founder route is useful as a real business control surface
- founders can manage restaurants, access, and finance from the root domain
- founder-only workflows no longer depend on branch-owned pages

## Phase 4: Branch Route Refactor

**Goal**: refactor the existing branch dashboard into a focused branch operations route

### Tasks

1. Move founder-only screens out of the branch route.
2. Keep branch operations screens only where they support daily restaurant execution.
3. Remove, defer, or simplify low-value screens that add noise without helping founders or branch managers.
4. Define branch-manager permissions so they align with the reduced operational route.
5. Ensure branch managers no longer own restaurant basic information setup.

### Deliverables

- branch route is clearly operational, not founder-administrative
- branch manager sees menu, employees, attendance, expenses, bookings, and local dashboard tools
- branch manager no longer owns restaurant identity, organization access, or tax/payment setup
- duplicate settings surfaces are reduced
- the codebase has a clear separation between founder route and branch route

## Phase 5: People Operations

**Goal**: turn employees, schedules, and attendance into a complete branch operations workflow with founder oversight where needed

### Tasks

1. Replace current QR flow with secure QR credentials.
2. Add kiosk scan mode and manager-assisted scan flow.
3. Add attendance event model and daily summary model.
4. Add approval inbox.
5. Add payroll summary and monthly hours export.
6. Add exception states: late, missed checkout, manual correction pending.

### Deliverables

- employee can check in or out securely
- manager can review and approve hours
- monthly hours export is available
- founder can understand labor issues in minutes without needing to live inside the branch route

## Phase 6: Finance and Tax Reporting

**Goal**: produce clean monthly cashflow and tax-ready outputs in the founder route for Japan-first operations

### Tasks

1. Add daily finance snapshot model.
2. Add monthly financial snapshot model.
3. Separate gross sales, discounts, tax, refunds, and net sales.
4. Add branch and organization rollups.
5. Add CSV, PDF, and accountant export package generated server-side.
6. Add owner-facing month-end checklist flow.

### Deliverables

- founder can review month-to-date cashflow
- founder can export monthly tax and accounting package
- multi-shop owners can view consolidated totals
- month-end close is a guided workflow, not a raw report page

## Phase 7: Purchasing and Expenses

**Goal**: add the missing purchase layer

### Tasks

1. Add supplier model.
2. Add purchase record or PO flow.
3. Add invoice and receipt uploads.
4. Link purchases to expenses and stock updates.
5. Add purchase dashboard screens.

### Deliverables

- branch manager can record food purchases
- branch manager can record equipment purchases
- monthly expenses are visible in reports
- branch team has a usable daily procurement workflow on mobile

## Phase 8: Promotions and Discounts

**Goal**: give founders a simple promotion system that actually affects checkout and reports

### Tasks

1. Add promotion and coupon schema.
2. Add owner CRUD screens.
3. Add validation API.
4. Integrate with web and iOS checkout.
5. Add promotion usage reporting.

### Deliverables

- founder can create and manage promotions
- discount codes are validated by backend
- orders store real discount objects, not just text input
- founder can measure whether a promotion helped or hurt margin

## Phase 9: Polish and Operations

**Goal**: make the system easy to maintain and safe to operate

### Tasks

1. Add audit trails for approvals, promotion changes, and purchasing.
2. Add alerts and notification rules.
3. Add empty states and mobile refinements.
4. Add onboarding for multi-shop owners.
5. Add operational dashboards for failed jobs and stuck approvals.
6. Add country modularity layer for later Vietnam expansion.
7. Add AI-agent maintenance guardrails and repository conventions.

---

## AI-Agent Implementation and Maintenance Strategy

This system should be implemented by AI agents and maintainable by AI agents. That requirement changes the foundation design.

The codebase should not depend on tribal knowledge, hidden assumptions, or permissions logic scattered across many files.

## Design goals for AI-agent-friendly architecture

- small, explicit modules
- stable file ownership boundaries
- strong typing and validation
- one source of truth for permissions
- one source of truth for financial calculation rules
- machine-readable contracts between layers
- predictable naming and folder conventions
- testable invariants around money, access, and attendance

## Foundation rules for AI-agent-friendly development

### 1. Centralize authorization

All access checks should go through shared authorization helpers.

Avoid:

- route-local permission inventions
- UI-only hiding
- repeated role string comparisons across unrelated files

Prefer:

- `lib/server/authorization/*`
- capability-based checks
- typed policy objects

### 2. Separate domains clearly

Keep these domains separate:

- identity and organization access
- restaurant operations
- attendance and payroll approval
- promotions and discounts
- purchases and expenses
- finance snapshots and exports

This makes it easier for AI agents to change one area without breaking another.

### 3. Use explicit schemas everywhere

For every API and job:

- request schema
- response schema
- typed return object
- domain-level validation

This reduces ambiguity for both humans and AI agents.

### 4. Keep money logic in one place

All calculations for:

- gross sales
- discounts
- tax
- refunds
- net sales
- monthly snapshots

should be implemented in shared finance modules or database functions with tests.

Do not duplicate calculation logic across:

- web pages
- APIs
- jobs
- exports
- mobile clients

### 5. Make jobs first-class modules

Each scheduled job should have:

- purpose
- inputs
- outputs
- owner module
- failure handling
- retry behavior
- idempotency expectation

AI agents maintain jobs much better when job behavior is explicit and documented.

### 6. Add invariant tests

Critical business invariants should be test-covered:

- a member cannot access a shop outside their scope
- approved payroll hours never exceed the source day logic without manual override trail
- monthly snapshot numbers match underlying transaction totals
- discount application cannot exceed allowed limits
- finance export uses closed-month snapshot, not live recalculation

### 7. Write thin routes, thick domain services

APIs should mostly:

- validate input
- call domain service
- return typed result

Put business logic into service modules rather than route handlers.

That makes future AI-agent changes much safer.

### 8. Keep documentation close to architecture

Maintain:

- domain docs
- permission map
- job catalog
- schema map
- milestone status docs

AI agents perform much better when the repo contains up-to-date operational context.

## Recommended repository conventions for maintainability

- `web/lib/server/authorization/`
- `web/lib/server/organizations/`
- `web/lib/server/attendance/`
- `web/lib/server/finance/`
- `web/lib/server/purchasing/`
- `web/lib/server/promotions/`
- `web/lib/server/jobs/`

For each domain:

- `schemas.ts`
- `service.ts`
- `queries.ts`
- `types.ts`
- `__tests__/`

## Recommended change-management rules

For AI-agent maintainability, require:

- every new domain feature has a schema, service, and tests
- every new permission has central registration
- every new job has idempotency notes
- every new export has snapshot source declared
- every sensitive mutation writes an audit log

These rules will slow down careless changes a little, but they will make future AI implementation and maintenance dramatically easier.

---

## Detailed Acceptance Criteria

---

## Japan First, Vietnam Ready

The best way to support later Vietnam expansion is not to make version 1 fully cross-country.

The best way is:

1. lock the first release to Japan operations
2. keep UI multilingual
3. isolate country-sensitive logic behind configuration and report modules

## Country-Sensitive Modules To Separate Early

- tax calculation and labels
- month-end export format
- payment method defaults
- invoice and receipt conventions
- labor and payout summary templates

## Country-Neutral Modules

- shops
- employees
- schedules
- attendance events
- promotions core
- purchases
- supplier records

---

## Detailed Acceptance Criteria

## Multi-Shop

- owner can create a second shop without creating a second login
- organization can have more than one founder-level member
- founder or partner can be scoped to selected shops only
- owner can switch shops in under two taps on mobile
- founder login lands on the root domain rather than a branch subdomain
- all shop pages remain isolated by `restaurant_id`
- group overview shows branch summaries without exposing cross-tenant writes

## Shared Ownership and Access

- organization owner can invite a co-founder or trusted partner
- founder roles are not stored as employee roles
- accountant can be granted read-only finance access
- permissions are enforced in backend services, not only hidden in UI
- sensitive access and config changes are audit logged

## Promotions

- owner can create a fixed-amount or percentage promotion
- owner can generate or define coupon codes
- coupon validation happens on the backend
- promotion usage is visible in reports

## Attendance

- raw scan events are stored
- daily hours are system-calculated
- owner can approve or reject daily hours
- payroll export matches approved records only

## Reporting

- monthly report includes gross sales, discounts, tax, refunds, net sales, and expenses
- report can be exported as CSV and PDF
- monthly snapshot is frozen after close
- report is understandable by a Vietnamese owner operating in Japan without accountant jargon overload

## Purchasing

- founder or authorized branch manager can add supplier, create purchase, attach invoice, and mark paid
- purchases appear in monthly expense totals
- food purchases can optionally affect stock levels

## Language and Usability

- owner can use Vietnamese UI while branch operations remain Japan-configured
- employee can select Japanese, Vietnamese, or English UI independently
- core daily actions can be completed comfortably on phone
- home dashboard answers "what needs attention now?" within a few seconds

## Route Separation

- founder or co-founder uses a dedicated root-domain route
- branch manager uses a branch-scoped operational route
- founder-only setup does not remain mixed into the branch route
- branch manager does not own restaurant basic information or organization settings
- branch route keeps only high-frequency operational features

## AI-Agent Maintainability

- core domains have clear module boundaries
- access logic is centralized
- money logic is centralized
- scheduled jobs are documented and typed
- critical business invariants are test-covered
- future AI agents can add features without guessing hidden business rules

---

## Priority Order

If implementation starts immediately, the order should be:

1. Stabilize reporting, low-stock, bookings, and job SQL.
2. Build the shared database, auth, service, type, and component foundation.
3. Build multi-shop and shared-founder foundation with the new founder route.
4. Execute founder features first on the new control route.
5. Refactor the branch route and remove founder-only surfaces from it.
6. Complete attendance and approval workflow.
7. Add monthly finance close and tax exports.
8. Add purchasing and expenses.
9. Add promotions and validated discount codes.

This order keeps the product coherent:

- multi-shop changes the platform shape
- shared foundation reduces duplicated logic before large UI changes
- shared-founder access changes the control model
- founder feature execution proves the new architecture before branch migration
- route separation changes where the product lives and who owns each surface
- attendance affects payroll and labor reporting
- finance outputs are needed early for owner trust
- purchases affect expenses and cashflow
- promotions affect revenue and discount reporting, but they are not as urgent as labor and cashflow for launch

---

## Recommended Milestone Breakdown

## Milestone 1

- fix current broken report and data paths
- fix booking approval route
- fix nightly usage snapshot logic

## Milestone 2

- build shared database, auth, service, type, and component foundation
- define the target code structure and refactor boundaries

## Milestone 3

- add organizations, shared founders, and root-domain founder route
- add branch switching and group overview dashboard

## Milestone 4

- execute founder features on the new control route
- move founder setup and control fully out of legacy branch screens

## Milestone 5

- refactor the branch route to keep only operational features
- move founder-only setup screens out of branch dashboard

## Milestone 6

- rebuild attendance with secure QR and approval inbox

## Milestone 7

- add month-end finance close and accountant export

## Milestone 8

- add suppliers, purchases, and expense capture

## Milestone 9

- add promotions and coupon redemption

---

## Launch Scope Recommendation

For the first Japan release to Vietnamese owners, the recommended launch scope is:

### Must have

- founder root-domain route
- multi-shop management
- shared founder and delegated access management
- branch switcher
- refactored branch route focused on operations
- employee scheduling
- secure attendance
- attendance approval
- daily branch operational dashboard
- monthly cashflow
- expenses and purchases
- accountant-ready monthly export
- multilingual owner and staff UI

### Nice to have

- promotions and coupons
- deeper analytics
- advanced forecasting
- richer homepage controls

### Avoid in first release

- heavy enterprise accounting language
- too many dashboard charts
- full payroll engine
- country-agnostic compliance framework before Japan is stable
- decentralized permission logic that future AI agents cannot reason about
- founder setup screens buried inside branch manager workflows
- branch manager ownership of restaurant identity and business configuration

---

## Final Recommendation

Do not start with UI-only changes.

The correct first move is to stabilize the owner data layer and redesign the owner domain model around:

- organization -> restaurant
- founder route -> branch route
- organization members -> scoped permissions
- attendance events -> approved payroll hours
- orders + promotions + expenses -> monthly financial snapshots

Once those foundations exist, the owner dashboard can stay simple while supporting the real business workflows requested here.

For this launch, success should be measured by whether a Vietnamese owner in Japan can do these five things smoothly from the system:

1. know which shop needs attention
2. know who worked and approve hours
3. know today and month-to-date cashflow
4. record what the business bought
5. hand a clean monthly export to an accountant

And the technical success condition should be:

- future AI agents can safely extend the system because permissions, money logic, jobs, and domain rules are explicit and centralized

If the product does those five things well, it will already be very valuable in the Japan launch market.
