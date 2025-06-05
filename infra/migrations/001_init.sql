CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subdomain text UNIQUE NOT NULL,
  default_language text NOT NULL CHECK (default_language IN ('ja','en','vi')),
  logo_url text,
  brand_color text,
  contact_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,               -- same as Auth user ID
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  role text NOT NULL CHECK (role IN ('owner','chef','server','cashier','manager')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON users (restaurant_id, role);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX ON categories (restaurant_id, position);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name_ja text NOT NULL,
  name_en text NOT NULL,
  name_vi text NOT NULL,
  description_ja text,
  description_en text,
  description_vi text,
  price numeric NOT NULL CHECK (price >= 0),
  tags text[] DEFAULT '{}',
  image_url text,
  available boolean NOT NULL DEFAULT true,
  weekday_visibility integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7],
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON menu_items (restaurant_id, category_id);
CREATE INDEX ON menu_items (restaurant_id, available);

CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  position_x integer,
  position_y integer,
  qr_code text UNIQUE,               -- optional, or derived on the fly
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON tables (restaurant_id);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('chef','server','cashier','manager')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON employees (restaurant_id, role);

CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  weekday integer NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON schedules (employee_id, weekday);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_id uuid UNIQUE NOT NULL,
  status text NOT NULL CHECK (status IN ('new','preparing','ready','completed')) DEFAULT 'new',
  total_amount numeric CHECK (total_amount >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON orders (restaurant_id, status);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON order_items (order_id);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON reviews (restaurant_id, menu_item_id);

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON feedback (restaurant_id);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  stock_level integer DEFAULT 0 CHECK (stock_level >= 0),
  threshold integer DEFAULT 5 CHECK (threshold >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON inventory_items (restaurant_id, stock_level);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_sales numeric DEFAULT 0,
  top_seller_item uuid references menu_items(id),
  orders_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX analytics_snapshots_restaurant_id_date_key ON analytics_snapshots (restaurant_id, date);
CREATE INDEX ON analytics_snapshots (restaurant_id, date);

CREATE TABLE IF NOT EXISTS chat_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid references users(id),
  user_language text NOT NULL check (user_language in ('ja','en','vi')),
  prompt_text text NOT NULL,
  prompt_token_count integer,
  response_token_count integer,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON chat_logs (restaurant_id, created_at);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_contact text NOT NULL,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  party_size integer NOT NULL CHECK (party_size > 0),
  preorder_items jsonb DEFAULT '[]',
  status text NOT NULL CHECK (status IN ('pending','confirmed','canceled')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON bookings (restaurant_id, booking_date);

CREATE TABLE IF NOT EXISTS logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid REFERENCES restaurants(id),
    user_id uuid REFERENCES users(id),
    level text CHECK (level IN ('INFO','WARN','ERROR','DEBUG')),
    endpoint text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX ON logs (restaurant_id, created_at);
CREATE INDEX ON logs (user_id, created_at);

-- Enable RLS for tenant-scoped tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY; -- Users table also needs RLS

-- RLS Policies for categories
CREATE POLICY "Tenant can SELECT categories"
  ON categories
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT categories"
  ON categories
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE categories"
  ON categories
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE categories"
  ON categories
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for menu_items
CREATE POLICY "Tenant can SELECT menu_items"
  ON menu_items
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT menu_items"
  ON menu_items
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE menu_items"
  ON menu_items
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE menu_items"
  ON menu_items
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for tables
CREATE POLICY "Tenant can SELECT tables"
  ON tables
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT tables"
  ON tables
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE tables"
  ON tables
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE tables"
  ON tables
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for employees
CREATE POLICY "Tenant can SELECT employees"
  ON employees
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT employees"
  ON employees
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE employees"
  ON employees
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE employees"
  ON employees
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for schedules
CREATE POLICY "Tenant can SELECT schedules"
  ON schedules
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT schedules"
  ON schedules
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE schedules"
  ON schedules
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE schedules"
  ON schedules
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for orders
CREATE POLICY "Tenant can SELECT orders"
  ON orders
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT orders"
  ON orders
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE orders"
  ON orders
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE orders"
  ON orders
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for order_items
CREATE POLICY "Tenant can SELECT order_items"
  ON order_items
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT order_items"
  ON order_items
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE order_items"
  ON order_items
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE order_items"
  ON order_items
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for reviews
CREATE POLICY "Tenant can SELECT reviews"
  ON reviews
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT reviews"
  ON reviews
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE reviews"
  ON reviews
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE reviews"
  ON reviews
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for feedback
CREATE POLICY "Tenant can SELECT feedback"
  ON feedback
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT feedback"
  ON feedback
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE feedback"
  ON feedback
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE feedback"
  ON feedback
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for inventory_items
CREATE POLICY "Tenant can SELECT inventory_items"
  ON inventory_items
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT inventory_items"
  ON inventory_items
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE inventory_items"
  ON inventory_items
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE inventory_items"
  ON inventory_items
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for analytics_snapshots
CREATE POLICY "Tenant can SELECT analytics_snapshots"
  ON analytics_snapshots
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT analytics_snapshots"
  ON analytics_snapshots
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE analytics_snapshots"
  ON analytics_snapshots
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE analytics_snapshots"
  ON analytics_snapshots
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for chat_logs
CREATE POLICY "Tenant can SELECT chat_logs"
  ON chat_logs
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT chat_logs"
  ON chat_logs
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE chat_logs"
  ON chat_logs
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE chat_logs"
  ON chat_logs
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for bookings
CREATE POLICY "Tenant can SELECT bookings"
  ON bookings
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can INSERT bookings"
  ON bookings
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE bookings"
  ON bookings
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE bookings"
  ON bookings
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for users
CREATE POLICY "Tenant can SELECT users"
  ON users
  FOR SELECT
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');
  
CREATE POLICY "User can select self"
  ON users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Tenant can INSERT users"
  ON users
  FOR INSERT
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can UPDATE users"
  ON users
  FOR UPDATE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id')
  WITH CHECK (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

CREATE POLICY "Tenant can DELETE users"
  ON users
  FOR DELETE
  USING (restaurant_id::text = auth.jwt() ->> 'restaurant_id');

-- RLS Policies for storage.objects 
-- Cannot implement RLS on storage.objects directly, but we can restrict access via policies
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restrict read to own tenant"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'restaurant-uploads'
    AND substring(path from 1 for length(auth.jwt() ->> 'restaurant_id')) = auth.jwt() ->> 'restaurant_id'
  );

CREATE POLICY "Restrict insert to own tenant"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-uploads'
    AND substring(path from 1 for length(auth.jwt() ->> 'restaurant_id')) = auth.jwt() ->> 'restaurant_id'
  );
REVOKE ALL ON storage.objects FROM authenticated;
