-- Migration: 038_pending_invites
-- Phase 2: Shared Founder and Branch Access Control
--
-- Adds invite-by-email flow so org founders can invite people who do not yet
-- have a users row or Supabase auth account.
--
-- Tables added:
--   organization_pending_invites  - stores a tokenized invite until accepted or expired

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. organization_pending_invites
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_pending_invites (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES owner_organizations(id) ON DELETE CASCADE,
  invited_by            uuid        NOT NULL REFERENCES auth.users(id),
  email                 text        NOT NULL,
  role                  text        NOT NULL CHECK (role IN (
                                        'founder_full_control',
                                        'founder_operations',
                                        'founder_finance',
                                        'accountant_readonly',
                                        'branch_general_manager'
                                      )),
  shop_scope            text        NOT NULL DEFAULT 'all_shops' CHECK (shop_scope IN ('all_shops', 'selected_shops')),
  -- JSON array of restaurant UUIDs for selected_shops scope.
  -- NULL when shop_scope = 'all_shops'.
  selected_restaurant_ids jsonb     DEFAULT NULL,
  -- Secure random token used in the accept URL. Never exposed in list responses.
  invite_token          text        UNIQUE NOT NULL,
  expires_at            timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at           timestamptz DEFAULT NULL,
  -- The auth.users.id of the person who accepted the invite.
  accepted_by_user_id   uuid        REFERENCES auth.users(id) DEFAULT NULL,
  -- Soft revoke: is_active = false means the invite was revoked before acceptance.
  is_active             boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_invites_org_id       ON organization_pending_invites (organization_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_email        ON organization_pending_invites (email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_token        ON organization_pending_invites (invite_token);
CREATE INDEX IF NOT EXISTS idx_pending_invites_is_active    ON organization_pending_invites (is_active) WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE organization_pending_invites ENABLE ROW LEVEL SECURITY;

-- Org members can view pending invites for their organization (but NOT the token).
-- The invite_token is excluded from the SELECT projection in application queries.
CREATE POLICY "Org members can view pending invites"
  ON organization_pending_invites FOR SELECT
  USING (is_org_member(organization_id));

-- Only org founders can create invites.
CREATE POLICY "Org founders can create pending invites"
  ON organization_pending_invites FOR INSERT
  WITH CHECK (is_org_founder(organization_id));

-- Only org founders can revoke (update is_active) invites.
CREATE POLICY "Org founders can revoke pending invites"
  ON organization_pending_invites FOR UPDATE
  USING (is_org_founder(organization_id))
  WITH CHECK (is_org_founder(organization_id));

-- Note: The accept-invite flow uses the service-role (admin) client because
-- the person accepting is not yet an org member at the time of acceptance.
