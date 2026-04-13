-- Migration: 037_organization_foundation
-- Phase 1: Build the Organization Foundation
--
-- Adds an organization layer above the existing restaurant (branch) layer.
-- The existing restaurants table is the branch-level operating unit and is NOT altered.
-- Every existing owner user is migrated into their own organization automatically.
--
-- Tables added:
--   owner_organizations           - the business/ownership group
--   organization_members          - founders, finance partners, accountants (NOT employees)
--   organization_restaurants      - which restaurants belong to which organization
--   organization_member_shop_scopes - which branches a member can access
--   organization_member_permissions - explicit permission grants per member

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. owner_organizations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS owner_organizations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        UNIQUE NOT NULL,
  country     text        NOT NULL DEFAULT 'JP',
  timezone    text        NOT NULL DEFAULT 'Asia/Tokyo',
  currency    text        NOT NULL DEFAULT 'JPY',
  is_active   boolean     NOT NULL DEFAULT true,
  created_by  uuid        NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_organizations_created_by ON owner_organizations (created_by);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. organization_members
--    Founders, co-founders, finance partners, accountants.
--    Employees are NOT modeled here (they remain in the employees table).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_members (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES owner_organizations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN (
                                  'founder_full_control',
                                  'founder_operations',
                                  'founder_finance',
                                  'accountant_readonly',
                                  'branch_general_manager'
                                )),
  -- scope: 'all_shops' means the member can access every restaurant in the org.
  -- 'selected_shops' means access is limited to rows in organization_member_shop_scopes.
  shop_scope      text        NOT NULL DEFAULT 'all_shops' CHECK (shop_scope IN ('all_shops', 'selected_shops')),
  invited_by      uuid        REFERENCES auth.users(id),
  joined_at       timestamptz,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id  ON organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. organization_restaurants
--    Links restaurants (branches) to an organization.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_restaurants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES owner_organizations(id) ON DELETE CASCADE,
  restaurant_id   uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  added_by        uuid        REFERENCES auth.users(id),
  added_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, restaurant_id),
  UNIQUE (restaurant_id)  -- each restaurant belongs to exactly one organization
);

CREATE INDEX IF NOT EXISTS idx_org_restaurants_org_id        ON organization_restaurants (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_restaurants_restaurant_id ON organization_restaurants (restaurant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. organization_member_shop_scopes
--    Used when a member's shop_scope = 'selected_shops'.
--    Lists the specific restaurants that member may access.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_member_shop_scopes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES owner_organizations(id) ON DELETE CASCADE,
  member_id       uuid        NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  restaurant_id   uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_org_member_shop_scopes_member_id ON organization_member_shop_scopes (member_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. organization_member_permissions
--    Explicit permission grants or overrides per member.
--    Roles provide defaults; this table stores overrides.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_member_permissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES owner_organizations(id) ON DELETE CASCADE,
  member_id       uuid        NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  permission      text        NOT NULL CHECK (permission IN (
                                  'reports',
                                  'finance_exports',
                                  'purchases',
                                  'promotions',
                                  'employees',
                                  'attendance_approvals',
                                  'restaurant_settings',
                                  'organization_settings',
                                  'billing'
                                )),
  granted         boolean     NOT NULL DEFAULT true,
  granted_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_org_member_permissions_member_id ON organization_member_permissions (member_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Helper functions for RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns true if the calling user is an active member of the organization.
CREATE OR REPLACE FUNCTION is_org_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members om
    WHERE  om.organization_id = p_organization_id
    AND    om.user_id          = auth.uid()
    AND    om.is_active        = true
  );
$$;

-- Returns true if the calling user has founder_full_control in the organization.
CREATE OR REPLACE FUNCTION is_org_founder(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members om
    WHERE  om.organization_id = p_organization_id
    AND    om.user_id          = auth.uid()
    AND    om.is_active        = true
    AND    om.role             = 'founder_full_control'
  );
$$;

-- Returns true if the calling user is an active org member whose scope includes
-- the given restaurant (either via 'all_shops' or via an explicit shop scope row).
CREATE OR REPLACE FUNCTION is_org_member_for_restaurant(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members   om
    JOIN   organization_restaurants orr ON orr.organization_id = om.organization_id
    WHERE  orr.restaurant_id = p_restaurant_id
    AND    om.user_id         = auth.uid()
    AND    om.is_active       = true
    AND (
      om.shop_scope = 'all_shops'
      OR EXISTS (
        SELECT 1
        FROM   organization_member_shop_scopes s
        WHERE  s.member_id     = om.id
        AND    s.restaurant_id = p_restaurant_id
      )
    )
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────

-- owner_organizations --
ALTER TABLE owner_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their organization"
  ON owner_organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "Org founders can update their organization"
  ON owner_organizations FOR UPDATE
  USING (is_org_founder(id))
  WITH CHECK (is_org_founder(id));

-- organization_members --
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view members of their organization"
  ON organization_members FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Org founders can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (is_org_founder(organization_id));

CREATE POLICY "Org founders can update members"
  ON organization_members FOR UPDATE
  USING (is_org_founder(organization_id))
  WITH CHECK (is_org_founder(organization_id));

CREATE POLICY "Org founders can delete members"
  ON organization_members FOR DELETE
  USING (is_org_founder(organization_id));

-- organization_restaurants --
ALTER TABLE organization_restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view restaurants in their organization"
  ON organization_restaurants FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Org founders can add restaurants to their organization"
  ON organization_restaurants FOR INSERT
  WITH CHECK (is_org_founder(organization_id));

CREATE POLICY "Org founders can remove restaurants from their organization"
  ON organization_restaurants FOR DELETE
  USING (is_org_founder(organization_id));

-- organization_member_shop_scopes --
ALTER TABLE organization_member_shop_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view shop scopes in their organization"
  ON organization_member_shop_scopes FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Org founders can manage shop scopes"
  ON organization_member_shop_scopes FOR ALL
  USING (is_org_founder(organization_id))
  WITH CHECK (is_org_founder(organization_id));

-- organization_member_permissions --
ALTER TABLE organization_member_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view permissions in their organization"
  ON organization_member_permissions FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Org founders can manage permissions"
  ON organization_member_permissions FOR ALL
  USING (is_org_founder(organization_id))
  WITH CHECK (is_org_founder(organization_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_owner_organizations_updated_at
  BEFORE UPDATE ON owner_organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Migrate existing restaurants into organizations
--
--    For every existing restaurant that has an owner user in the users table,
--    create:
--      - one owner_organizations row  (slug = restaurant subdomain)
--      - one organization_members row (role = founder_full_control)
--      - one organization_restaurants row
--
--    This block is idempotent: it skips restaurants already linked.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  new_org_id uuid;
BEGIN
  FOR r IN
    SELECT
      u.id        AS user_id,
      res.id      AS restaurant_id,
      res.name    AS restaurant_name,
      res.subdomain,
      res.timezone,
      res.currency
    FROM restaurants res
    JOIN users u ON u.restaurant_id = res.id AND u.role = 'owner'
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_restaurants orr WHERE orr.restaurant_id = res.id
    )
  LOOP
    -- Create organization (slug = subdomain, guaranteed unique)
    INSERT INTO owner_organizations (name, slug, country, timezone, currency, created_by)
    VALUES (
      r.restaurant_name,
      r.subdomain,
      'JP',
      COALESCE(r.timezone, 'Asia/Tokyo'),
      COALESCE(r.currency, 'JPY'),
      r.user_id
    )
    RETURNING id INTO new_org_id;

    -- Add owner as founder_full_control
    INSERT INTO organization_members (organization_id, user_id, role, shop_scope, joined_at)
    VALUES (new_org_id, r.user_id, 'founder_full_control', 'all_shops', now());

    -- Link the restaurant to the organization
    INSERT INTO organization_restaurants (organization_id, restaurant_id, added_by)
    VALUES (new_org_id, r.restaurant_id, r.user_id);

  END LOOP;
END;
$$;
