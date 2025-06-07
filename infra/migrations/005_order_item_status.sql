-- Add order_item_status to track individual item preparation status
ALTER TABLE order_items ADD COLUMN status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered','preparing','ready','served'));

-- Add index for better performance when querying by status
CREATE INDEX ON order_items (order_id, status);

-- Update existing records to have 'ordered' status
UPDATE order_items SET status = 'ordered' WHERE status IS NULL;