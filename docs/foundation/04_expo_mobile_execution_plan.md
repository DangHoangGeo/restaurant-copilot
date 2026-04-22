# Expo Mobile Execution Plan

## Status

Supporting document. Not the current critical path for founder control and branch-flow hardening.

## Purpose

This file exists only for mobile execution tasks.

The current priority of the repository is:

- founder control
- branch flow
- production hardening of web control and branch operations

Mobile work should not disrupt those priorities.

## Mobile Product Contract

### Web remains primary for

- founder control
- organization setup
- branch setup
- cross-branch reporting and finance
- complex administrative workflows

### Mobile remains important for

- in-service branch execution
- order handling
- checkout
- kitchen and receipt printing
- fast operator actions on the floor

## Current Mobile Interpretation

- `mobile/SOder/` remains the active native mobile app in this repo.
- Any future Expo app should be incremental and should not block current operations.
- Printing remains a first-class requirement, not a future enhancement.
- Native mobile sessions must keep an explicit active branch context. Multi-branch access can exist through the organization layer, but every in-service mobile request still has to resolve to one selected branch at a time.

## Rules For Mobile Work

1. Do not move founder-control ownership into mobile by default.
2. Keep branch context explicit.
3. Do not fork business rules across web and mobile when shared server logic should own them.
4. Treat printing as a release-blocking requirement for service workflows that depend on it.
5. Do not expand mobile scope casually while control and branch web hardening is incomplete.

## Default Recommendation

Unless the task is explicitly mobile or printer-focused:

- keep work in web
- keep this document as background only

When the task is mobile-focused, start by confirming:

- whether it belongs in the current Swift app
- whether it belongs in a future Expo app
- what server contracts already exist and should be reused
