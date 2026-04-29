# Foundation Docs

This folder is the active foundation contract for the product.

These docs are intentionally shorter and stricter than the archived planning material. They exist so human engineers and AI agents can start from the real architecture instead of guessing across legacy and transitional code.

## Current Focus

The current production foundation focus is:

- founder control
- branch flow
- organization and branch setup
- people and permissions
- money and reporting
- AI-assisted owner operations

Customer ordering remains a protected stable surface and is not the current redesign target.

## Reading Order

Read these in order before implementation:

1. `00_owner_business_operations_plan.md`
   Product outcome and operating model.
2. `01_organization_branch_menu_foundation.md`
   Canonical architecture and data boundaries.
3. `02_ai_agent_execution_plan.md`
   Implementation contract for agents.

Read these when relevant:

- `03_founder_control_route_map.md`
  Current route ownership, redirects, and legacy aliases.
- `05_control_branch_production_readiness.md`
  Current readiness review, blockers, and execution order.
- `04_expo_mobile_execution_plan.md`
  Supporting mobile plan only for mobile or printer work.
- `06_supabase_foundation_guidelines.md`
  Required when the task touches schema, RLS, RPCs, Edge Functions, or rollout migrations.
- `07_supabase_foundation_review_20260422.md`
  Current database foundation audit and residual watchlist.
- `08_supabase_release_pipeline.md`
  Required when the task touches Supabase CI/CD, rollout migrations, or staging/production release flow.
- `09_feature_production_review_20260422.md`
  Current actor-by-actor production readiness review for owner, platform admin, staff, and public customer flows.
- `10_review_execution_20260422.md`
  Current implementation status for the production hardening work executed from the April 22 review.
- `11_role_branch_access_scenarios_20260427.md`
  Required when the task touches organization roles, branch access, member
  scopes, employees, invites, permission defaults, or legacy role hardening.
- `12_security_and_scale_plan_10k.md`
  Security hardening plan and infrastructure roadmap to serve 10,000 restaurants.
  Required when touching RLS policies, caching, partitioning, async jobs, or load testing.

## Working Rules

- Keep customer ordering stable.
- Keep branch scope explicit.
- Treat `restaurant` as the branch unit.
- Keep organization above branch.
- Prefer org-aware APIs and services over legacy shortcuts.
- Treat production readiness as part of the foundation, not a future cleanup.

## Archive

Older long-form docs and plans were moved to:

- `../backup/20260413_legacy_docs/`
