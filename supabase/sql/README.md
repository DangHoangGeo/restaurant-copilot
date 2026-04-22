# SQL Layout

`supabase/sql/` is organized for maintainability first and replay safety second.

## Rules

- keep SQL grouped by product domain, not by one giant global file
- keep table definitions, keys, relations, policies, functions, and triggers explicit
- keep execute grants explicit when a domain exposes callable SQL functions
- keep bootstrap order explicit in `supabase/bootstrap.sql`
- keep business-facing runtime surfaces in their real domain instead of hiding them in legacy folders
- prefer changing one domain file over reconstructing a migration history

## Domain Map

- `00_foundation`
- `10_branch_core`
- `20_ordering_customer`
- `30_founder_control`
- `40_people_attendance`
- `50_finance_billing`
- `60_platform_admin_support`
- `70_storage`

## How To Change Safely

1. Put the change in the correct domain first.
2. Choose the correct layer:
   `schema.sql` for tables and comments,
   `keys.sql` for primary keys, unique constraints, defaults, and indexes,
   `relations.sql` for foreign keys,
   `functions.sql` for RPCs and helper functions,
   `policies.sql` for RLS,
   `grants.sql` for explicit function execute permissions,
   `triggers.sql` for trigger wiring.
3. Re-run the local bootstrap validation against a blank Supabase stack.

The goal is that future agents should be able to change one business area without
reconstructing the entire platform from one monolithic SQL file.
