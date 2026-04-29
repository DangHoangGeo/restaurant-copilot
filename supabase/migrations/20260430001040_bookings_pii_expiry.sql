-- Purpose: add booking PII retention metadata and allow scheduled purging.
-- Rollout assumptions:
-- - Customer booking creation still supplies customer_name and customer_contact.
-- - Historical booking rows may have PII purged after the retention window.
-- Verification:
-- - bookings.pii_expires_at is generated from booking_date + 180 days.
-- - The purge Edge Function can NULL expired customer PII fields without
--   violating NOT NULL constraints.

ALTER TABLE public.bookings
  ALTER COLUMN customer_name DROP NOT NULL,
  ALTER COLUMN customer_contact DROP NOT NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pii_expires_at date
    GENERATED ALWAYS AS ((booking_date + 180)) STORED;

COMMENT ON COLUMN public.bookings.pii_expires_at IS
  'Date after which customer booking personal data should be purged by the scheduled cleanup function.';

CREATE INDEX IF NOT EXISTS idx_bookings_pii_expiry
  ON public.bookings USING btree (pii_expires_at)
  WHERE pii_expires_at IS NOT NULL;
