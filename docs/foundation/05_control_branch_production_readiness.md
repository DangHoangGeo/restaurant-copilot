# Control And Branch Production Readiness

## Purpose

This file is the current production-readiness review and execution order for the owner control plane and branch flow.

It is intentionally practical. It should tell future agents and engineers what is ready, what is mixed, what is unsafe, and what gets hardened next.

## Audit Summary

### Foundation that is already in place

- owner organization layer above branches
- founder `control` route shell and core pages
- branch-scoped route entry with explicit `branchId`
- active branch switching via validated httpOnly cookie
- platform approval flow for organizations
- service-role first platform admin bootstrap runbook and script
- subscription bootstrap during approval
- org member and pending invite foundations
- employee invite foundation
- organization shared-menu inheritance foundation
- branch finance close and org roll-up foundation
- attendance event and approval foundation
- AI-generated owner onboarding content foundation

### Mixed or transitional areas

- some founder control screens still call legacy branch settings APIs
- many branch-scoped owner APIs still depend on effective `restaurant_id` from request context
- root signup rate limiting still uses an in-memory implementation, not the shared production pattern
- customer AI assistant UI is still a placeholder and must not be treated as production AI support

## Risk Register

### P0

- Legacy branch settings endpoints were still part of active founder and branch setup flows.
  - Result: permission drift could create a production gap if legacy role mapping over-granted access.
  - Action in this pass: harden the active legacy settings route to the organization permission model when org context exists.

### P1

- Signup still uses process-local rate limiting.
  - Impact: not reliable across instances or serverless scale.
  - Next action: move signup protection onto the shared distributed rate-limiting path and verify behavior in production hosting.

- Control and branch flows still mix org-aware APIs and legacy branch-scoped APIs.
  - Impact: future agents can accidentally implement new work on the wrong contract.
  - Next action: prefer org-aware routes first and document every legacy dependency that remains.

- Cross-branch finance is only trustworthy from closed branch snapshots.
  - Impact: “live” totals can be useful operationally but must not be presented as finalized accounting output.
  - Next action: keep exports and month-close workflows explicit and tested.

### P2

- Current owner AI foundation is real for onboarding generation, but customer AI assistant UI is not.
  - Impact: product messaging can drift away from actual implementation.
  - Next action: keep production AI claims focused on owner onboarding and operator assistance that has real backend support.

## Capability Status

### Owner signup and subscription intent

- Status: usable with manual platform approval
- Current shape:
  - owner chooses plan and billing cycle at signup
  - organization and first branch are created
  - platform admin approves and boots subscription or trial
  - first platform admin is bootstrapped operationally with `infra/scripts/bootstrap_platform_admin.mjs`
- Remaining work:
  - distributed rate limiting
  - more explicit operational runbook for approval failures

### Founder control onboarding

- Status: usable, still partially dependent on legacy settings APIs
- Current shape:
  - approved founder lands in `control/onboarding`
  - first-branch setup loads the starter branch through an org-aware onboarding API and surfaces blocking errors in the UI
  - AI can generate multilingual branding and setup suggestions
- Remaining work:
  - continue migrating founder flows off legacy branch settings endpoints

### Branch switching and branch flow

- Status: usable
- Current shape:
  - branch switching is cookie-backed and server-validated
  - branch routes support explicit `branchId`
- Remaining work:
  - add more integration coverage around switching and redirected legacy routes

### People foundation

- Status: partial but meaningful
- Current shape:
  - org members and pending invites exist
  - employee invite flow exists
- Remaining work:
  - verify end-to-end role onboarding for founder finance, branch manager, and employee edge cases

### Menu foundation

- Status: partial foundation
- Current shape:
  - branch workspace exists
  - organization shared-menu inheritance exists
  - founder control exposes `control/menu` for the one-time company menu foundation before branches inherit it
- Remaining work:
  - more rollout and comparison tooling
  - more verification around branch overrides and inheritance auditability

### Money and reports

- Status: partial foundation
- Current shape:
  - branch finance close
  - org roll-up
  - expense and purchasing foundations
- Remaining work:
  - stronger test coverage for close, export, and accountant workflows

### AI support

- Status: partial foundation
- Production-safe today:
  - owner onboarding generation
  - operator-facing drafting and generation support
- Not production-safe to claim:
  - placeholder customer assistant chat

## Execution Order

1. Harden mixed legacy endpoints that still sit on active founder or branch setup paths.
2. Continue moving founder workflows to org-aware APIs.
3. Add test coverage for branch switching, owner onboarding, invite acceptance, and finance close.
4. Replace process-local signup protections with shared production protections.
5. Tighten product messaging so AI claims match real backend capabilities.

## What Was Executed In This Pass

- rewrote the repo guidance and foundation docs around the actual control and branch architecture
- clarified which surfaces are stable versus transitional
- documented the production-readiness gaps that matter for founders, branches, and future agents
- hardened the active legacy branch settings authorization path so it follows org permissions when org context exists

## Exit Criteria For “Owner Control Ready”

The control and branch foundation is ready for production owner traffic when:

1. owner signup, approval, onboarding, and control entry work reliably
2. founder control and branch operations are clearly separated
3. no active founder or branch setup path can bypass permission rules through legacy endpoints
4. branch switching is reliable and covered by verification
5. month-close and finance export behavior is explicit and tested
6. AI support claims match real, reviewable functionality
