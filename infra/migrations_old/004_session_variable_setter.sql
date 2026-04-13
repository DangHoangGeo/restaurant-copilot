-- File: infra/migrations/004_session_variable_setter.sql

DROP POLICY IF EXISTS "Tenant can SELECT categories" ON categories;
CREATE POLICY "Authenticated user can SELECT categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Anonymous can SELECT categories"
  ON categories
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);


DROP POLICY IF EXISTS "Tenant can SELECT menu_items" ON menu_items;
CREATE POLICY "Authenticated user can SELECT menu_items"
  ON menu_items
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Anonymous can SELECT menu_items"
  ON menu_items
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);


DROP POLICY IF EXISTS "Tenant can SELECT tables" ON tables;
CREATE POLICY "Authenticated user can SELECT tables"
  ON tables
  FOR SELECT
  TO authenticated
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Anonymous can SELECT tables"
  ON tables
  FOR SELECT
  TO anon
  USING (restaurant_id = current_setting('app.current_restaurant_id', true)::uuid);

-- Function to set the current restaurant ID for the session
CREATE OR REPLACE FUNCTION set_current_restaurant_id_for_session(restaurant_id_value uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.current_restaurant_id', restaurant_id_value::text, false);
EXCEPTION
  WHEN OTHERS THEN
    -- Optionally, log the error or raise a notice
    RAISE NOTICE 'Error setting app.current_restaurant_id: %', SQLERRM;
    -- Depending on your requirements, you might want to re-raise the exception
    -- or handle it in a way that doesn't disrupt the session if the variable is optional.
END;
$$;

-- Grant execute permission to the anon and authenticated roles
GRANT EXECUTE ON FUNCTION set_current_restaurant_id_for_session(uuid) TO anon;
GRANT EXECUTE ON FUNCTION set_current_restaurant_id_for_session(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION set_current_restaurant_id_for_session(restaurant_id_value uuid)
RETURNS void AS $$
BEGIN
  -- The 'true' in the third argument of set_config makes the setting local to the current session/transaction.
  PERFORM set_config('app.current_restaurant_id', restaurant_id_value::text, true);
END;
$$ LANGUAGE plpgsql VOLATILE;
