-- Fix order_items table to support multiple toppings
-- The current schema has single topping_id but API expects multiple toppings

-- Remove the single topping_id column
ALTER TABLE order_items DROP COLUMN IF EXISTS topping_id;

-- Add columns to support multiple toppings and proper pricing
ALTER TABLE order_items 
  ADD COLUMN topping_ids uuid[], -- Array of topping IDs
  ADD COLUMN price_at_order numeric; -- Store the calculated price at time of order

-- Add index for better performance when querying by topping_ids
CREATE INDEX ON order_items USING GIN (topping_ids);

-- Add index for price_at_order for reporting queries
CREATE INDEX ON order_items (restaurant_id, price_at_order);

-- Update existing records to have empty topping_ids array and set price_at_order
UPDATE order_items 
SET topping_ids = '{}', 
    price_at_order = (
      SELECT mi.price 
      FROM menu_items mi 
      WHERE mi.id = order_items.menu_item_id
    )
WHERE topping_ids IS NULL;

-- Make the new columns NOT NULL with defaults
ALTER TABLE order_items 
  ALTER COLUMN topping_ids SET DEFAULT '{}',
  ALTER COLUMN topping_ids SET NOT NULL,
  ALTER COLUMN price_at_order SET NOT NULL;
