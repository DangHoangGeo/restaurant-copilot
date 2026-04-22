# Supabase Release Pipeline

## Goal

Keep Supabase releases safe enough that future teams and AI agents can ship schema changes without guessing which SQL belongs to a blank bootstrap and which SQL belongs to a live rollout.

## Environment Model

- local feature work
  - disposable local Supabase stack
  - validate both canonical bootstrap and migration replay
- `staging` branch
  - deploys to the staging Supabase project
  - used to verify migrations against a shared environment before production
- `main` branch
  - deploys to the production Supabase project
  - should only receive schema changes that already passed local validation and staging rollout

## Canonical Rule

- `supabase/bootstrap.sql`
  - blank-project truth
  - used for resets, local validation, and canonical review
- `supabase/migrations/*`
  - live rollout history
  - used for staging and production deployment

Do not deploy `supabase/bootstrap.sql` directly to a long-lived staging or production database.

## GitHub Actions Contract

Every database PR or merge that targets `staging` or `main` must prove four things:

1. web tests still pass
2. the canonical bootstrap still succeeds on a blank local Supabase stack
3. the forward-only migration path still succeeds on a blank local Supabase stack
4. the app can still execute a minimal public end-to-end smoke flow against that migrated stack

The smoke flow should stay intentionally small and stable:

- public restaurant homepage data
- public branch menu resolution
- customer session creation

Do not turn the infra pipeline into a large UI regression suite.

## Deployment Contract

Pushes to long-lived release branches should deploy automatically:

- push to `staging`
  - apply `supabase/migrations/*` to the staging database
  - deploy all Edge Functions to the staging project
- push to `main`
  - apply `supabase/migrations/*` to the production database
  - deploy all Edge Functions to the production project

Use GitHub environments named `staging` and `production` so approvals, protections, and secrets can differ without changing workflow code.

## Required GitHub Environment Secrets

Both `staging` and `production` environments should define:

- `SUPABASE_DB_URL`
  - direct Postgres connection string for `supabase db push`
- `SUPABASE_PROJECT_ID`
  - Supabase project ref used for Edge Function deploys
- `SUPABASE_ACCESS_TOKEN`
  - personal or machine access token used by the Supabase CLI

Only add more secrets when a deployment step truly needs them.

## Migration Rules For Future Work

When a schema or RLS behavior changes:

1. update the final state in `supabase/sql/*`
2. add one forward-only migration in `supabase/migrations/*`
3. keep the migration focused on one concern
4. never edit an already-applied migration in place
5. keep destructive cleanup for a later migration after compatibility has been proven

The current initial rollout file is:

- `supabase/migrations/20260422000000_initial_foundation.sql`

It was rendered from the canonical baseline with:

- `infra/scripts/render_initial_supabase_migration.py`

Treat it as the first immutable release artifact once staging or production has applied it.

## Release Safety Rules

- never run ad-hoc dashboard SQL against staging or production without back-porting it into version control
- never merge a database change that only updates `supabase/migrations/*` but not `supabase/sql/*`
- never merge a database change that only updates the canonical baseline when a live environment must be upgraded in place
- never let Edge Function deploys run ahead of schema changes they depend on
- prefer staging verification before production release even when both deploy automatically

## End-To-End Test Rule

The CI smoke flow exists to verify the service contract, not every page.

Keep it:

- seed-driven
- local-stack only
- public-path first
- deterministic
- fast enough to run on every PR to release branches

If the smoke test becomes slow or flaky, simplify it instead of deleting it.
