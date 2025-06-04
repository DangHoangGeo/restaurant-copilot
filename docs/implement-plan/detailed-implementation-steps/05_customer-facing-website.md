### 5. Customer-Facing Website (Web)

5.1. **Locale-Aware Routing & Common Layout**

* Under `/web/app/[locale]/customer/layout.tsx`: wrap pages in a header/footer and include a `<LanguageSwitcher>`. Use `useRestaurantContext()` to read `restaurantSubdomain` from `searchParams`.

  ```tsx
  export default function CustomerLayout({ children, params }) {
    const { restaurantSubdomain, locale } = useRestaurantContext();
    const t = useTranslations("CUSTOMER_LAYOUT");
    return (
      <div className="flex flex-col min-h-screen">
        <header>…</header>
        <main>{children}</main>
        <footer>© {new Date().getFullYear()} Shop-Copilot</footer>
      </div>
    );
  }
  ```

  (Req 5.1)
* `<LanguageSwitcher>` toggles `?locale=ja/en/vi` while preserving the path and `sessionId` or other query params.
  ‣ (Req 5.1)

5.2. **Session Creation via QR Scan API**

* Create Edge Function at `/web/app/api/v1/sessions/create.ts`:

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";
  import { randomUUID } from "crypto";

  export async function GET(req: NextRequest) {
    const tableId = req.nextUrl.searchParams.get("tableId");
    const restaurantId = await getCurrentRestaurantId(req);
    // Verify table belongs to restaurant
    const { data: table } = await supabaseAdmin
      .from("tables")
      .select("id")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .single();
    if (!table) return NextResponse.json({ error: "Invalid table" }, { status: 404 });
    const sessionId = randomUUID();
    await supabaseAdmin.from("orders").insert([{ 
      restaurant_id: restaurantId, table_id: table.id, session_id: sessionId, status: "new" 
    }]);
    return NextResponse.json({ sessionId });
  }
  ```

  (Req 5.2)
* When a customer scans the QR code, the web browser opens a URL like:

  ```
  https://{restaurantSubdomain}.shop-copilot.com/{locale}/customer/order?tableId={tableId}
  ```
* That page’s server component calls this API (`GET /api/v1/sessions/create?tableId={tableId}`) and then redirects or sets a cookie with the returned `sessionId`.
  ‣ (Req 5.2)

5.3. **Order Page Rendering & Validation**

* `/web/app/[locale]/customer/order/page.tsx` (Server Component) receives `sessionId` from `searchParams`. Steps:

  1. `const { data: orderRow } = await supabaseAdmin.from("orders").select("status").eq("session_id", sessionId).eq("restaurant_id", restaurantId).single();`
  2. If no `orderRow` or `orderRow.status !== "new"`, render `<SessionExpired />`.
  3. Otherwise, fetch categories and menu items:

     ```ts
     const todayWeekday = (new Date().getDay() === 0 ? 7 : new Date().getDay());
     const { data: categories } = await supabaseAdmin
       .from("categories")
       .select(`id,name,menu_items(id,name_${locale},description_${locale},price,image_url,available,weekday_visibility)`)
       .eq("restaurant_id", restaurantId)
       .order("position");
     ```
  4. Return `<OrderClient categories={categories} sessionId={sessionId} locale={locale} />`.
     (Req 5.3)
* In `OrderClient` (Client Component):

  * Maintain `cart: Record<string, number>` in state, mapping `menuItemId → quantity`.
  * On mount, optionally fetch average ratings by calling:

    ```ts
    const { data: ratingData } = await supabase
      .from("reviews")
      .select("avg(rating) as avg, count(*) as count")
      .eq("menu_item_id", item.id)
      .single();
    ```

    and store in local state `reviewData[item.id] = { avg, count }`.
  * Render each category’s menu items filtered by:

    ```js
    item.available && item.weekday_visibility.includes(todayWeekday)
    ```
  * Show item card: image, localized name/description, formatted price (`Intl.NumberFormat(locale, { style: "currency", currency: "JPY" }).format(item.price)`), star rating (rounded from `reviewData[item.id]?.avg`), and “＋”/“–” buttons to adjust `cart[item.id]`.
    (Req 5.4)
    ‣ (Req 5.3, 5.4)

5.4. **Filters & Sorting**

* Above the menu grid, add a dropdown or set of buttons for sorting:

  * “Top Seller”: call an API or precomputed data for top sellers (e.g., `/api/v1/menu/top-sellers?restaurantId={restaurantId}`).
  * “Price ↑/↓”: sort by `price`.
  * “Rating”: sort by `reviewData[item.id]?.avg`.
* Implement client-side sorting by manipulating the array of items before rendering.
  (Req 5.5)
  ‣ (Req 5.5)

5.5. **Booking & Preordering Flow**

* On the order page, add a tab or button “Book a Table” that navigates to `/customer/booking`.

* **Booking Page** (`/web/app/[locale]/customer/booking/page.tsx`, Server Component):

  1. Fetch `tables`: `supabaseAdmin.from("tables").select("id,name").eq("restaurant_id", restaurantId)`.
  2. Fetch categories and their menu items (same as in 5.3).
  3. Pass to `<BookingForm restaurantId={restaurantId} tables={tables} categories={categories} locale={locale} />`.
     (Req 5.6)

* In `/web/components/BookingForm.tsx`:

  * Zod schema:

    ```ts
    const bookingSchema = z.object({
      tableId: z.string().uuid(),
      customerName: z.string().min(1),
      customerContact: z.string().min(1),
      bookingDate: z.string().refine(date => new Date(date) >= new Date(), { message: "Must be today or future" }),
      bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
      partySize: z.number().int().min(1),
      preorderItems: z.array(z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
      })).optional(),
    });
    ```

    (Req 5.6)
  * On submit: POST `/api/v1/bookings/create` with the form data. If error 409 (“Table not available”), show an alert. If success, redirect to `/customer/booking/thank-you?bookingId={id}`.
  * Display date-picker (`<input type="date" />`) and time-picker (`<input type="time" />`).
  * For preorder, show the same menu UI (with checkboxes or quantity fields) for items available on the selected `bookingDate`’s weekday. Bind `preorderItems` to an array: for each checked item, store `{ menuItemId, quantity, notes }`.
    ‣ (Req 5.6)

* **Booking API** (`/web/app/api/v1/bookings/create.ts`):

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";
  import { z } from "zod";
  import { getCurrentRestaurantId } from "../../../lib/tenant-utils";

  const bookingSchema = z.object({
    tableId: z.string().uuid(),
    customerName: z.string().min(1),
    customerContact: z.string().min(1),
    bookingDate: z.string().refine(date => new Date(date) >= new Date()),
    bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
    partySize: z.number().int().min(1),
    preorderItems: z.array(z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
      notes: z.string().optional(),
    })).optional(),
  });

  export async function POST(req: NextRequest) {
    const restaurantId = await getCurrentRestaurantId(req);
    const body = await req.json();
    const parseResult = bookingSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, errors: parseResult.error.errors }, { status: 400 });
    }
    const { tableId, customerName, customerContact, bookingDate, bookingTime, partySize, preorderItems } = parseResult.data;

    // Verify table belongs to this restaurant
    const { data: table } = await supabaseAdmin
      .from("tables")
      .select("id")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .single();
    if (!table) {
      return NextResponse.json({ success: false, error: "Invalid table" }, { status: 404 });
    }

    // Check for existing booking conflict
    const { data: existing } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("table_id", tableId)
      .eq("booking_date", bookingDate)
      .eq("booking_time", bookingTime)
      .neq("status", "canceled");
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "Table not available at that time" }, { status: 409 });
    }

    // Insert
    const { data: bookingData, error } = await supabaseAdmin
      .from("bookings")
      .insert([{
        restaurant_id: restaurantId,
        table_id: tableId,
        customer_name: customerName,
        customer_contact: customerContact,
        booking_date: bookingDate,
        booking_time: bookingTime,
        party_size: partySize,
        preorder_items: preorderItems || [],
      }])
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, bookingId: bookingData.id });
  }
  ```

  (Req 5.6)
  ‣ (Req 5.6)

5.6. **Cart & Checkout (Cash Only)**

* In `OrderClient` (client component in `/order/page.tsx`):

  * Maintain a “Floating Cart” UI at the bottom showing:

    ```
    Total Items: X   [Checkout]
    ```

    where `X = Object.values(cart).reduce((sum, qty) => sum + qty, 0)`.
  * On clicking “Checkout”:

    ```ts
    const items = Object.entries(cart).map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity: Number(quantity)
    }));
    const res = await fetch("/api/v1/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, items }),
    });
    const data = await res.json();
    if (data.success) {
      window.location.href = `/${locale}/customer/thank-you?orderId=${data.orderId}`;
    } else {
      alert(data.error);
    }
    ```
  * “Checkout” button must be disabled if `Object.keys(cart).length === 0`.
    (Req 5.7)

* **Order Creation API** (`/web/app/api/v1/orders/create.ts`):

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";
  import { z } from "zod";
  import { getCurrentRestaurantId } from "../../../lib/tenant-utils";

  const orderSchema = z.object({
    sessionId: z.string().uuid(),
    items: z.array(z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
      notes: z.string().optional()
    }))
  });

  export async function POST(req: NextRequest) {
    const restaurantId = await getCurrentRestaurantId(req);
    const body = await req.json();
    const parseResult = orderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, errors: parseResult.error.errors }, { status: 400 });
    }
    const { sessionId, items } = parseResult.data;

    // Validate session
    const { data: orderRow } = await supabaseAdmin
      .from("orders")
      .select("id,status")
      .eq("session_id", sessionId)
      .eq("restaurant_id", restaurantId)
      .single();
    if (!orderRow || orderRow.status !== "new") {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 400 });
    }

    // Validate each menuItemId
    for (const { menuItemId, quantity } of items) {
      const { data: item } = await supabaseAdmin
        .from("menu_items")
        .select("price,available,weekday_visibility")
        .eq("id", menuItemId)
        .eq("restaurant_id", restaurantId)
        .single();
      if (!item || !item.available) {
        return NextResponse.json({ success: false, error: "Item unavailable" }, { status: 400 });
      }
      // Check weekday visibility
      const todayWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay();
      if (!item.weekday_visibility.includes(todayWeekday)) {
        return NextResponse.json({ success: false, error: "Item not available today" }, { status: 400 });
      }
    }

    // Calculate total_amount
    let totalAmount = 0;
    for (const { menuItemId, quantity } of items) {
      const { data: item } = await supabaseAdmin
        .from("menu_items")
        .select("price")
        .eq("id", menuItemId)
        .single();
      totalAmount += Number(item.price) * quantity;
    }

    // Insert order_items
    const { data: newOrder } = await supabaseAdmin
      .from("orders")
      .update({ total_amount: totalAmount })
      .eq("session_id", sessionId)
      .select("id")
      .single();
    const orderId = newOrder.id;

    for (const { menuItemId, quantity, notes } of items) {
      await supabaseAdmin.from("order_items").insert([{
        restaurant_id: restaurantId,
        order_id: orderId,
        menu_item_id: menuItemId,
        quantity,
        notes
      }]);
    }

    return NextResponse.json({ success: true, orderId });
  }
  ```

  (Req 5.7)

* Verify that after placing an order:
  • A new row in `order_items` exists for each item (with correct `quantity`).
  • `orders.total_amount` is set.
  • `orders.status` remains `“new”`.
  ‣ (Req 5.7)

5.7. **Session Expiry & Thank You Page**

* **Session Expiry**: In `/order/page.tsx`, if `orders.status !== "new"`, render `<SessionExpired />`. Confirm that if the iOS app marks the order “completed,” reloading the order page shows “Session expired.”
  (Req 5.8)
* **Thank You Page** (`/web/app/[locale]/customer/thank-you/page.tsx`):

  ```tsx
  import { useTranslations } from "next-intl";

  export default function ThankYouPage({ searchParams }) {
    const t = useTranslations("THANK_YOU");
    const orderId = searchParams.orderId;
    return (
      <div className="text-center p-8">
        <h1>{t("THANK_YOU_FOR_ORDER")}</h1>
        <p>{t("ORDER_ID")}: {orderId}</p>
        <p>{t("PLEASE_RATE")}</p>
      </div>
    );
  }
  ```

  (Req 5.9)
* Confirm that the Thank You page displays the `orderId` correctly.
  ‣ (Req 5.9)

5.8. **Review Submission Flow**

* **Review Form** (`/web/app/[locale]/customer/review/[menuItemId]/page.tsx`):

  * Render a client component `<ReviewForm menuItemId={menuItemId} locale={locale} />`.
  * Zod schema:

    ```ts
    const reviewSchema = z.object({
      menuItemId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().optional(),
    });
    ```

    (Req 5.10)
  * On submit: POST `/api/v1/reviews/create` with `{ menuItemId, rating, comment }`.
  * Redirect back to `/customer/order` or show a “Thank you for your feedback” message.
* **Review Creation API** (`/web/app/api/v1/reviews/create.ts`):

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";
  import { z } from "zod";
  import { getCurrentRestaurantId } from "../../../lib/tenant-utils";

  const reviewSchema = z.object({
    menuItemId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
  });

  export async function POST(req: NextRequest) {
    const restaurantId = await getCurrentRestaurantId(req);
    const body = await req.json();
    const parseResult = reviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, errors: parseResult.error.errors }, { status: 400 });
    }
    const { menuItemId, rating, comment } = parseResult.data;
    // Verify menuItem belongs to that restaurant
    const { data: item } = await supabaseAdmin
      .from("menu_items")
      .select("id")
      .eq("id", menuItemId)
      .eq("restaurant_id", restaurantId)
      .single();
    if (!item) {
      return NextResponse.json({ success: false, error: "Invalid menu item" }, { status: 404 });
    }
    await supabaseAdmin.from("reviews").insert([{ 
      restaurant_id: restaurantId,
      menu_item_id: menuItemId,
      rating,
      comment
    }]);
    return NextResponse.json({ success: true });
  }
  ```

  (Req 5.10)
* Verify by submitting a review and then checking the `reviews` table for a new row with `restaurant_id`, `menu_item_id`, `rating`, and `comment`.
  ‣ (Req 5.10)

---
