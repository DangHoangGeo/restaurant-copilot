# AI Agent Execution Plan

## Goal

Give future AI agents a safe execution contract for this repository.

The purpose of this file is not to restate product vision in abstract terms. It is to prevent implementation drift across control, branch, permissions, money, onboarding, and AI support work.

## Non-Negotiable Constraints

Every agent must preserve these truths:

1. Customer ordering stays stable.
2. `restaurant` is the branch-level operating unit.
3. Organization is added above branch, not instead of branch.
4. Branch menus stay branch-resolved first.
5. Founder work belongs in `control`.
6. Branch execution belongs in `branch`.
7. Permissions, attendance, finance, reporting, and billing remain explicit and auditable.

## Mandatory First Step

Before implementation:

1. read the required foundation docs
2. read the relevant local code
3. write a short working summary
4. state what must remain stable
5. state which files or modules are likely to change
6. only then start editing

If you cannot clearly produce that summary, you are not ready to implement.

## Required Start-of-Task Summary

Your summary must include:

- confirmation that the foundation docs were read
- confirmation that the local architecture was reviewed
- the key constraints in your own words
- the product goal of the task
- what behavior must remain stable
- likely files or modules to change
- target directories and why
- expected database impact
- expected API impact
- expected UI impact
- expected verification

## Route Selection Rules

### Use root-domain work for

- marketing
- auth
- pending approval
- platform admin

### Use founder `control` work for

- company setup
- branch setup
- branch comparison
- owner-level people and permissions
- cross-branch finance and reporting
- owner settings

### Use branch work for

- orders
- tables
- menu execution
- branch employee operations
- attendance workflows
- purchasing and expenses
- local reports

### Use platform work for

- organization approval
- verification
- subscription lifecycle
- platform operations and support

## API Selection Rules

Prefer in this order:

1. shared server domain services
2. org-aware route handlers under `api/v1/owner/organization/*`
3. existing branch-scoped endpoints only when they are still the active contract

If the task touches a legacy endpoint under `api/v1/restaurant/*` or a legacy owner endpoint:

- check whether an org-aware replacement already exists
- migrate if feasible
- if not feasible in this task, harden the legacy endpoint to current permission and branch rules
- document that decision in your delivery summary

## Legacy Handling Rule

Do not assume “working in the UI” means “safe for production”.

This repository contains mixed old and new code. Some founder flows still call legacy branch settings endpoints. Some branch flows still depend on effective `restaurant_id` from request context.

When you touch mixed code:

- preserve behavior
- tighten security
- reduce ambiguity
- avoid widening the legacy contract

## Execution Priority

When multiple implementation options exist, prefer this order:

1. harden unsafe boundaries
2. preserve stable customer and branch behavior
3. move founder work to the organization-aware control plane
4. reduce legacy coupling
5. then expand features

## Verification Minimums

For meaningful changes, verify at the right level:

- linting for changed web code
- targeted tests for new permission or branch-scope logic
- targeted tests for money or attendance logic
- manual path verification for control and branch routing when relevant

If you cannot run a relevant verification step, say so clearly.

## Documentation Rule

Update docs when you change:

- route ownership
- permission behavior
- org versus branch boundaries
- production-readiness status
- foundation assumptions

Do not leave future agents to infer structural changes from code alone.

## Delivery Format

For any substantial task, the delivery should include:

1. confirmation that the foundation docs were read
2. short restatement of the constraints
3. what changed
4. verification performed
5. rollout or migration notes if relevant
6. remaining risks or follow-ups

## Current Agent Guidance

For control and branch production work, also consult:

- `03_founder_control_route_map.md`
- `05_control_branch_production_readiness.md`

Those two files describe the actual mixed runtime state and the current hardening order.
