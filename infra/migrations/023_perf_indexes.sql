-- Performance optimization indexes
-- These indexes are designed to improve query performance for the most common operations

-- Orders table indexes for dashboard and order management queries
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status_created 
ON orders (restaurant_id, status, created_at DESC)
WHERE status IN ('new', 'confirmed', 'preparing', 'ready', 'serving', 'completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created 
ON orders (restaurant_id, created_at DESC);

-- For completed orders analysis and reporting
CREATE INDEX IF NOT EXISTS idx_orders_completed_date 
ON orders (restaurant_id, created_at DESC) 
WHERE status = 'completed';

-- Order items table indexes for item analysis and order details
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_restaurant_menu_item 
ON order_items (restaurant_id, menu_item_id);

-- For popular items analysis
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_created 
ON order_items (menu_item_id, created_at DESC);

-- Menu item sizes indexes for price lookups during order creation
CREATE INDEX IF NOT EXISTS idx_menu_item_sizes_menu_item 
ON menu_item_sizes (menu_item_id, restaurant_id);

-- Toppings indexes for order item lookups
CREATE INDEX IF NOT EXISTS idx_toppings_menu_item 
ON toppings (menu_item_id, restaurant_id);

CREATE INDEX IF NOT EXISTS idx_toppings_restaurant_ids 
ON toppings (restaurant_id, id);

-- Tables indexes for table validation during order creation
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id 
ON tables (restaurant_id, id);

-- Menu items indexes for menu display and order validation
CREATE INDEX IF NOT EXISTS idx_menu_items_category_position 
ON menu_items (category_id, position ASC, restaurant_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available 
ON menu_items (restaurant_id, available) 
WHERE available = true;

-- Categories indexes for menu organization
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_position 
ON categories (restaurant_id, position ASC);

-- Users table index for authentication and restaurant ownership
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id 
ON users (restaurant_id);

-- Restaurants table index for subdomain lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_subdomain 
ON restaurants (subdomain) 
WHERE subdomain IS NOT NULL;

-- Sessions table indexes for customer session management (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'sessions'
               AND EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_schema = 'public' 
                          AND table_name = 'sessions' 
                          AND column_name = 'restaurant_id')) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sessions_restaurant_active 
                ON sessions (restaurant_id, expires_at) 
                WHERE expires_at > NOW()';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Silently continue if there are any issues with this conditional index
        NULL;
END $$;

-- Inventory items index for low stock alerts (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'inventory_items'
               AND EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_schema = 'public' 
                          AND table_name = 'inventory_items' 
                          AND column_name = 'restaurant_id')) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
                ON inventory_items (restaurant_id, stock_level, threshold) 
                WHERE stock_level <= threshold';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Silently continue if there are any issues with this conditional index
        NULL;
END $$;

-- Composite index for order items with orders for reporting queries
CREATE INDEX IF NOT EXISTS idx_order_items_orders_reporting 
ON order_items (restaurant_id, created_at DESC);

-- Logs table index for performance monitoring (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'logs'
               AND EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_schema = 'public' 
                          AND table_name = 'logs' 
                          AND column_name = 'restaurant_id')) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_logs_restaurant_level_time 
                ON logs (restaurant_id, level, created_at DESC)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Silently continue if there are any issues with this conditional index
        NULL;
END $$;

-- Add helpful comments for maintenance
COMMENT ON INDEX idx_orders_restaurant_status_created IS 
'Optimizes dashboard queries filtering by restaurant, status, and ordering by creation date';

COMMENT ON INDEX idx_order_items_restaurant_menu_item IS 
'Optimizes popular items analysis and menu item performance queries';

COMMENT ON INDEX idx_menu_item_sizes_menu_item IS 
'Optimizes price lookups during order creation and menu display';

COMMENT ON INDEX idx_toppings_menu_item IS 
'Optimizes topping lookups during order creation and menu display';

-- Analyze tables to update statistics after creating indexes
ANALYZE orders;
ANALYZE order_items;
ANALYZE menu_items;
ANALYZE menu_item_sizes;
ANALYZE toppings;
ANALYZE categories;
ANALYZE tables;
ANALYZE users;
ANALYZE restaurants;