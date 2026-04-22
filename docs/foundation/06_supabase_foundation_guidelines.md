# Supabase Foundation Guidelines

## Goal

Keep the database foundation stable enough that we make schema changes deliberately, not casually.

This project should be able to support:

- one founder with one branch
- one organization with many branches
- Vietnamese restaurants in Japan
- Japanese restaurants in Japan
- Vietnamese restaurants in Vietnam
- tax, reporting, attendance, billing, and support requirements that stay auditable over time

The standard is not “works today”.

The standard is “future teams can extend this in 3, 5, and 10 years without guessing what is safe”.

## Canonical Database Contract

The repository now has two different but related database responsibilities:

1. `supabase/sql/*`
   The canonical baseline for a blank project.
2. `supabase/migrations/*`
   Forward-only rollout migrations for already-running environments.

Always update the canonical baseline when behavior changes.

If any live environment already exists, pair that baseline update with a forward-only migration or an explicit rollout note explaining why a migration is not needed.

Do not rebuild the final state from migration history.

Do not treat a one-off migration as the source of truth.

## Database Worldview

Every database change must preserve these boundaries:

- `restaurants` is the branch operating unit.
- organizations sit above branches and manage multi-branch ownership.
- branch menus stay branch-resolved first, even if shared-menu inheritance exists.
- organization members and branch employees are different actor models.
- language preference is separate from legal, tax, or country rules.
- finance, attendance, approvals, billing, and support actions must remain explicit and auditable.

If a change weakens one of those boundaries, stop and redesign it.

## File Placement

Use the canonical domain files first:

- `supabase/sql/00_foundation`
- `supabase/sql/10_branch_core`
- `supabase/sql/20_ordering_customer`
- `supabase/sql/30_founder_control`
- `supabase/sql/40_people_attendance`
- `supabase/sql/50_finance_billing`
- `supabase/sql/60_platform_admin_support`
- `supabase/sql/70_storage`

Inside each domain:

- `schema.sql`
  table and sequence definitions plus table and column comments
- `keys.sql`
  primary keys, unique constraints, defaults, and indexes
- `relations.sql`
  foreign keys only
- `functions.sql`
  helper functions, RPCs, and trigger functions
- `policies.sql`
  RLS enablement and policies
- `grants.sql`
  explicit function execute permissions after the callable SQL surface is finalized
- `triggers.sql`
  trigger wiring

Do not add numbered migration slices to the canonical baseline.

## When To Change Baseline Only vs Add A Migration

Change the baseline only when:

- the task is still in blank-project development
- no persistent environment must be upgraded in place
- the rollout is a full reset

Change the baseline and add a forward-only migration when:

- any non-disposable environment already exists
- data must be preserved
- a new column, constraint, index, function, or policy must be applied in place
- a backfill is required
- a destructive cleanup is deferred behind compatibility

## Future Migration Rules

Put forward-only rollout migrations in `supabase/migrations/`.

Each migration must:

- use a timestamp-style prefix like `202604221230_add_tax_profile_table.sql`
- handle one concern only
- explain purpose, rollout assumptions, and verification in a short header comment
- be additive first whenever possible
- avoid hidden data rewrites
- update the canonical baseline in the same PR

Avoid destructive migrations.

If you must rename or drop something:

1. add the new shape first
2. backfill or dual-write if needed
3. keep compatibility long enough for the app to switch
4. remove the old shape in a later cleanup migration

Do not combine “introduce new path” and “remove old path” in the same risky rollout unless the database is guaranteed disposable.

## Schema Design Rules

Prefer additive designs:

- nullable new columns before mandatory columns
- new tables before overloading old tables
- compatibility views or helper functions before hard renames
- soft deactivation before hard deletes for people and business records

Use stable identifiers:

- UUID primary keys for entities
- immutable public identifiers only when product-facing, such as `subdomain` or `branch_code`

Prefer explicit tables over flexible blobs:

- use relational columns for money, permissions, legal identity, status, ownership, and tax data
- use `jsonb` only for bounded flexible payloads like opening hours, template data, or UI metadata

Prefer `text` plus `CHECK` over PostgreSQL enums for fast-moving product states.

That gives us safer deploys, easier compatibility, and fewer enum-alter migrations later.

Add comments for:

- non-obvious columns
- public identifiers
- legal/compliance fields
- compatibility surfaces

## Security And RLS Rules

New policies must not parse raw JWT restaurant claims inline.

Use the helper contract instead:

- `public.get_request_restaurant_id()`
- `public.get_user_restaurant_id()`
- `public.request_can_access_restaurant(...)`
- `public.user_has_restaurant_role(...)`
- `public.is_platform_admin()`
- `public.is_internal_operator()`

Every `SECURITY DEFINER` function must:

- set `search_path` explicitly
- have a clear authorization rule or documented internal-only reason
- avoid hidden side effects unless the side effect is the function’s purpose

Every callable domain that exposes RPCs should also have a `grants.sql` layer that:

- revokes default execute permissions intentionally
- grants only the minimum roles required
- keeps browser-safe, authenticated, and internal-only function surfaces obvious to future agents

If a function is intended for internal jobs only, protect it with:

- an internal authorization check like `public.is_internal_operator()`
- and, where relevant, a network or caller secret at the Edge Function boundary

Do not rely on “nobody will call this RPC directly”.

## Edge Function Rules

Edge Functions under `supabase/functions/*` are part of the database operations contract.

When `verify_jwt = false` is required for scheduler-style execution:

- require `INTERNAL_FUNCTION_SECRET` in production
- accept it via header or bearer token
- fail closed when the secret is configured and the request does not match

Use service-role access only for internal automation, never for public request handling.

## Performance Rules

Before adding an index, name the query shape it protects.

Prefer:

- narrow composite indexes that match actual filters
- partial indexes for sparse operational states
- snapshot tables for cross-branch and platform-wide reporting
- organization-level rollups only when branch-level facts remain recoverable

Do not add indexes just because a table “looks important”.

## Compliance And Reporting Rules

For Japan, Vietnam, and future multi-country operation:

- keep legal business identity separate from locale and translation settings
- keep tax configuration explicit and versionable
- do not bury reporting-critical data in free text
- preserve who approved or changed sensitive records
- keep raw operational facts available for tax and audit reconstruction

If government reporting will depend on it, model it explicitly.

## Review Checklist For Every Database PR

Before merge, answer all of these:

- Which domain owns this change?
- Does it preserve organization-over-branch boundaries?
- Does it keep customer ordering stable?
- Does it avoid new raw JWT parsing in RLS?
- Does every new `SECURITY DEFINER` function set `search_path`?
- Does every privileged function check authorization explicitly?
- If a live environment exists, where is the forward-only migration?
- Was the canonical baseline updated in the same PR?
- What bootstrap or migration verification was run?
- What cleanup is intentionally deferred?

If one of those answers is unclear, the change is not ready.
