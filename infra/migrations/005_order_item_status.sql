-- Add order_item_status to track individual item preparation status
ALTER TABLE order_items ADD COLUMN status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','preparing','ready','served','cancelled'));

-- Add index for better performance when querying by status
CREATE INDEX ON order_items (order_id, status);

-- Update existing records to have 'new' status
UPDATE order_items SET status = 'new' WHERE status IS NULL;

-- Add menu_item_code
ALTER TABLE menu_items ADD COLUMN code text UNIQUE;

-- Add index for better performance when querying by status
CREATE INDEX ON menu_items (category_id, code);