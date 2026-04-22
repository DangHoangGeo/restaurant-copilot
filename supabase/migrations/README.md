# Forward-Only Migrations

`supabase/migrations/` is reserved for rollout SQL against already-running environments.

Use this folder only when a live database must be upgraded in place.

The initial production foundation is captured in:

- `20260422000000_initial_foundation.sql`

That file exists so brand-new staging and production projects can be initialized through the same
forward-only pipeline that later changes will use.

It was rendered from the canonical baseline with:

- `infra/scripts/render_initial_supabase_migration.py`

After the first persistent environment has applied a migration, do not rewrite or replace that
history file. Add a new migration instead.

## Rules

- keep `supabase/sql/*` as the canonical final state
- add a migration here only when a live environment needs a forward-only change
- update the canonical baseline in the same PR
- use timestamp-style names such as `202604221230_add_tax_profile_table.sql`
- keep each migration focused on one concern
- document any required backfill, dual-write, or cleanup follow-up in comments

## Order Of Work

1. design the final state in `supabase/sql/*`
2. add the forward-only rollout SQL here
3. verify the migration path for live environments
4. verify a blank bootstrap still succeeds from `supabase/bootstrap.sql`

If you cannot explain both the final state and the rollout path, the database change is not ready.
