-- Migration 041: Add allow_order_notes setting to restaurants
-- Controls whether the "Special Instructions" field is shown to customers
-- on the item detail modal. Defaults to true for all existing restaurants.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS allow_order_notes BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN restaurants.allow_order_notes IS
  'When false, the special instructions / order notes field is hidden from customers on the item detail modal.';
