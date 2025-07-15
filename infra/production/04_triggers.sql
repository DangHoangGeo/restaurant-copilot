
-- ================================================
-- TRIGGER FUNCTIONS
-- ================================================

-- Function to update table status based on order status
CREATE OR REPLACE FUNCTION update_table_status_on_order_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new order is created, mark table as occupied
    IF TG_OP = 'INSERT' THEN
        UPDATE tables 
        SET status = 'occupied', 
            updated_at = now()
        WHERE id = NEW.table_id;
        RETURN NEW;
    END IF;
    
    -- When an order is completed or cancelled, check if table should be available
    IF TG_OP = 'UPDATE' THEN
        -- If order status changed to completed or cancelled
        IF OLD.status != NEW.status AND NEW.status IN ('completed', 'canceled') THEN
            -- Check if there are any other active orders for this table
            IF NOT EXISTS (
                SELECT 1 FROM orders 
                WHERE table_id = NEW.table_id 
                AND status IN ('new', 'serving') 
                AND id != NEW.id
            ) THEN
                -- No other active orders, mark table as available
                UPDATE tables 
                SET status = 'available', 
                    updated_at = now()
                WHERE id = NEW.table_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- When an order is deleted, check if table should be available
    IF TG_OP = 'DELETE' THEN
        -- Only update if the deleted order was active
        IF OLD.status IN ('new', 'serving') THEN
            -- Check if there are any other active orders for this table
            IF NOT EXISTS (
                SELECT 1 FROM orders 
                WHERE table_id = OLD.table_id 
                AND status IN ('new', 'serving')
            ) THEN
                -- No other active orders, mark table as available
                UPDATE tables 
                SET status = 'available', 
                    updated_at = now()
                WHERE id = OLD.table_id;
            END IF;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update order status based on order items status
CREATE OR REPLACE FUNCTION update_order_status_on_item_change()
RETURNS TRIGGER AS $$
DECLARE
    order_record RECORD;
    all_items_ready BOOLEAN;
    all_items_served BOOLEAN;
    has_preparing_items BOOLEAN;
    has_cancelled_items BOOLEAN;
    order_id_to_check UUID;
BEGIN
    -- Get the order_id from the trigger
    IF TG_OP = 'DELETE' THEN
        order_id_to_check := OLD.order_id;
    ELSE
        order_id_to_check := NEW.order_id;
    END IF;
    
    -- Get current order status
    SELECT status INTO order_record FROM orders WHERE id = order_id_to_check;
    
    -- Check the status of all items in this order
    SELECT 
        NOT EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status NOT IN ('ready', 'served', 'cancelled')) as all_ready,
        NOT EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status != 'served') as all_served,
        EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status = 'preparing') as has_preparing,
        EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status = 'cancelled') as has_cancelled
    INTO all_items_ready, all_items_served, has_preparing_items, has_cancelled_items;
    
    -- Update order status based on item statuses
    IF has_preparing_items OR all_items_ready THEN
        -- Some items are preparing or ready, mark order as serving
        UPDATE orders 
        SET status = 'serving', 
            updated_at = now()
        WHERE id = order_id_to_check AND status = 'new';
    END IF;
    
    -- Check if all items are cancelled (order should be cancelled)
    IF NOT EXISTS(SELECT 1 FROM order_items WHERE order_id = order_id_to_check AND status != 'cancelled') THEN
        UPDATE orders 
        SET status = 'canceled', 
            updated_at = now()
        WHERE id = order_id_to_check AND status NOT IN ('completed', 'canceled');
    END IF;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update order total amount when order items change
CREATE OR REPLACE FUNCTION update_order_total_amount()
RETURNS TRIGGER AS $$
DECLARE
    order_id_to_update UUID;
    new_total NUMERIC;
BEGIN
    -- Get the order_id from the trigger
    IF TG_OP = 'DELETE' THEN
        order_id_to_update := OLD.order_id;
    ELSE
        order_id_to_update := NEW.order_id;
    END IF;
    
    -- Calculate new total amount (excluding cancelled items)
    SELECT COALESCE(SUM(price_at_order * quantity), 0)
    INTO new_total
    FROM order_items 
    WHERE order_id = order_id_to_update 
    AND status != 'cancelled';
    
    -- Update the order total
    UPDATE orders 
    SET total_amount = new_total,
        updated_at = now()
    WHERE id = order_id_to_update;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger for table status updates based on order changes
CREATE TRIGGER trigger_update_table_status_on_order_change
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_table_status_on_order_change();

-- Trigger for order status updates based on order item changes
CREATE TRIGGER trigger_update_order_status_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_status_on_item_change();

-- Trigger for order total amount updates
CREATE TRIGGER trigger_update_order_total_amount
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total_amount();
