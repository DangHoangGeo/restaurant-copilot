### 9. Smart Reports, Feedback & Planner

9.1. **Daily Snapshot Function & Scheduling**

* In `/infra/functions/generate_daily_snapshot.sql`, create:

  ```sql
  CREATE OR REPLACE FUNCTION public.generate_daily_snapshot()
  RETURNS void AS $$
  DECLARE
    rest RECORD;
    total_sales numeric;
    top_seller uuid;
    orders_count int;
  BEGIN
    FOR rest IN SELECT id FROM restaurants LOOP
      SELECT COALESCE(SUM(total_amount), 0) INTO total_sales
      FROM orders
      WHERE restaurant_id = rest.id AND date(created_at) = current_date;

      SELECT menu_item_id INTO top_seller
      FROM order_items
      JOIN orders ON order_items.order_id = orders.id
      WHERE orders.restaurant_id = rest.id
        AND date(orders.created_at) = current_date
      GROUP BY menu_item_id
      ORDER BY SUM(quantity) DESC
      LIMIT 1;

      SELECT COUNT(*) INTO orders_count
      FROM orders
      WHERE restaurant_id = rest.id AND date(created_at) = current_date;

      INSERT INTO analytics_snapshots (restaurant_id, date, total_sales, top_seller_item, orders_count)
      VALUES (rest.id, current_date, total_sales, top_seller, orders_count);
    END LOOP;
  END;
  $$ LANGUAGE plpgsql;
  ```

  (Req 7.1)
* In Supabase Dashboard → **SQL Editor**, schedule this function daily at midnight using `pg_cron`:

  ```sql
  SELECT cron.schedule('daily_snapshot', '0 0 * * *', $$SELECT public.generate_daily_snapshot();$$);
  ```
* Manually run once and verify that `analytics_snapshots` has a row for each restaurant with today’s date.
  ‣ (Req 7.1)

9.2. **Low-Stock Trigger & Inventory Update**

* In `/infra/migrations/002_inventory_triggers.sql`, add:

  ```sql
  CREATE OR REPLACE FUNCTION adjust_inventory_on_order()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE inventory_items
    SET stock_level = stock_level - NEW.quantity
    WHERE restaurant_id = NEW.restaurant_id AND menu_item_id = NEW.menu_item_id;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_decrement_inventory
    AFTER INSERT ON order_items
    FOR EACH ROW EXECUTE FUNCTION adjust_inventory_on_order();
  ```

  (Req 7.2)
* Test by creating a new order in the web with 2 units of “Ramen.” Check that `inventory_items.stock_level` for that `menu_item_id` drops by 2.
  ‣ (Req 7.2)

9.3. **Recommendations & Next-Week Planner**

* **RPC: get\_top\_sellers\_7days**
  In `/infra/functions/get_top_sellers_7days.sql`:

  ```sql
  CREATE OR REPLACE FUNCTION public.get_top_sellers_7days(p_restaurant uuid, p_limit int)
  RETURNS TABLE(menu_item_id uuid, total_sold int) AS $$
  BEGIN
    RETURN QUERY
    SELECT menu_item_id, SUM(quantity) AS total_sold
    FROM order_items
    JOIN orders ON order_items.order_id = orders.id
    WHERE orders.restaurant_id = p_restaurant
      AND orders.created_at >= now() - interval '7 days'
    GROUP BY menu_item_id
    ORDER BY total_sold DESC
    LIMIT p_limit;
  END;
  $$ LANGUAGE plpgsql;
  ```

  (Req 7.3)
* **RPC: apply\_recommendations**
  In `/infra/functions/apply_recommendations.sql`:

  ```sql
  CREATE OR REPLACE FUNCTION public.apply_recommendations(p_restaurant uuid)
  RETURNS void AS $$
  DECLARE
    rec RECORD;
    featuredCat uuid;
  BEGIN
    SELECT id INTO featuredCat
    FROM categories
    WHERE restaurant_id = p_restaurant AND name = 'Featured'
    LIMIT 1;
    IF NOT FOUND THEN
      INSERT INTO categories (restaurant_id, name, position)
      VALUES (p_restaurant, 'Featured', 0)
      RETURNING id INTO featuredCat;
    END IF;

    DELETE FROM menu_items
    WHERE restaurant_id = p_restaurant AND category_id = featuredCat;

    FOR rec IN SELECT * FROM get_top_sellers_7days(p_restaurant, 3) LOOP
      INSERT INTO menu_items (
        id, restaurant_id, category_id, name_ja, name_en, name_vi,
        description_ja, description_en, description_vi, price, tags,
        available, weekday_visibility
      )
      SELECT id, restaurant_id, featuredCat, name_ja, name_en, name_vi,
             description_ja, description_en, description_vi, price, tags,
             true, ARRAY[1,2,3,4,5,6,7]
      FROM menu_items
      WHERE id = rec.menu_item_id;
    END LOOP;
  END;
  $$ LANGUAGE plpgsql;
  ```

  (Req 7.3)
* **Edge Function: POST /api/v1/recommendations/apply**

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";

  export async function POST(req: NextRequest) {
    const { restaurantId } = await req.json();
    if (!restaurantId) {
      return NextResponse.json({ success: false, error: "Missing restaurantId" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.rpc("apply_recommendations", { p_restaurant: restaurantId });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }
  ```

  (Req 7.3)
* Ensure that after calling this API, the “Featured” category contains the top 3 items.
  ‣ (Req 7.3)

9.4. **Feedback Moderation UI**

* Already implemented in Admin Dashboard (see step 4.6.4).
* Confirm Edge Function `/api/v1/reviews/resolve` exists and simply does:

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";
  import { z } from "zod";

  const resolveSchema = z.object({ reviewId: z.string().uuid() });

  export async function POST(req: NextRequest) {
    const body = await req.json();
    const { success, data, error: parseError } = resolveSchema.safeParse(body);
    if (!success) {
      return NextResponse.json({ success: false, error: parseError.errors }, { status: 400 });
    }
    const { reviewId } = data;
    const { error } = await supabaseAdmin.from("reviews").update({ resolved: true }).eq("id", reviewId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }
  ```

  (Req 7.4)
* Test by marking a review as resolved and verifying in Supabase that `reviews.resolved` is now `true`.
  ‣ (Req 7.4)

---
