-- ================================================
-- PRODUCTION SCHEMAS
-- Coorder.ai Database Schema
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- CORE BUSINESS TABLES
-- ================================================

-- Restaurants table - main tenant entity
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subdomain text UNIQUE NOT NULL,
  default_language text NOT NULL CHECK (default_language IN ('ja','en','vi')),
  logo_url text,
  brand_color text,
  address text,
  phone text,
  email text UNIQUE,
  website text,
  description_en text,
  description_vi text,
  description_ja text,
  opening_hours jsonb,               -- e.g. {"mon": "09:00-21:00", "tue": "09:00-21:00", ...}
  social_links jsonb,                -- e.g. {"facebook": "https://...", "instagram": "https://..."}
  timezone text NOT NULL DEFAULT 'Asia/Tokyo',
  currency text NOT NULL DEFAULT 'JPY',
  payment_methods text[] DEFAULT '{}', -- e.g. ['cash', 'credit_card', 'mobile_payment']
  delivery_options text[] DEFAULT '{}', -- e.g. ['pickup', 'delivery']
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  tax numeric NOT NULL DEFAULT 0.10, -- Default tax rate of 10%
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users table - restaurant staff and owners
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,               -- same as Auth user ID
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  role text NOT NULL CHECK (role IN ('owner','chef','server','cashier','manager')),
  two_factor_secret text,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Menu categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name_ja text NOT NULL,
  name_en text NOT NULL,
  name_vi text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name_ja text NOT NULL,
  name_en text NOT NULL,
  name_vi text NOT NULL,
  code text UNIQUE,
  description_ja text,
  description_en text,
  description_vi text,
  price numeric NOT NULL CHECK (price >= 0),
  tags text[] DEFAULT '{}',
  image_url text,
  stock_level integer DEFAULT 0 CHECK (stock_level >= 0),
  available boolean NOT NULL DEFAULT true,
  weekday_visibility integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7],
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Menu item sizes (S, M, L variants)
CREATE TABLE IF NOT EXISTS menu_item_sizes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  size_key text NOT NULL,                      -- e.g. 'small','medium','large'
  name_ja text NOT NULL,
  name_en text NOT NULL,
  name_vi text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Toppings for menu items
CREATE TABLE IF NOT EXISTS toppings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name_ja text NOT NULL,
  name_en text NOT NULL,
  name_vi text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Restaurant tables
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('available','occupied','reserved')) DEFAULT 'available',
  capacity integer NOT NULL CHECK (capacity > 0),
  is_outdoor boolean DEFAULT false,
  is_accessible boolean DEFAULT false,
  notes text,
  qr_code text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- ORDER MANAGEMENT TABLES
-- ================================================

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_id uuid UNIQUE NOT NULL,
  guest_count integer NOT NULL DEFAULT 1 CHECK (guest_count > 0),
  status text NOT NULL CHECK (status IN ('new','serving','completed', 'canceled')) DEFAULT 'new',
  total_amount numeric CHECK (total_amount >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items with enhanced topping and sizing support
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  menu_item_size_id uuid REFERENCES menu_item_sizes(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  status text NOT NULL CHECK (status IN ('new','preparing','ready','served','cancelled')) DEFAULT 'new',
  topping_ids uuid[] DEFAULT '{}',  -- Array of topping IDs
  price_at_order numeric NOT NULL, -- Store the calculated price at time of order
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- STAFF MANAGEMENT TABLES
-- ================================================

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('chef','server','cashier','manager')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Employee schedules
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, employee_id, work_date)
);

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  check_in_time timestamptz,
  check_out_time timestamptz,
  hours_worked numeric,
  status text CHECK (status IN ('recorded','checked')) NOT NULL DEFAULT 'recorded',
  verified_by uuid REFERENCES users(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, work_date)
);

-- ================================================
-- CUSTOMER FEEDBACK TABLES
-- ================================================

-- Menu item reviews
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

-- General feedback
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- BUSINESS INTELLIGENCE TABLES
-- ================================================

-- Inventory management
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  stock_level integer DEFAULT 0 CHECK (stock_level >= 0),
  threshold integer DEFAULT 5 CHECK (threshold >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Analytics snapshots
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

-- Reservation system
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

-- ================================================
-- LOGGING & AUDIT TABLES
-- ================================================

-- Chat logs for AI interactions
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

-- System logs
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

-- Audit logs for compliance
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

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_restaurant_role ON users (restaurant_id, role);

-- Category indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_restaurant_position ON categories (restaurant_id, position);

-- Menu item indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_category ON menu_items (restaurant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available ON menu_items (restaurant_id, available);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_code ON menu_items (category_id, code);

-- Menu item sizes indexes
CREATE INDEX IF NOT EXISTS idx_menu_item_sizes_item_size ON menu_item_sizes (menu_item_id, size_key);
CREATE INDEX IF NOT EXISTS idx_menu_item_sizes_restaurant_item ON menu_item_sizes (restaurant_id, menu_item_id);

-- Toppings indexes
CREATE INDEX IF NOT EXISTS idx_toppings_restaurant_position ON toppings (restaurant_id, position);
CREATE INDEX IF NOT EXISTS idx_toppings_menu_item ON toppings (menu_item_id);

-- Table indexes
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables (restaurant_id);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders (restaurant_id, status);

-- Order item indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant_status ON order_items (restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_status ON order_items (order_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_size ON order_items (menu_item_size_id);
CREATE INDEX IF NOT EXISTS idx_order_items_topping_ids ON order_items USING GIN (topping_ids);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant_price ON order_items (restaurant_id, price_at_order);

-- Employee indexes
CREATE INDEX IF NOT EXISTS idx_employees_restaurant_role ON employees (restaurant_id, role);

-- Schedule indexes
CREATE INDEX IF NOT EXISTS idx_schedules_employee_date ON schedules (employee_id, work_date);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records (employee_id, work_date);

-- Review indexes
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_menu_item ON reviews (restaurant_id, menu_item_id);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_restaurant ON feedback (restaurant_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_restaurant_stock ON inventory_items (restaurant_id, stock_level);

-- Analytics indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_restaurant_date ON analytics_snapshots (restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_restaurant_date_range ON analytics_snapshots (restaurant_id, date);

-- Booking indexes
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_date ON bookings (restaurant_id, booking_date);

-- Chat log indexes
CREATE INDEX IF NOT EXISTS idx_chat_logs_restaurant_created ON chat_logs (restaurant_id, created_at);

-- System log indexes
CREATE INDEX IF NOT EXISTS idx_logs_restaurant_created ON logs (restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_logs_user_created ON logs (user_id, created_at);

-- ================================================
-- ROW LEVEL SECURITY ENABLEMENT
-- ================================================

-- Enable RLS for all tenant-scoped tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
