# Expo Mobile Execution Plan

**Status**: Working artifact  
**Date**: April 18, 2026  
**Purpose**: define how AI agents should build a new Expo-based branch operations app for iOS and Android without slowing down the main web platform or breaking current restaurant operations.

## Foundation Confirmations

- The customer ordering flow stays stable and branch-scoped.
- The existing `restaurant` remains the branch-level operating unit.
- Multi-branch support continues through the organization layer above branches.
- Founder and organization control remain web-first.
- Branch operations remain mobile-first and explicit in branch context.
- Permissions, attendance, finance, and reporting remain explicit and auditable.
- Printing remains an app responsibility, not a website-only assumption.

## Why This Plan Exists

The current iOS app proves that restaurant staff workflows and in-store printing need a native-capable app surface. However, maintaining a Swift-only app makes cross-platform delivery slower than desired.

The new direction is:

- keep the web app as the main founder and management product surface
- build a new Expo app for focused in-service operations on both iOS and Android
- keep printing as a native-capable mobile feature
- migrate intentionally instead of rewriting everything at once

This is not a plan to turn the website into the only app.  
This is also not a plan to delete the current iOS app immediately.

## Product Positioning

### Web app remains primary for

- founder control
- organization setup
- branch setup and branch switching
- cross-branch finance and reporting
- configuration-heavy workflows
- menu item management
- working hours and attendance workflows
- expenses and other branch back-office workflows
- basic setup and settings workflows used by managers and employees
- public customer ordering and restaurant web presence

### Expo app becomes primary for

- branch staff login
- order management during service
- kitchen and receipt printing
- checkout flow
- table-side order execution
- low-friction in-service actions from a phone
- realtime operational loops around live orders later

### Existing Swift app remains temporarily responsible for

- current mobile operations continuity
- current printer workflow continuity
- fallback operational support until Expo reaches parity for critical flows

## Strategic Decision

The recommended path is **incremental replacement**, not a hard cutover.

That means:

1. Create a new Expo app inside this repository.
2. Reuse existing backend contracts and business rules where possible.
3. Build the focused mobile in-service flows in phases.
4. Keep the current Swift app available until the Expo app has proven printer and order-execution parity.
5. Retire the Swift app only after the branch-critical workflows are verified in production-like conditions.

## Repository Placement

Recommended new app location:

- `mobile/expo-operations/`

Why this path is preferred:

- it keeps the new app clearly separate from the legacy Swift app in `mobile/SOder/`
- it avoids mixing React Native, Expo, and Swift build concerns in the same directory
- it keeps mobile work grouped under `mobile/` while preserving the web app as a separate product surface
- it gives future agents a clean boundary for cross-platform work

Recommended high-level shape:

```text
mobile/
├── SOder/                  # legacy Swift app kept during migration
└── expo-operations/        # new Expo app for iOS + Android branch operations
    ├── app/ or src/
    ├── modules/
    ├── assets/
    ├── features/
    ├── services/
    ├── shared/
    └── tests/
```

## Non-Negotiable Architecture Rules

### 1. Web stays source of truth for founder and back-office workflows

Do not move founder-control ownership into the Expo app just because mobile can render it.

The Expo app is for in-service order execution first, not for reproducing the entire web admin.

### 2. Expo app must stay branch-scoped by design

Every authenticated branch operations screen must know which branch is active.

Do not hide branch context deep inside ad hoc local state.

### 3. Business rules should not fork by client

Avoid duplicating pricing, permission, attendance, or finance rules in disconnected web and mobile codepaths when those rules can live in shared server contracts or explicit backend APIs.

### 4. Printing is a first-class requirement

Do not treat printing as a nice-to-have or a post-launch accessory.  
If a feature depends on printing in real restaurant operations, its mobile implementation is incomplete until the printer path is defined and tested.

### 5. Expo scope stays intentionally narrow

Do not let the Expo app quietly expand into every branch workflow.

The first job of the Expo app is:

- ordering management
- printing
- checkout

Menu management, attendance, expenses, and basic branch setup stay web-first unless a later decision explicitly changes that.

### 6. Legacy Swift app is a temporary compatibility layer

Do not invest in major new product expansion in `mobile/SOder/` unless the work is needed to stabilize current operations before Expo parity is ready.

## What Must Stay Stable During This Program

- customer QR ordering
- customer session and table flow
- existing web founder flows
- branch menu and order data contracts
- current iOS operational continuity
- current printing availability for active restaurants

## Current Reality to Preserve

The existing iOS app already contains meaningful operational knowledge:

- printer discovery and connection logic
- receipt and kitchen print formatting
- order and checkout print triggers
- print settings and dual-printer support
- auto-print logic and tests

Future agents should treat the current Swift app as a source of implementation knowledge, not as throwaway code with no migration value.

## Recommended Mobile Scope

The Expo app is a focused operations companion app, not a full replacement for all branch tooling.

### Phase 1 target scope

- authentication
- branch picker
- active order list
- order detail
- order status updates
- checkout receipt printing
- kitchen printing for new orders
- printer setup and test print

### Explicitly out of initial Expo scope unless needed earlier

- founder control screens
- broad settings surfaces
- advanced finance workflows
- low-priority parity for every legacy screen
- customer ordering web replacement
- menu item management
- working hours and attendance management
- expenses and purchasing workflows
- basic branch setup and administrative settings

## Manager And Employee Product Split

The intended product split is hybrid:

- web app for back-office and setup-heavy branch work
- Expo app for fast in-service branch execution

That means a manager or employee may use both surfaces depending on the task.

Examples that stay web-first:

- editing menu items
- configuring branch basics
- reviewing or managing working hours
- entering or reviewing expenses

Examples that should be app-first:

- seeing new live orders
- updating order state during service
- printing kitchen tickets
- printing receipts
- handling checkout quickly from the floor or counter

## Printing Strategy

## Decision

Use Expo for the app shell and shared UI/business flow, but use native modules for printer capabilities that are not fully covered by standard Expo packages.

### Important implication

Expo is not a no-native-code strategy for this product.  
It is a lower-friction cross-platform app strategy with a smaller, more deliberate native surface.

### Printing approach

#### Supported approach

- Expo app for UI, state, navigation, authentication, realtime screens, and order workflows
- local Expo modules in `mobile/expo-operations/modules/` for printer capabilities
- Swift implementation for iOS printer bridging
- Kotlin implementation for Android printer bridging

#### Not sufficient as the only approach

- relying only on website printing
- relying only on PDF/AirPrint assumptions
- assuming one generic printer library will cover all current operational needs without validation

### Printer module boundaries

The printer integration should be isolated behind a dedicated module boundary, for example:

- `PrinterModule`
- `PrinterDiscoveryModule`
- `PrintFormattingModule` only if formatting truly must be native

Responsibilities:

- discover supported printers
- connect and disconnect
- persist selected printers
- send kitchen print jobs
- send receipt print jobs
- report printer errors with operator-friendly status
- expose print test and health-check functions

### Printer output rule

Keep receipt and kitchen print payloads explicit and testable.

Do not bury restaurant-specific print behavior inside random screen components.

## Shared Contract Strategy

The Expo app should reuse backend contracts, not invent mobile-only behavior.

Preferred shared contract categories:

- auth session shape
- branch identity and branch picker data
- order list and order detail data
- order status update requests
- table list and table metadata
- printer-friendly receipt and kitchen payload structures when server-generated payloads are introduced

Potential homes:

- `web/shared/` for cross-client schemas when the repo already uses this pattern
- a future repo-level shared package if web and Expo need direct shared TypeScript contracts

Rule:

Do not create multiple slightly different order or branch shapes in web and mobile unless there is a clear boundary reason.

## API Strategy

### Short-term

The Expo app may consume existing Supabase-backed flows and existing APIs where they are already stable and safe for in-service branch operations.

### Medium-term

Where mobile workflows need cleaner boundaries, add explicit service APIs rather than teaching the app to reproduce backend business rules client-side.

Preferred mobile-safe API ownership:

- branch-scoped order queries
- branch-scoped order mutations
- printer-target payload generation if server-owned formatting becomes necessary
- permission-checked branch operational actions

Avoid:

- broad admin endpoints designed for desktop founder workflows
- mobile screens calling deeply mixed legacy endpoints with founder and branch concerns combined

## Authentication and Branch Context Rules

- authenticate once, resolve organization membership and branch visibility explicitly
- if a user has multiple branches, show a clear mobile-first branch picker
- selected branch must be durable and easy to switch
- branch context must be explicit in data access and mutations
- future agents must not assume one user equals one branch forever

## Realtime and Offline Direction

### Realtime

Expo app should support branch operational realtime behavior for:

- new orders
- order status changes
- kitchen workflow updates
- urgent operational refresh

### Offline

Offline support is desirable, but it should not be the first migration blocker.

Initial requirement:

- handle temporary network issues gracefully
- show clear operator feedback
- keep printer failures and network failures distinct

Later requirement:

- selective offline-friendly queueing for print and order actions if operationally necessary

## Delivery Phases

## Phase 0: Planning and workspace setup

### Goal

Create the new Expo workspace and define boundaries before feature migration begins.

### Required outputs

- Expo app scaffold in `mobile/expo-operations/`
- initial app configuration
- environment variable strategy
- navigation shell
- auth bootstrap
- branch context provider
- doc updates for setup and local run commands

### Done when

- the app boots on iOS and Android development builds
- branch-aware auth shell exists
- no printer work is faked into random screen code

## Phase 1: Branch auth and order execution shell

### Goal

Get operators into the right branch and let them see and act on live orders.

### Required outputs

- login screen
- branch picker
- orders list
- order detail
- status update actions
- loading, empty, and error states designed for phone use

### Done when

- branch staff can sign in, pick a branch, and complete basic order actions
- branch context is stable across relaunch

## Phase 2: Printer foundation

### Goal

Establish reliable printer setup and test printing before deeper migration.

### Required outputs

- printer settings screen
- printer discovery and selection
- save printer assignments
- test print
- visible connection and failure states
- initial iOS and Android native module bridge

### Done when

- both platforms can complete a real test print on supported printers
- printer failures are actionable for operators

## Phase 3: Kitchen and receipt production parity

### Goal

Reach operational parity for the most important in-store print flows.

### Required outputs

- kitchen print on new orders
- checkout receipt print
- reprint actions
- configurable target printer behavior
- print logs or recent print history

### Done when

- a branch can operate core print workflows in Expo during realistic service testing

## Phase 4: Controlled rollout

### Goal

Run the Expo app with selected internal branches while the Swift app remains available.

### Required outputs

- rollout checklist
- branch enablement guide
- support notes for printer onboarding
- fallback path to legacy iOS app where required

### Done when

- at least one real branch can use the Expo app for order management, printing, and checkout without blocking service

## Phase 5: Swift app retirement decision

### Goal

Decide whether the legacy app can be retired safely.

### Retirement gates

- iOS Expo parity for order management, printing, and checkout
- Android Expo parity for order management, printing, and checkout
- printer success rate acceptable in field use
- no active branch depends on a Swift-only feature
- support and onboarding burden lower than maintaining both apps

## AI Agent Rules For This Program

### Before any Expo implementation task, the agent must confirm

1. foundation docs were read
2. this Expo execution plan was read
3. web remains the primary founder/control surface
4. the task is in-service operations-scoped or infrastructure-scoped
5. the task does not break current iOS operations continuity

### Every Expo task brief must include

- product goal
- target branch workflow
- branch context implications
- API and schema implications
- printing implications
- rollback path
- verification plan on iOS and Android

### If a task touches printing, the brief must also include

- printer type assumptions
- target platforms
- fallback behavior on connection failure
- whether the logic belongs in JS or in a native module

## File Placement Rules For Future Agents

### Expo app code

- screens, routes, and app entry in `mobile/expo-operations/app/` or `mobile/expo-operations/src/app/`
- feature modules in `mobile/expo-operations/features/`
- shared UI components in `mobile/expo-operations/components/`
- services and client integrations in `mobile/expo-operations/services/`
- shared schemas and types in `mobile/expo-operations/shared/` unless repo-level sharing is introduced
- local native modules in `mobile/expo-operations/modules/`

### Legacy Swift app

- only touch `mobile/SOder/` for bug fixes, migration reference work, or temporary continuity fixes
- do not build major new branch features there unless explicitly requested

### Web app

- keep founder, organization, and back-office branch work in `web/`
- do not quietly move admin-heavy branch product scope into Expo because it feels convenient

## Testing and Verification Expectations

Every meaningful Expo milestone should include:

- iOS development build verification
- Android development build verification
- branch auth verification
- branch switching verification where relevant
- realtime or refresh behavior verification where relevant
- printer verification when printing is touched

Printing changes should also include:

- test print result on real hardware if available
- failure-path verification
- payload verification for kitchen and receipt output

## Rollout and Recovery Rules

- do not force all branches onto Expo at once
- preserve the Swift app as fallback during rollout
- document printer onboarding steps for branch operators
- treat printer failure as a service-risk event, not a cosmetic bug
- if a branch cannot print reliably in Expo, keep that branch on the fallback path until fixed

## Definition of Done For The Overall Program

The Expo mobile transition is only complete when:

- order management, printing, and checkout can run on both iOS and Android
- printing is reliable enough for real restaurant service
- founder and back-office workflows remain strong on the web
- branch context is explicit and safe
- the codebase is easier to extend than the current split future would be
- the legacy Swift app can be retired without operational regression

## Recommended Prompt Shape For Future AI Agents

Use this instruction near the top of any Expo implementation prompt:

`Before making changes, read docs/foundation/README.md, docs/foundation/00_owner_business_operations_plan.md, docs/foundation/01_organization_branch_menu_foundation.md, docs/foundation/02_ai_agent_execution_plan.md, and docs/foundation/04_expo_mobile_execution_plan.md. Start by summarizing the foundation constraints and explain how your task fits them. Confirm whether the task belongs in web, Expo mobile, native printer modules, or the legacy Swift app. Do not implement anything until that summary is written.`
