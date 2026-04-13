CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid REFERENCES restaurants(id),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  changes jsonb NOT NULL,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Function to log changes
CREATE OR REPLACE FUNCTION public.log_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    restaurant_id,
    user_id,
    action,
    table_name,
    record_id,
    changes,
    ip_address
  )
  VALUES (
    COALESCE(NEW.restaurant_id, OLD.restaurant_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
    current_setting('request.ip', true)::inet
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers on critical tables
CREATE TRIGGER trg_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_menu_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_inventory_audit
  AFTER INSERT OR UPDATE OR DELETE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER trg_bookings_audit
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Enable RLS on audit_logs and create a policy
DROP POLICY IF EXISTS "Restrict audit logs" ON audit_logs; -- Drop existing first
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restrict audit logs"
  ON audit_logs
  FOR SELECT
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

DROP POLICY IF EXISTS "Tenant can INSERT audit logs" ON audit_logs; -- Drop existing first
CREATE POLICY "Tenant can INSERT audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

DROP POLICY IF EXISTS "Tenant can UPDATE audit logs" ON audit_logs;
CREATE POLICY "Tenant can UPDATE audit logs"
  ON audit_logs
  FOR UPDATE
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'))
  WITH CHECK (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

REVOKE ALL ON audit_logs FROM authenticated;
GRANT INSERT, SELECT, UPDATE ON audit_logs TO authenticated; -- Grant specific necessary privileges
