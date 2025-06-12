-- ================================================
-- PRODUCTION ROW LEVEL SECURITY POLICIES
-- Restaurant Copilot Database Security
-- ================================================

-- ================================================
-- UTILITY FUNCTIONS FOR SESSION MANAGEMENT
-- ================================================

-- Function to set current restaurant ID for anonymous sessions
CREATE OR REPLACE FUNCTION set_current_restaurant_id_for_session(restaurant_id_value uuid)
RETURNS void AS $$
BEGIN
  -- The 'true' in the third argument of set_config makes the setting local to the current session/transaction.
  PERFORM set_config('app.current_restaurant_id', restaurant_id_value::text, true);
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION set_current_restaurant_id_for_session(uuid) TO anon;
GRANT EXECUTE ON FUNCTION set_current_restaurant_id_for_session(uuid) TO authenticated;

-- ================================================
-- RESTAURANTS TABLE POLICIES
-- ================================================

-- Authenticated users can see their own restaurant
CREATE POLICY "Authenticated users can see own restaurant"
  ON restaurants
  FOR SELECT
  TO authenticated
  USING (id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Restaurant owners can update their restaurant
CREATE POLICY "Restaurant owners can update own restaurant"
  ON restaurants
  FOR UPDATE
  TO authenticated
  USING (
    id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ================================================
-- USERS TABLE POLICIES
-- ================================================

-- Users can see other users in their restaurant
CREATE POLICY "Users can see restaurant colleagues"
  ON users
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Owners and managers can insert new users
CREATE POLICY "Owners and managers can create users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- CATEGORIES TABLE POLICIES
-- ================================================

-- Anonymous users can see categories for current restaurant context
CREATE POLICY "Anonymous can SELECT categories"
  ON categories
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see categories for their restaurant
CREATE POLICY "Authenticated users can SELECT categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage categories
CREATE POLICY "Staff can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- MENU ITEMS TABLE POLICIES
-- ================================================

-- Anonymous users can see menu items for current restaurant context
CREATE POLICY "Anonymous can SELECT menu_items"
  ON menu_items
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see menu items for their restaurant
CREATE POLICY "Authenticated users can SELECT menu_items"
  ON menu_items
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage menu items
CREATE POLICY "Staff can manage menu_items"
  ON menu_items
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- MENU ITEM SIZES TABLE POLICIES
-- ================================================

-- Anonymous users can see menu item sizes for current restaurant context
CREATE POLICY "Anonymous can SELECT menu_item_sizes"
  ON menu_item_sizes
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see menu item sizes for their restaurant
CREATE POLICY "Authenticated users can SELECT menu_item_sizes"
  ON menu_item_sizes
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage menu item sizes
CREATE POLICY "Staff can manage menu_item_sizes"
  ON menu_item_sizes
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- TOPPINGS TABLE POLICIES
-- ================================================

-- Anonymous users can see toppings for current restaurant context
CREATE POLICY "Anonymous can SELECT toppings"
  ON toppings
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see toppings for their restaurant
CREATE POLICY "Authenticated users can SELECT toppings"
  ON toppings
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage toppings
CREATE POLICY "Staff can manage toppings"
  ON toppings
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- TABLES TABLE POLICIES
-- ================================================

-- Anonymous users can see tables for current restaurant context
CREATE POLICY "Anonymous can SELECT tables"
  ON tables
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see tables for their restaurant
CREATE POLICY "Authenticated users can SELECT tables"
  ON tables
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage tables
CREATE POLICY "Staff can manage tables"
  ON tables
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- ORDERS TABLE POLICIES
-- ================================================

-- Anonymous users can see orders for current restaurant context (for order tracking)
CREATE POLICY "Anonymous can SELECT orders"
  ON orders
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Anonymous users can create orders
CREATE POLICY "Anonymous can INSERT orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Anonymous users can update their own orders (limited scope)
CREATE POLICY "Anonymous can UPDATE orders"
  ON orders
  FOR UPDATE
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid)
  WITH CHECK (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see orders for their restaurant
CREATE POLICY "Authenticated users can SELECT orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage orders
CREATE POLICY "Staff can manage orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- ORDER ITEMS TABLE POLICIES
-- ================================================

-- Anonymous users can see order items for current restaurant context
CREATE POLICY "Anonymous can SELECT order_items"
  ON order_items
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Anonymous users can create order items
CREATE POLICY "Anonymous can INSERT order_items"
  ON order_items
  FOR INSERT
  TO anon
  WITH CHECK (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Anonymous users can update order items (limited scope)
CREATE POLICY "Anonymous can UPDATE order_items"
  ON order_items
  FOR UPDATE
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid)
  WITH CHECK (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see order items for their restaurant
CREATE POLICY "Authenticated users can SELECT order_items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage order items
CREATE POLICY "Staff can manage order_items"
  ON order_items
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- EMPLOYEES TABLE POLICIES
-- ================================================

-- Authenticated users can see employees for their restaurant
CREATE POLICY "Authenticated users can SELECT employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Managers and owners can manage employees
CREATE POLICY "Managers can manage employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- SCHEDULES TABLE POLICIES
-- ================================================

-- Authenticated users can see schedules for their restaurant
CREATE POLICY "Authenticated users can SELECT schedules"
  ON schedules
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Managers and owners can manage schedules
CREATE POLICY "Managers can manage schedules"
  ON schedules
  FOR ALL
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- REVIEWS TABLE POLICIES
-- ================================================

-- Anonymous users can see reviews for current restaurant context
CREATE POLICY "Anonymous can SELECT reviews"
  ON reviews
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Anonymous users can create reviews
CREATE POLICY "Anonymous can INSERT reviews"
  ON reviews
  FOR INSERT
  TO anon
  WITH CHECK (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see reviews for their restaurant
CREATE POLICY "Authenticated users can SELECT reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage reviews
CREATE POLICY "Staff can manage reviews"
  ON reviews
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- FEEDBACK TABLE POLICIES
-- ================================================

-- Anonymous users can create feedback
CREATE POLICY "Anonymous can INSERT feedback"
  ON feedback
  FOR INSERT
  TO anon
  WITH CHECK (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see feedback for their restaurant
CREATE POLICY "Authenticated users can SELECT feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage feedback
CREATE POLICY "Staff can manage feedback"
  ON feedback
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- INVENTORY ITEMS TABLE POLICIES
-- ================================================

-- Authenticated users can see inventory for their restaurant
CREATE POLICY "Authenticated users can SELECT inventory_items"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage inventory
CREATE POLICY "Staff can manage inventory_items"
  ON inventory_items
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- ANALYTICS SNAPSHOTS TABLE POLICIES
-- ================================================

-- Authenticated users can see analytics for their restaurant
CREATE POLICY "Authenticated users can SELECT analytics_snapshots"
  ON analytics_snapshots
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Managers and owners can manage analytics
CREATE POLICY "Managers can manage analytics_snapshots"
  ON analytics_snapshots
  FOR ALL
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- BOOKINGS TABLE POLICIES
-- ================================================

-- Anonymous users can create bookings
CREATE POLICY "Anonymous can INSERT bookings"
  ON bookings
  FOR INSERT
  TO anon
  WITH CHECK (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Authenticated users can see bookings for their restaurant
CREATE POLICY "Authenticated users can SELECT bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Staff can manage bookings
CREATE POLICY "Staff can manage bookings"
  ON bookings
  FOR ALL
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- CHAT LOGS TABLE POLICIES
-- ================================================

-- Authenticated users can see chat logs for their restaurant
CREATE POLICY "Authenticated users can SELECT chat_logs"
  ON chat_logs
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Anonymous and authenticated users can create chat logs
CREATE POLICY "Anonymous can INSERT chat_logs"
  ON chat_logs
  FOR INSERT
  TO anon
  WITH CHECK (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

CREATE POLICY "Authenticated can INSERT chat_logs"
  ON chat_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- LOGS TABLE POLICIES
-- ================================================

-- Authenticated users can see logs for their restaurant
CREATE POLICY "Authenticated users can SELECT logs"
  ON logs
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- System can create logs
CREATE POLICY "System can INSERT logs"
  ON logs
  FOR INSERT
  TO authenticated
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- AUDIT LOGS TABLE POLICIES
-- ================================================

-- Restrict audit logs to restaurant users
CREATE POLICY "Restrict audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Allow tenant to insert audit logs
CREATE POLICY "Tenant can INSERT audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Allow tenant to update audit logs
CREATE POLICY "Tenant can UPDATE audit logs"
  ON audit_logs
  FOR UPDATE
  TO authenticated
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- ================================================
-- PERMISSION GRANTS
-- ================================================

-- Revoke all permissions on audit_logs and grant specific necessary privileges
REVOKE ALL ON audit_logs FROM authenticated;
GRANT INSERT, SELECT, UPDATE ON audit_logs TO authenticated;


-- Enable RLS for the storage bucket to ensure tenant isolation
--ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own restaurant files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own restaurant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own restaurant files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own restaurant files" ON storage.objects;

-- Allow authenticated users to read files from their own restaurant folder
CREATE POLICY "Users can view own restaurant files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'restaurant-uploads'
    AND (
      -- Check if the name starts with restaurants/{restaurant_id}/ where restaurant_id matches JWT
      name LIKE ('restaurants/' || ((auth.jwt() ->> 'app_metadata')::json ->> 'restaurant_id') || '/%')
      OR
      -- Fallback: check against user's restaurant_id from users table
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND name LIKE ('restaurants/' || users.restaurant_id || '/%')
      )
    )
  );

-- Allow authenticated users to upload files to their own restaurant folder
CREATE POLICY "Users can upload to own restaurant folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-uploads'
    AND (
      -- Check if the name starts with restaurants/{restaurant_id}/ where restaurant_id matches JWT
      name LIKE ('restaurants/' || ((auth.jwt() ->> 'app_metadata')::json ->> 'restaurant_id') || '/%')
      OR
      -- Fallback: check against user's restaurant_id from users table
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND name LIKE ('restaurants/' || users.restaurant_id || '/%')
      )
    )
  );

-- Allow authenticated users to update files in their own restaurant folder
CREATE POLICY "Users can update own restaurant files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'restaurant-uploads'
    AND (
      name LIKE ('restaurants/' || ((auth.jwt() ->> 'app_metadata')::json ->> 'restaurant_id') || '/%')
      OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND name LIKE ('restaurants/' || users.restaurant_id || '/%')
      )
    )
  );

-- Allow authenticated users to delete files from their own restaurant folder
CREATE POLICY "Users can delete own restaurant files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'restaurant-uploads'
    AND (
      name LIKE ('restaurants/' || ((auth.jwt() ->> 'app_metadata')::json ->> 'restaurant_id') || '/%')
      OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND name LIKE ('restaurants/' || users.restaurant_id || '/%')
      )
    )
  );

REVOKE ALL ON storage.objects FROM authenticated;