# GitHub Actions Release Workflow

This repository now has a GitHub Actions workflow at `.github/workflows/release-and-migrate.yml`.

## What it does

- Runs Jest unit tests from `web`
- On direct pushes or merged pull requests into `develop` or `main`, applies only the new SQL files added under `infra/migrations`
- Records executed files in `public.github_action_migrations` so retries do not run the same SQL twice

## GitHub setup

Create two GitHub Environments in the repository settings:

1. `develop`
2. `main`

Add this secret to each environment:

- `SUPABASE_DB_URL`: the direct Postgres connection string for that branch's Supabase project

Recommended mapping:

- `develop` environment -> staging/development Supabase database
- `main` environment -> production Supabase database

## Important migration rule

This workflow only auto-runs files that are newly added under `infra/migrations`.

Do not edit, rename, or delete a migration file after it has been merged. If you need another schema change, add a new SQL file instead. The workflow will fail if an existing migration file is modified in a release push.

## Typical flow

1. Add a new SQL file in `infra/migrations`
2. Open a pull request into `develop` or `main`
3. GitHub Actions runs the web test suite
4. Merge the pull request
5. The workflow connects to the matching Supabase database and executes the new SQL file automatically
