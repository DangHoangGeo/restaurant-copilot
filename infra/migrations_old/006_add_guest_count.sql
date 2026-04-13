ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_count integer NOT NULL DEFAULT 1 CHECK (guest_count > 0);
