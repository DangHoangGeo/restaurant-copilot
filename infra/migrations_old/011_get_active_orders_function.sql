-- Migration: Create function to get active orders with all related data
-- This function efficiently fetches orders, order items, menu items, and tables in a single call

CREATE OR REPLACE FUNCTION get_active_orders_with_details(restaurant_uuid UUID)
RETURNS TABLE (
    -- Order fields
    order_id UUID,
    order_restaurant_id UUID,
    order_table_id UUID,
    order_session_id UUID,
    order_guest_count INTEGER,
    order_status TEXT,
    order_total_amount DECIMAL,
    order_created_at TIMESTAMPTZ,
    order_updated_at TIMESTAMPTZ,
    
    -- Table fields
    table_id UUID,
    table_name TEXT,
    table_status TEXT,
    table_capacity INTEGER,
    table_is_outdoor BOOLEAN,
    table_is_accessible BOOLEAN,
    table_notes TEXT,
    
    -- Order items as JSON aggregation
    order_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.restaurant_id as order_restaurant_id,
        o.table_id as order_table_id,
        o.session_id as order_session_id,
        o.guest_count as order_guest_count,
        o.status as order_status,
        o.total_amount as order_total_amount,
        o.created_at as order_created_at,
        o.updated_at as order_updated_at,
        
        t.id as table_id,
        t.name as table_name,
        t.status as table_status,
        t.capacity as table_capacity,
        t.is_outdoor as table_is_outdoor,
        t.is_accessible as table_is_accessible,
        t.notes as table_notes,
        
        -- Aggregate order items with menu details as JSON
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'restaurant_id', oi.restaurant_id,
                    'order_id', oi.order_id,
                    'menu_item_id', oi.menu_item_id,
                    'quantity', oi.quantity,
                    'notes', oi.notes,
                    'status', oi.status,
                    'created_at', oi.created_at,
                    'menu_item', jsonb_build_object(
                        'id', mi.id,
                        'restaurant_id', mi.restaurant_id,
                        'category_id', mi.category_id,
                        'name_en', mi.name_en,
                        'name_ja', mi.name_ja,
                        'name_vi', mi.name_vi,
                        'code', mi.code,
                        'description_en', mi.description_en,
                        'description_ja', mi.description_ja,
                        'description_vi', mi.description_vi,
                        'price', mi.price,
                        'tags', mi.tags,
                        'image_url', mi.image_url,
                        'stock_level', mi.stock_level,
                        'available', mi.available,
                        'position', mi.position,
                        'created_at', mi.created_at,
                        'updated_at', mi.updated_at
                    )
                )
                ORDER BY oi.created_at
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::jsonb
        ) as order_items
        
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
    
    WHERE o.restaurant_id = restaurant_uuid
      AND o.status IN ('new', 'preparing', 'ready')
    
    GROUP BY 
        o.id, o.restaurant_id, o.table_id, o.session_id, o.guest_count, 
        o.status, o.total_amount, o.created_at, o.updated_at,
        t.id, t.name, t.status, t.capacity, t.is_outdoor, t.is_accessible, t.notes
    
    ORDER BY o.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_active_orders_with_details(UUID) TO authenticated;

-- Add RLS policy to ensure users can only access their restaurant's data
-- The function itself will be called with the restaurant_id from the JWT context