## 2. Database Schema & RLS
### Table Structures
1. **restaurants**

   * `id uuid PK default uuid_generate_v4()`
   * `name text not null`
   * `subdomain text unique not null`
   * `logo_url text`
   * `brand_color text`
   * `default_language text not null default 'ja'`
   * `created_at timestamptz default now()`
   * `updated_at timestamptz default now()`

2. **users**

   * `id uuid PK default uuid_generate_v4()`
   * `restaurant_id uuid not null references restaurants(id) on delete cascade`
   * `email text unique not null`
   * `role text not null check (role in ('owner','manager','staff')) default 'staff'`
   * `name text not null`
   * `created_at timestamptz default now()`
   * `updated_at timestamptz default now()`
   * **Index**: `(restaurant_id, role)`

3. **categories**

   * `id uuid PK default uuid_generate_v4()`
   * `restaurant_id uuid not null references restaurants(id) on delete cascade`
   * `name text not null`
   * `position integer default 0`
   * `created_at timestamptz default now()`
   * `updated_at timestamptz default now()`
   * **Composite PK/Index**: `(restaurant_id, position)`

4. **menu\_items**

   * `id uuid PK default uuid_generate_v4()`
   * `restaurant_id uuid not null references restaurants(id) on delete cascade`
   * `category_id uuid not null references categories(id) on delete cascade`
   * `name_ja text not null`
   * `name_en text not null`
   * `name_vi text not null`
   * `description_ja text`
   * `description_en text`
   * `description_vi text`
   * `image_url text`
   * `price numeric not null check (price >= 0)`
   * `tags text[] default array[]::text[]`
   * `available boolean default true`
   * `weekday_visibility int[] default array[1,2,3,4,5,6,7]::int[]`
   * `created_at timestamptz default now()`
   * `updated_at timestamptz default now()`
   * **Index**: `(restaurant_id, category_id)` and `(restaurant_id, available)`

5. **tables**

   * `id uuid PK default uuid_generate_v4()`
   * `restaurant_id uuid not null references restaurants(id) on delete cascade`
   * `name text not null`
   * `qr_code text not null unique`
   * `position_x integer`
   * `position_y integer`
   * `created_at timestamptz default now()`
   * `updated_at timestamptz default now()`
   * **Index**: `(restaurant_id)`

6. **employees**

   * `id uuid PK default uuid_generate_v4()`
   * `restaurant_id uuid not null references restaurants(id) on delete cascade`
   * `user_id uuid not null references users(id) on delete cascade`
   * `role text not null check (role in ('chef','server','cashier','manager'))`
   * `created_at timestamptz default now()`
   * `updated_at timestamptz default now()`
   * **Index**: `(restaurant_id, role)`

7. **schedules**

   * `id uuid PK default uuid_generate_v4()`
   * `employee_id uuid not null references employees(id) on delete cascade`
   * `weekday int check (weekday between 1 and 7)`
   * `start_time time not null`
   * `end_time time not null`
   * `created_at timestamptz default now()`
   * `updated_at timestamptz default now()`
   * **Index**: `(employee_id, weekday)`

8. **orders**

   * `id uuid PK default uuid_generate_v4()`
   * `restaurant_id uuid not null references restaurants(id) on delete cascade`
   * `table_id uuid not null references tables(id) on delete cascade`
   * `session_id uuid not null unique`
   * `status text not null check (status in ('new','preparing','ready','completed')) default 'new'`
   * `total_amount numeric check (total_amount >= 0)`
   * `created_at timestamptz default now()`
   * `updated_at timestamptz default now()`
   * **Index**: `(restaurant_id, status)`

9. **order\_items**

   * `id uuid PK default uuid_generate_v4()`
   * `order_id uuid not null references orders(id) on delete cascade`
   * `menu_item_id uuid not null references menu_items(id) on delete cascade`
   * `quantity integer not null check (quantity > 0)`
   * `notes text`
   * `created_at timestamptz default now()`
   * `updated_at timestamptz default now()`
   * **Index**: `(order_id)`

10. **reviews**

    * `id uuid PK default uuid_generate_v4()`
    * `restaurant_id uuid not null references restaurants(id) on delete cascade`
    * `menu_item_id uuid not null references menu_items(id) on delete cascade`
    * `user_id uuid references users(id)`
    * `rating smallint not null check (rating between 1 and 5)`
    * `comment text`
    * `resolved boolean default false`
    * `created_at timestamptz default now()`
    * `updated_at timestamptz default now()`
    * **Index**: `(restaurant_id, menu_item_id)`

11. **feedback**

    * `id uuid PK default uuid_generate_v4()`
    * `restaurant_id uuid not null references restaurants(id) on delete cascade`
    * `order_id uuid not null references orders(id) on delete cascade`
    * `user_id uuid references users(id)`
    * `comments text`
    * `created_at timestamptz default now()`
    * `updated_at timestamptz default now()`
    * **Index**: `(restaurant_id)`

12. **inventory\_items**

    * `id uuid PK default uuid_generate_v4()`
    * `restaurant_id uuid not null references restaurants(id) on delete cascade`
    * `menu_item_id uuid references menu_items(id) on delete cascade`
    * `stock_level integer default 0 check (stock_level >= 0)`
    * `threshold integer default 5 check (threshold >= 0)`
    * `created_at timestamptz default now()`
    * `updated_at timestamptz default now()`
    * **Index**: `(restaurant_id, stock_level)`

13. **analytics\_snapshots**

    * `id uuid PK default uuid_generate_v4()`
    * `restaurant_id uuid not null references restaurants(id) on delete cascade`
    * `date date not null`
    * `total_sales numeric default 0`
    * `top_seller_item uuid references menu_items(id)`
    * `orders_count integer default 0`
    * `created_at timestamptz default now()`
    * `updated_at timestamptz default now()`
    * **Unique Constraint**: `(restaurant_id, date)`
    * **Index**: `(restaurant_id, date)`

14. **chat\_logs**

    * `id uuid PK default uuid_generate_v4()`
    * `restaurant_id uuid not null references restaurants(id) on delete cascade`
    * `user_id uuid references users(id)`
    * `user_language text not null check (user_language in ('ja','en','vi'))`
    * `prompt_text text not null`
    * `prompt_token_count integer`
    * `response_token_count integer`
    * `created_at timestamptz default now()`
    * **Index**: `(restaurant_id, created_at)`

15. **audit\_logs**

    * `id uuid PK default uuid_generate_v4()`
    * `restaurant_id uuid not null references restaurants(id) on delete cascade`
    * `user_id uuid references users(id)`
    * `action text not null`
    * `table_name text not null`
    * `record_id uuid`
    * `changes jsonb`
    * `ip_address inet`
    * `created_at timestamptz default now()`
    * **Index**: `(restaurant_id, created_at)`

16. **bookings**

	* `id uuid PRIMARY KEY DEFAULT uuid_generate_v4()`
	* `restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE`
	* `table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE`
	* `customer_name text NOT NULL`
	* `customer_contact text NOT NULL`
	* `booking_date date NOT NULL`
	* `booking_time time NOT NULL`
	* `party_size integer NOT NULL CHECK (party_size > 0)`
	* `preorder_items jsonb DEFAULT '[]'`
	* `status text NOT NULL CHECK (status IN ('pending','confirmed','canceled')) DEFAULT 'pending'`
	* `created_at timestamptz DEFAULT now()`
	* `updated_at timestamptz DEFAULT now()`
	* **Index**: `(restaurant_id, booking_date)`

> **Indexes & Constraints**: Add commonly queried columns—such as `(restaurant_id, status)` on orders; `(restaurant_id, available)` on `menu_items`; `(restaurant_id, stock_level)` on `inventory_items`—to speed up queries.
>
> **Audit Columns**: Each table has `created_at` and `updated_at` for consistency and potential soft-delete implementation.


### 2.1. **Enable UUID Extension & Create Core Tables**

* In `/infra/migrations/001_init.sql`, add at the top:

  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```
* Define tenant-scoped tables (all with `restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE`), for example:

  ```sql
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

  CREATE TABLE IF NOT EXISTS categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name text NOT NULL,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

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

  CREATE TABLE IF NOT EXISTS employees (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('chef','server','cashier','manager')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

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
  ```

  (Req 2.1)
* Continue defining `orders`, `order_items`, `reviews`, `feedback`, `inventory_items`, `analytics_snapshots`, `chat_logs`, `audit_logs` in the same file. Each must include `restaurant_id uuid NOT NULL REFERENCES restaurants(id)`.
* For example, `orders` and `order_items`:

  ```sql
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
  CREATE INDEX ON order_items (restaurant_id, menu_item_id);
  ```

  (Req 2.1)

### 2.2. **Create Booking Table**

* Still in `/infra/migrations/001_init.sql`, append:

  ```sql
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
  ```

  (Req 2.2)

### 2.3. **Define Remaining Tables & Indexes**

* Continue adding:

  ```sql
  CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment text,
    resolved boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
  );
  CREATE INDEX ON reviews (restaurant_id, menu_item_id);

  CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id),
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    stock_level integer NOT NULL DEFAULT 0,
    threshold integer NOT NULL DEFAULT 5,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  CREATE INDEX ON inventory_items (restaurant_id, stock_level);

  CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    date date NOT NULL,
    total_sales numeric NOT NULL,
    top_seller_item uuid,
    orders_count integer NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  CREATE INDEX ON analytics_snapshots (restaurant_id, date);

  CREATE TABLE IF NOT EXISTS chat_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_language text NOT NULL CHECK (user_language IN ('ja','en','vi')),
    prompt_text text NOT NULL,
    prompt_token_count integer,
    response_token_count integer,
    created_at timestamptz DEFAULT now()
  );
  ```

  (Req 2.1)

### 2.4. **Enable Row-Level Security (RLS) & Policies**

* For each tenant-scoped table (`categories`, `menu_items`, `tables`, `employees`, `schedules`, `orders`, `order_items`, `reviews`, `feedback`, `inventory_items`, `analytics_snapshots`, `chat_logs`, `bookings`), execute:

  ```sql
  ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
  ```
* Create RLS policies for each. Example for `menu_items`:

  ```sql
  CREATE POLICY "Tenant can SELECT menu_items"
    ON menu_items
    FOR SELECT
    USING (restaurant_id = auth.jwt() ->> 'restaurant_id');

  CREATE POLICY "Tenant can INSERT menu_items"
    ON menu_items
    FOR INSERT
    WITH CHECK (restaurant_id = auth.jwt() ->> 'restaurant_id');

  CREATE POLICY "Tenant can UPDATE menu_items"
    ON menu_items
    FOR UPDATE
    USING (restaurant_id = auth.jwt() ->> 'restaurant_id')
    WITH CHECK (restaurant_id = auth.jwt() ->> 'restaurant_id');

  CREATE POLICY "Tenant can DELETE menu_items"
    ON menu_items
    FOR DELETE
    USING (restaurant_id = auth.jwt() ->> 'restaurant_id');
  ```

  Repeat for every tenant table, substituting the table name.
  (Req 2.4)
* For `storage.objects`, run:

  ```sql
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
  ```

  (Req 2.4)

### 2.5. **Create Storage Bucket & Verify RLS**

* In Supabase Dashboard → **Storage → Create bucket** named `restaurant-uploads`.
  (Req 2.5)
* Ensure that RLS policies from step 2.4 restrict all reads/inserts to paths prefixed by `restaurants/{restaurant_id}/…`.
* Test by obtaining a JWT for Restaurant A and trying to read or write `restaurant-uploads/restaurants/{Restaurant_B_ID}/…`; it should be denied.
  ‣ (Req 2.5)

### 2.6. **Create Audit Logging Triggers & RLS on `audit_logs`**

* In `/infra/migrations/002_audit_logs.sql`, define:

  ```sql
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
  ```
* Attach triggers on critical tables:

  ```sql
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
  ```
* Enable RLS on `audit_logs` and create a policy:

  ```sql
  ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Restrict audit logs"
    ON audit_logs
    FOR SELECT
    USING (restaurant_id = auth.jwt() ->> 'restaurant_id');
  REVOKE ALL ON audit_logs FROM authenticated;
  ```

  (Req 2.6)

---