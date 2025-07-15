-- Create RPC function to get active orders with details
-- This optimizes performance by moving data-intensive joins to the database level
-- DROP FUNCTION get_active_orders_with_details(uuid)
CREATE OR REPLACE FUNCTION get_active_orders_with_details(p_restaurant_id UUID)
RETURNS SETOF orders AS $$
BEGIN
    -- Return all orders that are not completed, canceled, or draft
    -- The client will handle the relationship data fetching for order items
    RETURN QUERY
    SELECT *
    FROM orders
    WHERE orders.restaurant_id = p_restaurant_id
      AND orders.status NOT IN ('completed', 'canceled', 'draft')
    ORDER BY orders.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_active_orders_with_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_orders_with_details(UUID) TO anon;
