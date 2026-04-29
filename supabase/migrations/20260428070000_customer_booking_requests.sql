-- Purpose: make public customer reservations real without requiring a table.
-- Rollout: additive columns first, keep existing bookings compatible, then make
-- table_id optional and preserve bookings if a table is removed.
-- Verification: create a pending public booking, confirm/cancel it from branch
-- bookings, and read its status by public_lookup_token.

ALTER TABLE public.bookings
  ALTER COLUMN table_id DROP NOT NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_note text,
  ADD COLUMN IF NOT EXISTS public_lookup_token uuid;

UPDATE public.bookings
SET public_lookup_token = extensions.uuid_generate_v4()
WHERE public_lookup_token IS NULL;

ALTER TABLE public.bookings
  ALTER COLUMN public_lookup_token SET DEFAULT extensions.uuid_generate_v4(),
  ALTER COLUMN public_lookup_token SET NOT NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_table_id_fkey;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_table_id_fkey
  FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_public_lookup_token_key UNIQUE (public_lookup_token);

CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_public_lookup_token
  ON public.bookings USING btree (restaurant_id, public_lookup_token);

COMMENT ON COLUMN public.bookings.table_id IS 'Optional assigned table. Public reservation requests start without a table and managers may assign seating operationally.';
COMMENT ON COLUMN public.bookings.customer_phone IS 'Validated customer phone captured for manager callback.';
COMMENT ON COLUMN public.bookings.customer_email IS 'Validated customer email captured for reservation follow-up when provided.';
COMMENT ON COLUMN public.bookings.customer_note IS 'Customer-visible reservation notes such as timing or seating requests.';
COMMENT ON COLUMN public.bookings.public_lookup_token IS 'Opaque cookie-backed token used to let a returning guest check reservation status without exposing manager access.';
