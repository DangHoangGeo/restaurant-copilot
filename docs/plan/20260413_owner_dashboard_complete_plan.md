# Owner Dashboard Complete Plan

**Status**: Proposed
**Date**: April 13, 2026
**Reviewed Against**: `9f02ecc`

## Executive Summary

This document is the complete review and implementation plan for the restaurant owner dashboard, owner-facing data flow, and scheduled jobs.

The current product already has a usable single-restaurant dashboard for menu, orders, tables, employees, bookings, reports, homepage, and settings. However, the owner product requested here is not complete yet. The biggest gaps are:

1. Multi-shop ownership is not supported.
2. Promotions and discount codes are not implemented as a real owner feature.
3. Attendance and scheduling exist in basic form, but the QR approval workflow is not secure or complete enough for payroll-grade use.
4. Reports are not yet reliable enough for monthly cashflow review or tax submission.
5. Purchase and expense management are effectively missing from the owner dashboard.
6. Some existing owner report and inventory paths are out of sync with the current database schema.

The plan below keeps the product simple, mobile-first, and owner-friendly. The main product shape should be:

- `Shops`
- `People`
- `Money`
- `Settings`

That structure is easier for restaurant owners than a large admin-style dashboard with too many unrelated sections.

---

## Product Goals

The owner experience should support:

1. Full restaurant management for owners who operate multiple shops.
2. Employee scheduling and daily working hours with QR-based check-in/check-out and approval.
3. Dynamic monthly cashflow reports that are clean enough to hand to an accountant or use for tax preparation.
4. Purchase management for equipment, supplier invoices, and daily food procurement.

Product principles:

- Mobile-first before desktop polish.
- Fewer screens, fewer taps.
- Use operational language, not technical language.
- Avoid deep menu trees.
- Prefer guided defaults over configuration overload.

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

## Key Findings From Code Review

### 1. Multi-shop ownership is blocked by the current tenancy model

The current model assumes one user belongs to one `restaurant_id`. Signup creates exactly one restaurant, and login resolves to exactly one restaurant dashboard.

Impact:

- An owner cannot manage multiple branches under one account.
- Cross-shop reporting and centralized settings are impossible.
- Promotions, purchases, and finance cannot be managed at group level.

### 2. Attendance exists, but the QR flow is not owner-grade

The current attendance scan flow treats `qrToken` as the `employee_id` and only allows the logged-in employee to scan for themself.

Impact:

- No secure QR credential.
- No kiosk mode.
- No manager-assisted scan flow.
- No clear separation between raw attendance events and approved payroll hours.

### 3. Report and inventory logic are inconsistent with the schema

Some owner report APIs still query columns that do not exist in the current schema shape, or use placeholder logic for low-stock calculations.

Impact:

- Some dashboard widgets may silently fail or drift from reality.
- Monthly finance reports cannot be trusted until the reporting layer is corrected.

### 4. Scheduled job foundation exists, but owner finance jobs are not reliable yet

There is already a scheduled usage snapshot edge function, but the SQL behind it still references older table/column patterns.

Impact:

- Daily and monthly rollups are not dependable.
- Staff hours and revenue snapshots cannot be used as the base for accounting reports.

### 5. Promotions and discount codes are still only planned, not delivered

The codebase contains discount inputs in iOS checkout and planning docs for promotions/coupons, but no live owner-facing promotions module.

Impact:

- Owners cannot create reusable offers.
- Discount codes are free text, not validated business objects.
- No reporting by promotion effectiveness.

### 6. Purchase management is effectively absent from the owner product

There are expense tables in production SQL, but they are not wired into the owner dashboard and do not model tenant ownership correctly for this use case.

Impact:

- No supplier management.
- No purchase orders.
- No invoice attachment flow.
- No expense-to-cashflow linkage.

---

## Unfinished Feature Inventory

## A. Multi-Shop Owner Management

### Current status
- Not implemented.

### Missing pieces
- Owner organization/group entity.
- Branch membership model.
- Branch switcher in UI.
- Group-level summary dashboard.
- Shared vs branch-local settings.
- Consolidated reports across shops.

## B. Promotions and Discount Codes

### Current status
- Not implemented as a full owner feature.
- iOS checkout has manual discount input only.

### Missing pieces
- Promotions table.
- Coupons table.
- Redemption tracking.
- Validation API.
- Owner UI for CRUD.
- Promotion performance reports.
- Branch-scoped or group-scoped campaigns.

## C. Employee Scheduling and Working Hours

### Current status
- Basic employee list, schedule, attendance, and verification UI exists.

### Missing pieces
- Secure employee QR credential lifecycle.
- Re-issue/disable QR credentials.
- Shared kiosk scanning mode.
- Manager override flow.
- Late/early/overtime calculations.
- Payroll summary by day/week/month.
- Approval queue and audit log.
- Employee self-service view for schedule and attendance.

## D. Monthly Cashflow and Tax Reporting

### Current status
- Reports UI exists with charts and exports.
- Not accounting-grade.

### Missing pieces
- Monthly close pipeline.
- Revenue/discount/tax/refund separation.
- Expense integration.
- Shop-by-shop and consolidated P&L-like summaries.
- Tax-ready export package.
- Accountant handoff format.
- Finalized monthly snapshot job.

## E. Purchase Management

### Current status
- No owner dashboard workflow.

### Missing pieces
- Suppliers.
- Purchase records.
- Purchase orders.
- Receiving flow.
- Invoice and receipt attachments.
- Equipment purchase tracking.
- Food procurement tracking.
- Stock adjustment linkage.

---

## Target Product Structure

## 1. Shops

Purpose:

- Let an owner manage one or many branches.

Mobile-first screens:

- Shop switcher sheet.
- Shop list cards.
- Shop summary cards.
- Branch settings.

Primary actions:

- Add shop.
- Archive shop.
- Switch current shop.
- View group summary.

## 2. People

Purpose:

- Handle employees, schedules, attendance, and approvals.

Mobile-first screens:

- Employee list.
- Employee detail sheet.
- Weekly schedule board.
- Attendance inbox.
- Payroll summary view.

Primary actions:

- Add employee.
- Assign shifts.
- Scan check-in/out.
- Approve hours.
- Export monthly hours.

## 3. Money

Purpose:

- Handle promotions, reports, cashflow, purchases, and tax prep.

Mobile-first screens:

- Daily sales summary.
- Monthly cashflow view.
- Promotions list.
- Purchases list.
- Expense detail sheet.
- Monthly report export sheet.

Primary actions:

- Create promotion.
- Create supplier purchase.
- Mark invoice paid.
- Export monthly report.
- View tax summary.

## 4. Settings

Purpose:

- Keep restaurant profile, operating rules, taxes, payment methods, and printer/QR preferences simple.

Mobile-first screens:

- Basic info.
- Tax and currency.
- QR and attendance settings.
- Payment methods.
- Notification rules.

---

## Proposed Data Model Changes

## Phase A: Multi-Shop Foundation

Add:

- `owner_organizations`
- `organization_members`
- `organization_restaurants`

Recommended model:

- A user may belong to one or many organizations.
- An organization owns one or many restaurants.
- A restaurant still remains the tenant boundary for operational data.
- Organization-level access is used for switching, rollups, and shared controls.

Keep:

- `restaurant_id` on transactional tables for strict RLS isolation.

This avoids breaking the current tenant model while allowing group ownership.

## Phase B: Promotions

Add:

- `promotions`
- `promotion_scopes`
- `coupons`
- `coupon_redemptions`
- `order_discounts`

Core fields:

- discount type: percentage or fixed.
- active window.
- max uses.
- branch scope or organization scope.
- minimum spend.
- stackability rule.

## Phase C: Attendance and Payroll Approval

Add:

- `employee_qr_credentials`
- `attendance_events`
- `attendance_daily_summaries`
- `attendance_approvals`

Model split:

- `attendance_events`: raw scans.
- `attendance_daily_summaries`: system-calculated daily hours.
- `attendance_approvals`: owner/manager approved result for payroll.

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

- Sales data stays operational.
- Monthly financial snapshots are derived and frozen after close.

---

## Target Owner Data Flow

## 1. Multi-Shop Flow

1. Owner logs in.
2. System loads organization memberships.
3. Owner lands on either:
   - branch dashboard if they only have one shop, or
   - group overview if they manage multiple.
4. Branch switcher controls the active shop context.
5. All operational APIs remain scoped by `restaurant_id`.
6. Group-level dashboards read aggregated, read-only views across linked restaurants.

## 2. Employee Schedule and Attendance Flow

1. Owner creates employee.
2. System creates user membership and employee profile.
3. Owner assigns shifts by day.
4. System issues or rotates employee QR credential.
5. Employee scans at kiosk or self-scan flow.
6. System writes raw `attendance_events`.
7. Job or server-side function builds `attendance_daily_summaries`.
8. Owner/manager reviews daily exceptions.
9. Owner approves hours for payroll.
10. Monthly payroll export is generated.

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
5. System generates export package for accounting/tax use.

## 5. Purchasing Flow

1. Owner creates supplier.
2. Owner records a purchase or raises a PO.
3. Goods are received.
4. Stock is updated where relevant.
5. Receipt/invoice is attached.
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

### 5. Purchase Reminder Job

Runs daily.

Outputs:

- recurring supplier reminders
- unpaid invoice reminders
- receiving reminders for open purchase orders

## Important Fix Before Adding More Jobs

The current usage snapshot/reporting SQL must be corrected to the actual schema before any finance automation is trusted.

---

## UX Design Plan

## General UI Rules

- Mobile-first layout.
- One primary action per screen.
- Lists as cards on mobile.
- Use sheets/drawers instead of desktop-heavy modals.
- Default to current branch context with easy switching.

## Home Dashboard

Replace the current broad dashboard with a simpler owner dashboard:

- today sales
- pending approvals
- low stock
- unpaid purchases
- month-to-date cashflow

Quick actions:

- add employee
- create promotion
- record purchase
- export month report

## Shops UX

- Branch cards with health summary:
  - today sales
  - active orders
  - staff on shift
  - alerts

## People UX

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

## Money UX

Tabs:

- Cashflow
- Promotions
- Purchases
- Taxes

Each tab must answer:

- what changed today
- what needs attention
- what the owner should do next

---

## Implementation Roadmap

## Phase 0: Stabilization and Schema Alignment

**Goal**: Fix the current owner data layer before adding major features.

### Tasks

1. Correct report APIs that query outdated columns.
2. Correct low-stock APIs to use `inventory_items`.
3. Fix booking status update route.
4. Fix scheduled snapshot SQL and edge function assumptions.
5. Add regression tests for owner reports, bookings, and attendance.

### Deliverables

- owner dashboard metrics return valid data
- reports page loads reliably
- nightly snapshot works with current schema
- bookings can be confirmed/canceled successfully

## Phase 1: Multi-Shop Foundation

**Goal**: Let one owner manage multiple shops without breaking tenant isolation.

### Tasks

1. Add organization/group data model.
2. Add organization membership logic.
3. Add branch switcher UI.
4. Add group overview dashboard.
5. Update auth/login redirect behavior for multi-shop owners.

### Deliverables

- one owner account can manage multiple branches
- branch context switching works on mobile and desktop
- group-level summary is available

## Phase 2: People Operations

**Goal**: Turn employees/schedules/attendance into a complete owner workflow.

### Tasks

1. Replace current QR flow with secure QR credentials.
2. Add kiosk scan mode and manager-assisted scan flow.
3. Add attendance event model and daily summary model.
4. Add approval inbox.
5. Add payroll summary and monthly hours export.

### Deliverables

- employee can check in/out securely
- manager can review and approve hours
- monthly hours export is available

## Phase 3: Promotions and Discounts

**Goal**: Give owners a simple promotion system that actually affects checkout and reports.

### Tasks

1. Add promotion/coupon schema.
2. Add owner CRUD screens.
3. Add validation API.
4. Integrate with web and iOS checkout.
5. Add promotion usage reporting.

### Deliverables

- owner can create and manage promotions
- discount codes are validated by backend
- orders store real discount objects, not just text input

## Phase 4: Purchasing and Expenses

**Goal**: Add the missing purchase layer.

### Tasks

1. Add supplier model.
2. Add purchase record / PO flow.
3. Add invoice/receipt uploads.
4. Link purchases to expenses and stock updates.
5. Add purchase dashboard screens.

### Deliverables

- owner can record food purchases
- owner can record equipment purchases
- monthly expenses are visible in reports

## Phase 5: Finance and Tax Reporting

**Goal**: Produce clean monthly cashflow and tax-ready outputs.

### Tasks

1. Add daily finance snapshot model.
2. Add monthly financial snapshot model.
3. Separate gross sales, discounts, tax, refunds, and net sales.
4. Add branch and organization rollups.
5. Add CSV/PDF/accountant export package generated server-side.

### Deliverables

- owner can review month-to-date cashflow
- owner can export monthly tax/accounting package
- multi-shop owners can view consolidated totals

## Phase 6: Polish and Operations

**Goal**: Make the system easy to maintain and safe to operate.

### Tasks

1. Add audit trails for approvals, promotion changes, and purchasing.
2. Add alerts and notification rules.
3. Add empty states and mobile refinements.
4. Add onboarding for multi-shop owners.
5. Add operational dashboards for failed jobs and stuck approvals.

---

## Detailed Acceptance Criteria

## Multi-Shop

- Owner can create a second shop without creating a second login.
- Owner can switch shops in under two taps on mobile.
- All shop pages remain isolated by `restaurant_id`.
- Group overview shows branch summaries without exposing cross-tenant writes.

## Promotions

- Owner can create a fixed-amount or percentage promotion.
- Owner can generate or define coupon codes.
- Coupon validation happens on the backend.
- Promotion usage is visible in reports.

## Attendance

- Raw scan events are stored.
- Daily hours are system-calculated.
- Owner can approve or reject daily hours.
- Payroll export matches approved records only.

## Reporting

- Monthly report includes gross sales, discounts, tax, refunds, net sales, and expenses.
- Report can be exported as CSV and PDF.
- Monthly snapshot is frozen after close.

## Purchasing

- Owner can add supplier, create purchase, attach invoice, and mark paid.
- Purchases appear in monthly expense totals.
- Food purchases can optionally affect stock levels.

---

## Priority Order

If implementation starts immediately, the order should be:

1. Stabilize reporting, low-stock, bookings, and job SQL.
2. Build multi-shop foundation.
3. Complete attendance and approval workflow.
4. Add promotions and validated discount codes.
5. Add purchasing and expenses.
6. Add monthly finance close and tax exports.

This order keeps the product coherent:

- Multi-shop changes the platform shape.
- Attendance affects payroll and labor reporting.
- Promotions affect revenue and discount reporting.
- Purchases affect expenses and cashflow.

---

## Recommended Milestone Breakdown

## Milestone 1

- Fix current broken report/data paths.
- Fix booking approval route.
- Fix nightly usage snapshot logic.

## Milestone 2

- Add organizations and branch switching.
- Add group overview dashboard.

## Milestone 3

- Rebuild attendance with secure QR and approval inbox.

## Milestone 4

- Add promotions and coupon redemption.

## Milestone 5

- Add suppliers, purchases, and expense capture.

## Milestone 6

- Add monthly finance close and tax-ready exports.

---

## Final Recommendation

Do not start with UI-only changes.

The correct first move is to stabilize the owner data layer and redesign the owner domain model around:

- organization -> restaurant
- attendance events -> approved payroll hours
- orders + promotions + expenses -> monthly financial snapshots

Once those foundations exist, the owner dashboard can stay simple while supporting the real business workflows requested here.
