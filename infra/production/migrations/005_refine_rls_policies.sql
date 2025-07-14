-- ================================================
-- MIGRATION: RLS Policy Refinement for Security Hardening
-- Replace broad "FOR ALL TO authenticated" policies with role-based restrictions
-- ================================================

-- ================================================
-- CATEGORIES TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage categories" ON categories;

-- Create role-based policies
CREATE POLICY "Staff can INSERT categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Staff can UPDATE categories"
  ON categories
  FOR UPDATE
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

CREATE POLICY "Staff can DELETE categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- MENU ITEMS TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage menu_items" ON menu_items;

-- Create role-based policies (chef can also manage menu items)
CREATE POLICY "Staff can INSERT menu_items"
  ON menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  );

CREATE POLICY "Staff can UPDATE menu_items"
  ON menu_items
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  );

CREATE POLICY "Staff can DELETE menu_items"
  ON menu_items
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  );

-- ================================================
-- MENU ITEM SIZES TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage menu_item_sizes" ON menu_item_sizes;

-- Create role-based policies
CREATE POLICY "Staff can INSERT menu_item_sizes"
  ON menu_item_sizes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  );

CREATE POLICY "Staff can UPDATE menu_item_sizes"
  ON menu_item_sizes
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  );

CREATE POLICY "Staff can DELETE menu_item_sizes"
  ON menu_item_sizes
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  );

-- ================================================
-- TOPPINGS TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage toppings" ON toppings;

-- Create role-based policies
CREATE POLICY "Staff can INSERT toppings"
  ON toppings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  );

CREATE POLICY "Staff can UPDATE toppings"
  ON toppings
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  );

CREATE POLICY "Staff can DELETE toppings"
  ON toppings
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'chef')
    )
  );

-- ================================================
-- TABLES TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage tables" ON tables;

-- Create role-based policies
CREATE POLICY "Staff can INSERT tables"
  ON tables
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Staff can UPDATE tables"
  ON tables
  FOR UPDATE
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

CREATE POLICY "Staff can DELETE tables"
  ON tables
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- ORDERS TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage orders" ON orders;

-- Create role-based policies
CREATE POLICY "Staff can INSERT orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'server')
    )
  );

CREATE POLICY "Staff can UPDATE orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'server')
    )
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'server')
    )
  );

CREATE POLICY "Staff can DELETE orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- ORDER ITEMS TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage order_items" ON order_items;

-- Create role-based policies
CREATE POLICY "Staff can INSERT order_items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'server')
    )
  );

CREATE POLICY "Staff can UPDATE order_items"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'server')
    )
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'server')
    )
  );

CREATE POLICY "Staff can DELETE order_items"
  ON order_items
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- REVIEWS TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage reviews" ON reviews;

-- Create role-based policies
CREATE POLICY "Staff can INSERT reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Staff can UPDATE reviews"
  ON reviews
  FOR UPDATE
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

CREATE POLICY "Staff can DELETE reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- FEEDBACK TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage feedback" ON feedback;

-- Create role-based policies
CREATE POLICY "Staff can INSERT feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Staff can UPDATE feedback"
  ON feedback
  FOR UPDATE
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

CREATE POLICY "Staff can DELETE feedback"
  ON feedback
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- INVENTORY ITEMS TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage inventory_items" ON inventory_items;

-- Create role-based policies
CREATE POLICY "Staff can INSERT inventory_items"
  ON inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Staff can UPDATE inventory_items"
  ON inventory_items
  FOR UPDATE
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

CREATE POLICY "Staff can DELETE inventory_items"
  ON inventory_items
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ================================================
-- BOOKINGS TABLE POLICIES - REFINE
-- ================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Staff can manage bookings" ON bookings;

-- Create role-based policies
CREATE POLICY "Staff can INSERT bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'server')
    )
  );

CREATE POLICY "Staff can UPDATE bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'server')
    )
  )
  WITH CHECK (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'server')
    )
  );

CREATE POLICY "Staff can DELETE bookings"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );
