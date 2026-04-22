# Supabase Foundation

`supabase/` is the only canonical database and edge-function home for this repository.

## What Lives Here

- `supabase/bootstrap.sql`
  - the ordered bootstrap entrypoint for a blank or reset Supabase project
- `supabase/sql/*`
  - self-contained SQL grouped by domain and layer instead of one large monolith
- `supabase/migrations/*`
  - forward-only rollout SQL for live environments when a baseline change must be applied in place
- `supabase/functions/*`
  - deployable Edge Functions for scheduled platform jobs
- `supabase/config.toml`
  - Supabase CLI function config

## Why This Exists

The old database history was spread across top-level SQL files and incremental migrations.
That made resets hard, left the true starting point ambiguous, and forced future work to
reconstruct the final state by reading a long history.

This directory is the new single source of truth:

- organization-first founder control above branch operations
- `restaurants` remain the branch operating unit
- branch-resolved menus stay first-class even with shared-menu inheritance
- permissions, attendance, finance, billing, reporting, and support stay explicit and auditable

## Apply Order

Run the bootstrap from the repository root:

```bash
./infra/scripts/apply_supabase_baseline.sh
```

That script executes `supabase/bootstrap.sql`, which applies:

1. extensions
2. domain tables and descriptive comments in dependency order
3. helper functions and RPCs
4. domain-local keys and indexes
5. cross-domain foreign-key relations
6. security policies after helper functions exist
7. triggers after trigger functions exist
8. function execute grants
9. storage bootstrap

## Live Rollout Contract

Use the baseline only for:

- blank local resets
- blank staging or production project validation
- canonical truth capture in `supabase/sql/*`

Use the migration path for:

- any shared staging environment
- any production environment
- any environment that already has a `supabase_migrations.schema_migrations` history

Run forward-only rollout SQL from the repository root with:

```bash
./infra/scripts/apply_supabase_migrations.sh
```

That script applies `supabase/migrations/*` with the Supabase CLI and is the release path used by GitHub Actions.

Do not point `supabase/bootstrap.sql` at a running environment that must be upgraded in place.

## Domain Layout

The SQL tree is organized for future human and AI maintenance:

- `00_foundation`
  - shared bootstrap primitives such as extensions
- `10_branch_core`
  - branch-level operating tables, base policies, and core business functions
- `20_ordering_customer`
  - customer ordering, public entry, promotions, and branch menu inheritance
- `30_founder_control`
  - organization, invites, founder onboarding, and shared menu workspace
- `40_people_attendance`
  - attendance, payroll-rate support, and employee lifecycle
- `50_finance_billing`
  - subscriptions, purchasing, finance snapshots, billing, and org expenses
- `60_platform_admin_support`
  - platform admin, support, trial emails, dashboard, and SLA support workflows
- `70_storage`
  - storage helpers and storage RLS bootstrap

Use `supabase/migrations/*` only when a live project must be upgraded in place.

Within each domain, files are split by execution layer:

- `schema.sql`
  - table and sequence definitions plus table and column comments
- `keys.sql`
  - primary keys, unique constraints, defaults, and indexes
- `relations.sql`
  - foreign-key relations after every referenced table key exists
- `functions.sql`
  - RPCs, helper functions, and trigger functions
- `policies.sql`
  - RLS enablement and policies after helper functions exist
- `grants.sql`
  - explicit execute permissions for RPCs and helper functions that are intentionally callable
- `triggers.sql`
  - trigger wiring after trigger functions exist

## Flattening Notes

- The SQL in `supabase/sql/*` is fully canonical and no longer depends on deleted legacy migration files.
- Runtime surfaces the app already depends on, such as `attendance_records`, `create_order(...)`,
  and the usage snapshot functions, now live in their real product domains instead of a compatibility layer.
- Internal Edge Functions support an optional `INTERNAL_FUNCTION_SECRET` for production-safe scheduler access when `verify_jwt = false`.
- The abandoned prototype SaaS schema was intentionally not carried forward because it conflicts
  with the later active billing, subscriptions, support, and organization foundation the app uses now.
