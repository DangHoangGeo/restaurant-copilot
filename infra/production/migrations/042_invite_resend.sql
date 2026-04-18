-- Migration 042: Add resend tracking columns to organization_pending_invites
--
-- Enables the "resend invite" feature: when a founder resends an invite the
-- token is regenerated, the expiry is extended, and the counters below are updated.

ALTER TABLE organization_pending_invites
  ADD COLUMN IF NOT EXISTS last_resent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resend_count   INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN organization_pending_invites.last_resent_at IS 'Timestamp of the most recent resend action (NULL if never resent)';
COMMENT ON COLUMN organization_pending_invites.resend_count   IS 'Number of times this invite has been resent';
