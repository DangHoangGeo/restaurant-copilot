-- Table for topping items
-- TODO: update customer order flow to allow multiple toppings per item
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
CREATE INDEX ON toppings (restaurant_id, position);

CREATE TABLE IF NOT EXISTS menu_item_sizes (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id      uuid        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  size_key          text        NOT NULL,                      -- e.g. 'small','medium','large'
  name_ja           text        NOT NULL,
  name_en           text        NOT NULL,
  name_vi           text        NOT NULL,
  price             numeric     NOT NULL CHECK (price >= 0),
  position          integer     NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
CREATE INDEX ON menu_item_sizes (menu_item_id, size_key);
CREATE INDEX ON menu_item_sizes (restaurant_id, menu_item_id);

-- allow RLS
ALTER TABLE menu_item_sizes ENABLE ROW LEVEL SECURITY;
-- Enable RLS policies for menu_item_sizes
CREATE POLICY menu_item_sizes_policy ON menu_item_sizes
  FOR ALL
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));

-- Enable RLS policies for toppings
ALTER TABLE toppings ENABLE ROW LEVEL SECURITY;
CREATE POLICY toppings_policy ON toppings
  FOR ALL
  USING (restaurant_id::text = (auth.jwt() -> 'app_metadata' ->> 'restaurant_id'));
-- then copy your menu_items policies, replacing table names → menu_item_sizes

-- link your orders to a chosen size
ALTER TABLE order_items
  ADD COLUMN menu_item_size_id uuid REFERENCES menu_item_sizes(id);
CREATE INDEX ON order_items(menu_item_size_id);

-- link your orders to a chosen topping
ALTER TABLE order_items
  ADD COLUMN topping_id uuid REFERENCES toppings(id);
CREATE INDEX ON order_items(topping_id);