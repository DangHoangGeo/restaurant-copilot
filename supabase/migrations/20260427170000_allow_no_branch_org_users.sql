-- Allow organization-only users without legacy branch authority.
--
-- Purpose:
--   accountant_readonly and future no-branch org members should authenticate
--   through organization_members without receiving users.restaurant_id based
--   branch-route access. This keeps legacy branch APIs from over-granting.
--
-- Rollout assumptions:
--   Existing branch users keep their current restaurant_id. Only new or
--   downgraded organization-only users receive NULL restaurant_id.
--
-- Verification:
--   Create or update an accountant_readonly invite and confirm public.users can
--   store role='staff' with restaurant_id=NULL.

ALTER TABLE public.users
  ALTER COLUMN restaurant_id DROP NOT NULL;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (
    role = ANY (
      ARRAY[
        'owner'::text,
        'chef'::text,
        'server'::text,
        'cashier'::text,
        'manager'::text,
        'part_time'::text,
        'employee'::text,
        'staff'::text
      ]
    )
  );

COMMENT ON COLUMN public.users.restaurant_id IS
  'Legacy primary branch context. Nullable for organization-only members such as accountant_readonly who must not inherit branch-route authority.';
