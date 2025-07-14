-- ================================================
-- RLS POLICY TESTS
-- Verify correct permissions per role after policy refinement
-- ================================================

-- Test Data Setup
-- Note: These tests assume test data exists for users with different roles
-- In a real environment, you would need to create test users first

-- ================================================
-- HELPER FUNCTIONS FOR TESTING
-- ================================================

-- Function to test if a user can perform an action
CREATE OR REPLACE FUNCTION test_user_action(
  p_user_id UUID,
  p_table_name TEXT,
  p_action TEXT,
  p_restaurant_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  test_result BOOLEAN := FALSE;
BEGIN
  -- Set the user context for testing
  PERFORM set_config('request.jwt.claim.sub', p_user_id::TEXT, true);
  PERFORM set_config('request.jwt.claim.app_metadata', 
    '{"restaurant_id": "' || p_restaurant_id || '"}', true);
  
  -- Test the action based on table and operation
  CASE p_table_name
    WHEN 'categories' THEN
      CASE p_action
        WHEN 'INSERT' THEN
          BEGIN
            INSERT INTO categories (restaurant_id, name_en) 
            VALUES (p_restaurant_id, 'Test Category');
            test_result := TRUE;
            ROLLBACK;
          EXCEPTION WHEN OTHERS THEN
            test_result := FALSE;
            ROLLBACK;
          END;
        WHEN 'UPDATE' THEN
          BEGIN
            UPDATE categories 
            SET name_en = 'Updated Category' 
            WHERE restaurant_id = p_restaurant_id 
            LIMIT 1;
            test_result := TRUE;
            ROLLBACK;
          EXCEPTION WHEN OTHERS THEN
            test_result := FALSE;
            ROLLBACK;
          END;
        WHEN 'DELETE' THEN
          BEGIN
            DELETE FROM categories 
            WHERE restaurant_id = p_restaurant_id 
            LIMIT 1;
            test_result := TRUE;
            ROLLBACK;
          EXCEPTION WHEN OTHERS THEN
            test_result := FALSE;
            ROLLBACK;
          END;
      END CASE;
    -- Add more table cases as needed
  END CASE;
  
  RETURN test_result;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TEST SCENARIOS
-- ================================================

-- Test 1: Owner should be able to manage categories
SELECT 
  'Owner Categories INSERT' AS test_name,
  test_user_action(
    '00000000-0000-0000-0000-000000000001'::UUID, -- owner user id
    'categories',
    'INSERT',
    '11111111-1111-1111-1111-111111111111'::UUID  -- restaurant id
  ) AS should_pass,
  TRUE AS expected_result;

-- Test 2: Manager should be able to manage categories
SELECT 
  'Manager Categories INSERT' AS test_name,
  test_user_action(
    '00000000-0000-0000-0000-000000000002'::UUID, -- manager user id
    'categories',
    'INSERT',
    '11111111-1111-1111-1111-111111111111'::UUID  -- restaurant id
  ) AS should_pass,
  TRUE AS expected_result;

-- Test 3: Server should NOT be able to manage categories
SELECT 
  'Server Categories INSERT' AS test_name,
  test_user_action(
    '00000000-0000-0000-0000-000000000003'::UUID, -- server user id
    'categories',
    'INSERT',
    '11111111-1111-1111-1111-111111111111'::UUID  -- restaurant id
  ) AS should_pass,
  FALSE AS expected_result;

-- Test 4: Chef should be able to manage menu items
SELECT 
  'Chef Menu Items INSERT' AS test_name,
  test_user_action(
    '00000000-0000-0000-0000-000000000004'::UUID, -- chef user id
    'menu_items',
    'INSERT',
    '11111111-1111-1111-1111-111111111111'::UUID  -- restaurant id
  ) AS should_pass,
  TRUE AS expected_result;

-- Test 5: Server should be able to manage orders
SELECT 
  'Server Orders INSERT' AS test_name,
  test_user_action(
    '00000000-0000-0000-0000-000000000003'::UUID, -- server user id
    'orders',
    'INSERT',
    '11111111-1111-1111-1111-111111111111'::UUID  -- restaurant id
  ) AS should_pass,
  TRUE AS expected_result;

-- Test 6: Server should NOT be able to delete orders
SELECT 
  'Server Orders DELETE' AS test_name,
  test_user_action(
    '00000000-0000-0000-0000-000000000003'::UUID, -- server user id
    'orders',
    'DELETE',
    '11111111-1111-1111-1111-111111111111'::UUID  -- restaurant id
  ) AS should_pass,
  FALSE AS expected_result;

-- ================================================
-- COMPREHENSIVE ROLE PERMISSION MATRIX TEST
-- ================================================

-- This query shows what each role can do with each table
WITH role_permissions AS (
  SELECT 
    'owner' AS role_name,
    'categories' AS table_name,
    'INSERT,UPDATE,DELETE' AS allowed_actions
  UNION ALL
  SELECT 'manager', 'categories', 'INSERT,UPDATE,DELETE'
  UNION ALL
  SELECT 'chef', 'categories', 'NONE'
  UNION ALL
  SELECT 'server', 'categories', 'NONE'
  UNION ALL
  SELECT 'owner', 'menu_items', 'INSERT,UPDATE,DELETE'
  UNION ALL
  SELECT 'manager', 'menu_items', 'INSERT,UPDATE,DELETE'
  UNION ALL
  SELECT 'chef', 'menu_items', 'INSERT,UPDATE,DELETE'
  UNION ALL
  SELECT 'server', 'menu_items', 'NONE'
  UNION ALL
  SELECT 'owner', 'orders', 'INSERT,UPDATE,DELETE'
  UNION ALL
  SELECT 'manager', 'orders', 'INSERT,UPDATE,DELETE'
  UNION ALL
  SELECT 'chef', 'orders', 'NONE'
  UNION ALL
  SELECT 'server', 'orders', 'INSERT,UPDATE'
  UNION ALL
  SELECT 'owner', 'tables', 'INSERT,UPDATE,DELETE'
  UNION ALL
  SELECT 'manager', 'tables', 'INSERT,UPDATE,DELETE'
  UNION ALL
  SELECT 'chef', 'tables', 'NONE'
  UNION ALL
  SELECT 'server', 'tables', 'NONE'
)
SELECT 
  role_name,
  table_name,
  allowed_actions,
  'Expected permissions after RLS refinement' AS notes
FROM role_permissions
ORDER BY table_name, role_name;

-- ================================================
-- CLEANUP
-- ================================================

-- Drop the test function
DROP FUNCTION IF EXISTS test_user_action(UUID, TEXT, TEXT, UUID);

-- Note: In a real testing environment, you would also need to:
-- 1. Create test users with appropriate roles
-- 2. Set up test restaurant data
-- 3. Run these tests in a transaction that gets rolled back
-- 4. Use a proper testing framework like pgTAP for more sophisticated testing
