-- Persist mobile checkout payment breakdown on completed orders.

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payment_method text,
    ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tip_amount numeric DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_discount_amount_check'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_discount_amount_check CHECK (discount_amount IS NULL OR discount_amount >= 0) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_tax_amount_check'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_tax_amount_check CHECK (tax_amount IS NULL OR tax_amount >= 0) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_tip_amount_check'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_tip_amount_check CHECK (tip_amount IS NULL OR tip_amount >= 0) NOT VALID;
    END IF;
END $$;

ALTER TABLE public.orders VALIDATE CONSTRAINT orders_discount_amount_check;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_tax_amount_check;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_tip_amount_check;
