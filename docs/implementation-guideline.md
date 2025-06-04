Below are the implementation guidelines that any AI agent (or developer) should follow when generating or modifying code for Shop-Copilot. These instructions align with the latest Overview, Requirements Checklist, and High-Level Development Plan.

---

## 1. Project Structure & Tooling

1. **Monorepo Layout**

   * Ensure the repository root contains exactly these folders (no extras unless new modules are introduced):

     ```
     /web
     /mobile
     /shared
     /infra
     /config
     README.md
     ```
   * Do not add other top-level directories; if a new concern arises (e.g., docs, scripts), create a subfolder under an existing directory or under `/infra` or `/shared` as appropriate.

2. **Configuration Files**

   * **Web**:

     * Must include `next.config.js` (with i18n settings).
     * Must include `tailwind.config.js` and `postcss.config.js`.
     * In `/web`, have ESLint (`.eslintrc.js`) and Prettier (`.prettierrc`) set up.
   * **Mobile**:

     * SwiftLint rules file (`.swiftlint.yml`) at `/mobile`.
     * Xcode project file (`ShopCopilotStaff.xcodeproj`) and workspace structure must match the guidelines.
   * **Shared**:

     * Place any TypeScript Zod schemas (e.g. signupSchema, bookingSchema) or utilities that are reused between client and server. Do not duplicate schemas.

3. **Feature Flags & Environment Variables**

   * In `/config/feature-flags.ts`, define exactly these five flags, reading from `process.env`:

     ```ts
     export const FEATURE_FLAGS = {
       payments: process.env.NEXT_PUBLIC_FEATURE_PAYMENTS === "true",
       aiAssistant: process.env.NEXT_PUBLIC_FEATURE_AI === "true",
       onlineReviews: process.env.NEXT_PUBLIC_FEATURE_REVIEWS === "true",
       lowStockAlerts: process.env.NEXT_PUBLIC_FEATURE_LOWSTOCK === "true",
       tableBooking: process.env.NEXT_PUBLIC_FEATURE_TABLEBOOKING === "true",
     };
     ```
   * Always gate any code that depends on payments, AI, reviews, low-stock alerts, or table booking behind a check of the corresponding flag. For example:

     ```ts
     if (FEATURE_FLAGS.payments) {
       // render Stripe checkout
     } else {
       // show “Cash only” notice
     }
     ```
   * Keep `/web/.env.example` up-to-date with all required keys (see Requirements Checklist §1.2). Never expose private variables in client-side code.

---

## 2. Security & Data Isolation

1. **Row-Level Security (RLS)**

   * Every table that includes a `restaurant_id` column must have RLS enabled and four policies (FOR SELECT, INSERT, UPDATE, DELETE) ensuring `restaurant_id = auth.jwt()→>'restaurant_id'`. Do not use `FOR ALL` policies.
   * For new tables, always run:

     ```sql
     ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "<table_name> tenant select"
       ON <table_name>
       FOR SELECT
       USING (restaurant_id = auth.jwt() ->> 'restaurant_id');
     CREATE POLICY "<table_name> tenant insert"
       ON <table_name>
       FOR INSERT
       WITH CHECK (restaurant_id = auth.jwt() ->> 'restaurant_id');
     CREATE POLICY "<table_name> tenant update"
       ON <table_name>
       FOR UPDATE
       USING (restaurant_id = auth.jwt() ->> 'restaurant_id')
       WITH CHECK (restaurant_id = auth.jwt() ->> 'restaurant_id');
     CREATE POLICY "<table_name> tenant delete"
       ON <table_name>
       FOR DELETE
       USING (restaurant_id = auth.jwt() ->> 'restaurant_id');
     ```
   * Confirm that Supabase Storage bucket `restaurant-uploads` has RLS policies restricting reads/inserts to paths prefixed with `restaurants/{restaurant_id}/…`.

2. **Rate Limiting & WAF**

   * Every critical Edge Function—specifically:

     ```
     /api/v1/register
     /api/v1/login
     /api/v1/orders/create
     /api/v1/bookings/create
     /api/v2/chatbot
     ```

     must implement in-code rate limiting (token-bucket by IP or user). If the limit is exceeded, return HTTP 429 immediately.
   * Do not rely on third-party packages; implement a minimal in-memory token bucket or use Supabase Edge Function support libraries.
   * Ensure Vercel’s Web Application Firewall is enabled (“Attack Challenge” on all routes). Document in README that “WAF must remain enabled.”

3. **CAPTCHA on Auth Flows**

   * On `/signup`, `/login`, and `/forgot-password` pages, embed a reCAPTCHA or hCaptcha widget.
   * Create `/api/v1/verify-captcha` Edge Function: accept `{ token }`, call the external verification endpoint, and return `{ valid: true/false }`.
   * In `/api/v1/register` and `/api/v1/login`, the first step is to call `/api/v1/verify-captcha`. If `valid: false`, respond with status 400 and an error message.
   * Do not process any credentials until CAPTCHA is verified.

4. **Secrets & Environment Management**

   * All secrets (service role keys, Stripe secret, OpenAI key, CAPTCHA secret) must live only in environment variables injected by CI/CD. They never appear in code or committed `.env` files.
   * In `/web`, only variables prefixed with `NEXT_PUBLIC_…` should be accessible in client bundles; everything else must be `NEXT_PRIVATE_…`.
   * If adding any new third-party API key, update `/web/.env.example` and CI settings accordingly.

5. **Input Validation**

   * Use Zod on every API route to validate incoming JSON. For instance:

     ```ts
     const signupSchema = z.object({
       name: z.string().min(1).max(100),
       subdomain: z.string().regex(/^[a-z0-9-]{3,30}$/),
       email: z.string().email(),
       password: z.string().min(8),
       confirmPassword: z.string().min(8),
       defaultLanguage: z.enum(["ja","en","vi"]),
       captchaToken: z.string().min(1),
     }).refine(data => data.password === data.confirmPassword, { path: ["confirmPassword"] });
     ```
   * Do not trust any front-end validation; always revalidate server-side before any database operation.

6. **Audit Logging**

   * Triggers on critical tables (`orders`, `menu_items`, `inventory_items`, `bookings`, etc.) must write to `audit_logs`.
   * Follow the pattern in Requirements Checklist §2.6: create a single `log_changes()` function and attach it to each table with `CREATE TRIGGER`.
   * Ensure RLS on `audit_logs` allows only tenants to see their own log entries.

---

## 3. Database Migrations & Structure

1. **Migrations Directory**

   * Place all `.sql` migration files under `/infra/migrations`, prefixing each file with an incremental identifier (e.g., `001_init.sql`, `002_inventory_triggers.sql`, `003_audit_logs.sql`, etc.).
   * Each migration must be idempotent (use `IF NOT EXISTS` or `CREATE OR REPLACE`) and include any necessary `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.

2. **Core Tables & Columns**

   * At minimum, create these tables exactly as specified in the Requirements Checklist:

     ```
     restaurants
     users
     categories
     menu_items
     tables
     employees
     schedules
     orders
     order_items
     reviews
     feedback
     inventory_items
     analytics_snapshots
     chat_logs
     audit_logs
     bookings
     ```

3. **Indexing & Constraints**

   * Ensure every table with frequent lookups has composite indexes as described:

     * `menu_items (restaurant_id, available)`
     * `orders (restaurant_id, status)`
     * `inventory_items (restaurant_id, stock_level)`
     * `analytics_snapshots (restaurant_id, date)`
     * `bookings (restaurant_id, booking_date)`
   * Unique constraints:

     * `restaurants.subdomain`
     * `orders.session_id`
     * `tables.qr_code` (if stored in DB)
   * Foreign key references must use `ON DELETE CASCADE` for tenant tables, except where specifically noted (`order_items.menu_item_id` uses `ON DELETE RESTRICT`).

4. **Triggers & Functions**

   * **Inventory Trigger**: in `002_inventory_triggers.sql`, define `adjust_inventory_on_order()` that decreases `inventory_items.stock_level` for each new `order_items`.
   * **Daily Snapshot Function**: in `/infra/functions/generate_daily_snapshot.sql`, define `public.generate_daily_snapshot()` to compute each restaurant’s sales, top seller, and order count for that date.
   * **Recommendations RPCs**:

     * `get_top_sellers_7days(p_restaurant, p_limit)` returns `(menu_item_id, total_sold)` over the last 7 days.
     * `apply_recommendations(p_restaurant)` creates or fetches a “Featured” category and copies the top sellers into it with full weekday visibility.

5. **RLS Policies**

   * After creating each table, immediately enable RLS and add four policies (select, insert, update, delete) that check `restaurant_id = auth.jwt() →> 'restaurant_id'`.
   * For `storage.objects`, ensure RLS restricts to `bucket_id = 'restaurant-uploads'` and `path LIKE '{restaurant_id}%'`.
   * Verify via a test query that a JWT from Restaurant A cannot SELECT or INSERT into Restaurant B’s rows.

---

## 4. Tenant Registration & Subdomain Logic

1. **Signup Form & Validation**

   * On `/web/app/[locale]/signup`, build a React Hook Form page that:

     * Imports `signupSchema` from `/shared/schemas/signup.ts`.
     * Embeds a reCAPTCHA widget.
     * Debounces calls to `/api/v1/subdomain/check?subdomain=…` and displays “Available” or “Not available” in real time.
   * Do not allow form submission until:

     1. Zod validation passes.
     2. reCAPTCHA is valid.
     3. Subdomain check returns `{ available: true }`.

2. **Subdomain Provisioning API**

   * **GET /api/v1/subdomain/check**

     * Validate `subdomain` format server-side (regex `/^[a-z0-9-]{3,30}$/`) and return `{ available: true/false }`.
     * If invalid format, respond with 400 and a `reason` field.
   * **GET /api/v1/restaurant/exists?subdomain=…**

     * Return `{ exists: true/false }` so middleware can verify subdomain.

3. **Register Endpoint**

   * **POST /api/v1/register** must:

     1. Validate body with `signupSchema`.
     2. Re-check subdomain uniqueness in `restaurants`.
     3. Create a Supabase Auth user using `supabaseAdmin.auth.admin.createUser({ email, password, user_metadata: { name } })`.
     4. Insert into `restaurants (name, subdomain, default_language)`.
     5. Update that Auth user’s `app_metadata` with `{ restaurant_id, role: "owner" }`.
     6. Insert into `users (id, restaurant_id, email, name, role: "owner")`.
     7. Return `{ success: true, redirect: "https://{subdomain}.shop-copilot.com/{defaultLanguage}/dashboard" }`.
   * Any failure in steps (3–6) must be accompanied by a call to `logEvent({ level: "ERROR", endpoint: "/api/v1/register", message, metadata })`.

4. **Wildcard Subdomain & Next.js Middleware**

   * In `middleware.ts`, parse `req.headers.get("host")` to extract `subdomain`:

     ```ts
     const host = req.headers.get("host") || "";
     const parts = host.split(".");
     const subdomain = parts.length > 2 ? parts[0] : null;
     ```
   * If `subdomain` is null or equals `"shop-copilot"`, allow root pages (landing, signup, login, marketing). Otherwise, call `/api/v1/restaurant/exists?subdomain=${subdomain}`:

     * If `exists: false`, redirect to `https://shop-copilot.com/404`.
     * If `exists: true`, set `req.nextUrl.searchParams.set("restaurant", subdomain)` so downstream code can fetch the correct `restaurant_id`.

---

## 5. Web Admin Dashboard Implementation

1. **Authentication & Protected Layout**

   * Create a single `ProtectedLayout` component under `/web/components/ProtectedLayout.tsx`:

     * Wraps children in `SessionContextProvider` from `@supabase/auth-helpers-nextjs`.
     * If `session == null`, redirect to `/{locale}/login`.
   * Wrap every route under `/{locale}/dashboard/...` in `ProtectedLayout`. Do not allow any API that reads/writes tenant data to run without verifying `session` first.

2. **Restaurant Profile & Settings**

   * Server component `/web/app/[locale]/dashboard/settings/page.tsx` must:

     1. Use a helper to map `subdomain → restaurant_id`.
     2. Fetch restaurant row via Supabase Admin client.
     3. Render a client component `<SettingsForm restaurant={restaurant} locale={locale} />`.
   * In `<SettingsForm>`:

     * Use Zod validation: name (1–100 chars), defaultLanguage (`"ja"|"en"|"vi"`), brandColor (`/^#([0-9A-Fa-f]{6})$/`), optional contactInfo.
     * For logo upload: if a file is provided, upload to `restaurant-uploads/restaurants/{restaurant_id}/logos/logo.png` with `upsert: true`; fetch the public URL and set `restaurants.logo_url`.
     * On submit, call `supabase.from("restaurants").update({ … }).eq("id", restaurant_id)`; handle success/failure toasts.

3. **Menu Management**

   * **Category List & Reordering**

     * Server component `/dashboard/menu/page.tsx`:

       * Query categories ordered by `position`. Each category row should include its related `menu_items` (ordered by position).
       * Pass array to `<CategoryList categories={categories} locale={locale} />`.
     * In `<CategoryList>` (client component):

       * Use `react-beautiful-dnd` to allow drag-and-drop reordering. On drag end, POST a JSON array of `{ id, position }` to `/api/v1/menu/reorder`.
       * For each category, render localized `name_{locale}`. Provide “Edit”, “Delete”, and “New Item” buttons.
   * **Category CRUD**

     * `/dashboard/menu/new` and `/dashboard/menu/[categoryId]/edit`:

       * Zod schema: `name (1–50 chars), position (number)`.
       * On submit: `supabase.from("categories").insert` or `.update`, with `restaurant_id` included. RLS will enforce the check.
   * **Menu Item CRUD**

     * `/dashboard/menu/[categoryId]/items/new` and `/dashboard/menu/[categoryId]/items/[itemId]/edit`:

       * Zod schema:

         ```ts
         const menuItemSchema = z.object({
           name_ja: z.string().min(1),
           name_en: z.string().min(1),
           name_vi: z.string().min(1),
           description_ja: z.string().optional(),
           description_en: z.string().optional(),
           description_vi: z.string().optional(),
           price: z.number().nonnegative(),
           tags: z.array(z.string()).optional(),
           available: z.boolean(),
           weekdayVisibility: z.array(z.number().min(1).max(7)),
           imageFile: z.any().optional()
         });
         ```
       * On submit:

         1. If editing: call `supabase.from("menu_items").update({ … }).eq("id", itemId)`.
         2. If creating: call `supabase.from("menu_items").insert([{ restaurant_id, category_id, … }])`, fetch the new `id`, then upload `imageFile` to `restaurant-uploads/restaurants/{restaurant_id}/menu_items/{item_id}.jpg` and update `menu_items.image_url`.
       * Enforce that only items with `available = true` and `weekday_visibility` array containing today’s weekday appear on the customer site.
   * Always pass `restaurant_id` either via Supabase Admin client in Server Components (for initial fetch) or rely on RLS when calling `supabaseClient` (which has the JWT set).

4. **Table Management & QR Codes**

   * `/dashboard/tables/page.tsx` (Server Component): fetch all `tables` for that restaurant. Pass to `<TableList>`.
   * `<TableList>`: display `name` and actions: “Edit”, “Delete”, “QR Code”.
   * `/dashboard/tables/new` and `/dashboard/tables/[tableId]/edit`:

     * Zod schema: `name (1–50 chars), positionX (number?), positionY (number?)`.
     * On submit, insert or update via Supabase.
   * `/dashboard/tables/[tableId]/qr`:

     * Compute:

       ```
       url = `https://${subdomain}.shop-copilot.com/${locale}/customer/order?tableId=${tableId}`
       ```
     * Render `<QRCode value={url} size={256} />` from `react-qr-code`.
     * For “Download PNG”, convert the `<svg>` to a `<canvas>`, then call `canvas.toDataURL("image/png")` and trigger a download link.

5. **Employee & Schedule Management**

   * `/dashboard/employees/page.tsx` (Server Component): fetch `employees` joined with `users.name` and `users.email`.
   * `<EmployeeList>`: display columns: Name, Email, Role, “Edit”, “Delete”, “Schedule”.
   * `/dashboard/employees/new` and `/dashboard/employees/[employeeId]/edit`:

     * Zod schema: `userEmail (valid email), role (“chef”|“server”|“cashier”|“manager”)`.
     * On submit: lookup `users.id` by `userEmail` and ensure the user belongs to this `restaurant_id`. If found, insert or update `employees`.
   * `/dashboard/employees/[employeeId]/schedule`:

     * Server fetch existing `schedules` for that employee. Pass to `<ScheduleCalendar>`.
     * In `<ScheduleCalendar>`, render a weekly grid (Mon–Sun, 06:00–23:00). Show existing shifts as colored blocks. Provide UI (either form or drag-and-drop) to create new shifts.
     * Use Zod to validate `weekday ∈ [1..7]`, `start_time < end_time`. On change, call `/api/v1/schedules` POST (for create), PATCH (for update), or DELETE. All API routes must check RLS.

6. **Reports & Analytics**

   * `/dashboard/reports/page.tsx` (Server Component) must gather four sets of data:

     1. **Today’s Total Sales**: query `analytics_snapshots` where `date = today`.
     2. **Active Orders Count**: count of `orders` where `status != "completed"`.
     3. **Top Seller Today**: aggregate `order_items` joined with `orders` filtered by today’s date.
     4. **Low-Stock Alerts**: `inventory_items` where `stock_level ≤ threshold`.
   * Pass these to `<DashboardCards>`.
   * **Sales Report Tab**: allow selecting “Last 7 Days” or “Last 30 Days”. Use `analytics_snapshots` or an RPC to fetch revenue per day and category breakdown. Render with Recharts (bar + pie). Provide CSV export.
   * **Items Report Tab**: call RPC `get_items_report(restaurantId)` to get `(item, total_sold, revenue, avg_rating)`. Render a sortable table with CSV/PDF export.
   * **Feedback Report Tab**: fetch latest 50 `reviews` joined with `menu_items` (for name), display rating, comment, date, resolved status. Provide a “Resolve” button that calls `/api/v1/reviews/resolve` to mark `resolved = true`.
   * **Recommendations Widget**: call `get_top_sellers_7days(restaurantId, 3)`, join with `menu_items` for names, display top 3. “Apply to Next Week” button calls `/api/v1/recommendations/apply`, which invokes the RPC `apply_recommendations(restaurantId)`.

---

## 6. Customer-Facing Website Implementation

1. **Locale-Aware Routing & Layout**

   * Under `/web/app/[locale]/customer/layout.tsx`:

     * Wrap content in a header (Restaurant Name, hours, `<LanguageSwitcher>`) and footer.
     * Use `useRestaurantContext()` to retrieve `subdomain` from `searchParams`, then map to `restaurant_id` (ideally via a small Edge Function or helper in Server Component).
     * Ensure all text uses `useTranslations("...")`, never hard-coded English.

2. **Session Creation (QR Scan)**

   * QR code URL format:

     ```
     https://{subdomain}.shop-copilot.com/{locale}/customer/order?tableId={tableId}
     ```
   * `/web/app/api/v1/sessions/create`:

     * Validate `tableId` belongs to this `restaurant_id`.
     * Insert into `orders` with `(restaurant_id, table_id, session_id = uuid_generate_v4(), status = "new")`.
     * Return `{ sessionId }`.
   * On the “order” page (Server Component), call this API with `tableId` from query. Store `sessionId` in a cookie or pass as prop to the client.

3. **Order Page Rendering & Logic**

   * `/web/app/[locale]/customer/order/page.tsx` (Server Component):

     1. Read `sessionId` from `searchParams` (or cookie).
     2. Query `orders` where `session_id = sessionId` and `status = "new"`. If none, render `<SessionExpired />`.
     3. Fetch `categories` and associated `menu_items` where `available = true` and `weekday_visibility` includes today’s weekday.
     4. Pass data to `<OrderClient categories={…} sessionId={sessionId} locale={locale} />`.

   * **OrderClient** (Client Component):

     * Maintain `cart: Record<string, number>` for `menuItemId → quantity`.
     * On mount, optionally fetch average ratings for each item via:

       ```ts
       supabase.from("reviews").select("avg(rating) as avg, count(*) as count").eq("menu_item_id", item.id).single()
       ```
     * Render categories as collapsible sections or tabs. For each item: show image, localized name/description, formatted price, star rating (rounded), quantity controls (“＋”/“–”).
     * Provide sorting controls: “Top Seller” (call `/api/v1/menu/top-sellers?restaurantId={restaurantId}` or use precomputed daily data), “Price ↑/↓”, “Rating ↓/↑”.
     * The floating cart button shows total items and total price; it is disabled if cart is empty.

4. **Booking & Preordering**

   * On the order page, include a “Book a Table” button/navigation to `/customer/booking`.
   * `/web/app/[locale]/customer/booking/page.tsx` (Server Component): fetch `tables` and `categories`/`menu_items` as in the order page. Pass to `<BookingForm>`.
   * **BookingForm** (Client Component):

     * Zod schema:

       ```ts
       const bookingSchema = z.object({
         tableId: z.string().uuid(),
         customerName: z.string().min(1),
         customerContact: z.string().min(1),
         bookingDate: z.string().refine(d => new Date(d) >= new Date()),
         bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
         partySize: z.number().int().min(1),
         preorderItems: z.array(z.object({
           menuItemId: z.string().uuid(),
           quantity: z.number().int().min(1),
           notes: z.string().optional(),
         })).optional()
       });
       ```
     * On submit: POST to `/api/v1/bookings/create`. Handle 409 (time conflict) by showing an error. On success, redirect to `/customer/booking/thank-you?bookingId={id}`.
     * If `FEATURE_FLAGS.tableBooking = false`, hide all booking UI.

5. **Checkout (Cash-Only)**

   * On the order page, clicking “Checkout” constructs payload:

     ```jsonc
     {
       "sessionId": "uuid",
       "items": [
         { "menuItemId": "uuid", "quantity": n, "notes": "string?" },
         …
       ]
     }
     ```

     and POSTs to `/api/v1/orders/create`.

   * `/api/v1/orders/create` must:

     1. Validate with Zod.
     2. Verify `sessionId` exists, `status = "new"`, `restaurant_id` matches.
     3. For each item: confirm `menu_items.available = true` and `weekday_visibility` includes today.
     4. Calculate `total_amount`.
     5. Update `orders.total_amount` for that row (by `session_id`) and return the `order.id`.
     6. Insert each `order_items`.

     * Return `{ success: true, orderId }`.

   * After the API returns, client redirects to `/customer/thank-you?orderId={orderId}`.

6. **Session Expiry**

   * Once any code (web or iOS) updates an order’s `status` to `"completed"`, subsequent visits to `/customer/order?sessionId=…` should render a “Session expired” message.
   * Malicious or invalid `sessionId` should yield 404 or 400.

7. **Thank You & Reviews**

   * `/web/app/[locale]/customer/thank-you/page.tsx`: read `orderId` from `searchParams`, fetch order summary (table number, items, total). Render localized “Thank you” text. Include links next to each item for “Rate this Dish,” which navigates to `/customer/review/{menuItemId}`.
   * `/web/app/[locale]/customer/review/[menuItemId]/page.tsx`: render `<ReviewForm>`.
   * **ReviewForm** (Client Component): Zod schema:

     ```ts
     const reviewSchema = z.object({
       menuItemId: z.string().uuid(),
       rating: z.number().int().min(1).max(5),
       comment: z.string().optional(),
     });
     ```

     On submit: POST to `/api/v1/reviews/create`. On success, redirect back or show “Thank you for your feedback.” If `FEATURE_FLAGS.onlineReviews = false`, hide review links entirely.

---

## 7. Staff iOS App Guidelines

1. **Configuration & Dependencies**

   * In `/mobile/ShopCopilotStaff/Config.swift`, include only:

     ```swift
     static let supabaseUrl = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as! String
     static let supabaseAnonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as! String
     static let defaultLocale = "ja"
     static let maxRetryAttempts = 3
     ```
   * Add `supabase-swift` and `ESCManager` packages via Swift Package Manager. Do not include any other dependencies unless explicitly required.
   * All UI text must use `Localizable.strings` for `ja`, `en`, and `vi`. Do not hard-code English.

2. **Authentication Flow**

   * **LoginView\.swift**:

     * Fields: Email, Password, Subdomain.
     * On “Sign In”:

       1. Instantiate `SupabaseClient(supabaseURL:Config.supabaseUrl, supabaseKey: Config.supabaseAnonKey)`.
       2. Call `try await client.auth.signInWithPassword(email: email, password: password)`.
       3. If successful, extract JWT, decode payload to get `restaurant_id` and `role`.
       4. Store JWT, `restaurant_id`, and `role` in `@AppStorage`.
       5. Navigate to main content view (e.g., a `TabView` containing orders and bookings).
     * On failure (invalid credentials, invalid subdomain), show a localized alert.

3. **Realtime Order Subscription**

   * In `OrderService.swift`:

     * Upon initialization, create `SupabaseClient` with the stored JWT.
     * Subscribe to Realtime channel `"public:orders"` with filter `"restaurant_id=eq.<restaurant_id>"`.
     * Maintain `@Published var activeOrders: [Order]` where `status != "completed"`.
     * On `.INSERT` or `.UPDATE` events, update `activeOrders` accordingly.
   * Always rely on RLS: because the Supabase client includes the JWT, any SELECT or UPDATE will implicitly be scoped to the tenant.

4. **Order List & Detail**

   * **OrderListView\.swift**:

     * Use `@ObservedObject var orderService: OrderService`.
     * List `activeOrders`, sorted by `createdAt desc`.
     * Each row shows “Table X,” number of items, timestamp, and a colored badge for status.
     * Tapping a row pushes `OrderDetailView(order: order, service: orderService)`.

   * **OrderDetailView\.swift**:

     * Display itemized list: for each `OrderItem`, show the localized `menuItemName`, quantity, and notes if present.
     * Display total amount formatted in Japanese Yen.
     * Show status-transition buttons in sequence:

       * If `status == "new"` → “Mark Preparing” calls `orderService.updateOrderStatus(order.id, "preparing")`.
       * If `status == "preparing"` → “Mark Ready”.
       * If `status == "ready"` → “Complete & Print” calls `updateOrderStatus("completed")` and then `PrinterManager.shared.printReceipt(order)`.
     * After marking “completed,” that order must be removed from `activeOrders` automatically via the Realtime subscription.

5. **Kitchen Grouping Board**

   * **KitchenBoardView\.swift** (optimized for iPad):

     * On `onAppear`, call `computeGrouping()`.
     * `computeGrouping()` iterates over `orderService.activeOrders` filtered to those with `createdAt ≥ now() − 600 s` and `status ∈ {"new","preparing"}`.
     * Group by `menuItemId`, summing `quantity` and collecting a set of `tableId`.
     * Build an array of `GroupedItem` `{ id, itemId, itemName, quantity, tables: [String] }`.
     * Render a grid of cards: each card shows `itemName`, `Qty: X`, `Tables: T1, T3`, and a “Mark Done” button.
     * On “Mark Done”: call `PrinterManager.shared.printGroupedSummary(group)`, then optionally update all underlying orders to `"completed"` or leave that to the staff to handle individually. After printing, call `computeGrouping()` again to refresh.

6. **Printer Management**

   * **PrinterManager.swift** (singleton):

     * Implements `CBCentralManagerDelegate` and `CBPeripheralDelegate`.
     * Method `connectToPrinter()` scans for peripherals advertising the ESC/POS service UUID. Once discovered, connect and discover characteristics. Store the write characteristic.
     * `printReceipt(order: Order)` assembles a text-based receipt string and converts to `Data` (UTF-8). Write to the characteristic. Retry up to `maxRetryAttempts`.
     * `printGroupedSummary(group: GroupedItem)` assembles a summary string and writes it.
     * Handle errors gracefully—if no `writeCharacteristic`, do nothing (but do not crash).

   * **PrinterSetupView\.swift**:

     * Button “Scan for Printers” calls `PrinterManager.shared.connectToPrinter()`.
     * Use `@Published var discoveredPeripheral: CBPeripheral?` to populate a `List` of available devices.
     * Each row shows peripheral `name` and a “Connect” button. On tap, call `PrinterManager.shared.connect(to: peripheral)`.
     * Provide a “Test Print” button to send a simple sample text.

7. **Booking Management in iOS**

   * **BookingService.swift** (similar to `OrderService`):

     * Subscribe to `"public:bookings"` filtered by `restaurant_id`.
     * Maintain `@Published var bookings: [Booking]`.
     * Method `updateBookingStatus(bookingId: String, newStatus: String)` calls Supabase to update.
   * **BookingListView\.swift**:

     * List `bookingService.bookings`, sorted by `bookingDate`, then `bookingTime`.
     * Each row shows customer name, contact, date/time, party size, status badge. Tapping navigates to `BookingDetailView`.
   * **BookingDetailView\.swift**:

     * Display booking details: name, contact, date/time, party size, and any `preorderItems` (show each item’s localized name and quantity).
     * Show buttons: if `status == "pending"`, show “Confirm” and “Cancel.” If `status == "confirmed"`, show “Cancel.” These call `bookingService.updateBookingStatus(...)`.
     * After updating, update local `booking.status` so UI refreshes.

8. **Checkout & Receipt Printing (Cash Only)**

   * When an order’s status is `"ready"`, push `CheckoutView(order: order)`.
   * **CheckoutView\.swift**:

     * Show itemized list, table number, total amount.
     * Button “Confirm Payment (Cash) & Print Receipt”:

       1. Call `orderService.updateOrderStatus(order.id, "completed")`.
       2. Call `PrinterManager.shared.printReceipt(order)`.
       3. Pop back to `OrderListView`.
   * If `FEATURE_FLAGS.payments = false`, hide any Stripe UI.

9. **Low-Stock Alerts**

   * If `FEATURE_FLAGS.lowStockAlerts = true`, subscribe to Realtime on `inventory_items` filtered by `restaurant_id`.
   * Whenever `stock_level ≤ threshold`, present a local banner or alert in the app (e.g., a SwiftUI `Alert` or in-app toast).

---

## 8. Smart Reports, Feedback & Planner

1. **Daily Snapshot Job**

   * Ensure the `pg_cron` job is scheduled in the production database:

     ```sql
     SELECT cron.schedule('daily_snapshot', '0 0 * * *', $$SELECT public.generate_daily_snapshot();$$);
     ```
   * Do not modify this schedule; if testing locally, run `SELECT public.generate_daily_snapshot();` manually.

2. **Low-Stock Trigger**

   * Confirm that in `002_inventory_triggers.sql` you have:

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
   * When generating new migrations, always include similar triggers under `/infra/migrations`.

3. **Recommendations RPCs & Edge Function**

   * **RPC**: in `/infra/functions/get_top_sellers_7days.sql`, define exactly as specified.
   * **RPC**: in `/infra/functions/apply_recommendations.sql`, define exactly as specified.
   * **Edge Function `/api/v1/recommendations/apply`**: must call `supabaseAdmin.rpc("apply_recommendations", { p_restaurant: restaurantId })`. On error, return status 500. Otherwise, return `{ success: true }`.

4. **Feedback Moderation UI**

   * In Admin Dashboard, the “Feedback Report” tab must fetch latest 50 reviews for that tenant, joined with `menu_items` to get localized names.
   * For each review row, show rating (stars), comment, date, resolved status. Provide a “Resolve” button that calls `/api/v1/reviews/resolve` with `{ reviewId }`. On success, update the table row to “Resolved.”

---

## 9. Advanced, Feature-Flagged Modules

1. **Payments (Stripe & PayPay)**

   * **Edge Function**: `/infra/edge/payments/create-intent.js` must be written exactly as in the plan, using the Stripe SDK. Use `process.env.STRIPE_SECRET_KEY`.
   * **Web API `/api/v2/payments/create-intent`**: if you choose to proxy to the Edge Function, forward the client’s request exactly; otherwise, embed the logic from the Edge Function in the Next.js handler.
   * **Web Checkout Page**: wrap all Stripe/UI code in `if (FEATURE_FLAGS.payments)`. Load `@stripe/stripe-js` lazily.
   * **iOS PaymentSheet**: wrap in `if FeatureFlags.enablePayments`. Fetch `clientSecret`, configure and present `PaymentSheet`. On success, mark the order “completed” via `OrderService` and print receipt.

2. **AI Assistant (Chatbot)**

   * **Edge Function**: `/web/app/api/v2/chatbot.ts` must:

     1. Validate incoming `{ restaurantId, language, userQuery }`.
     2. Fetch `menu_items` for that `restaurantId` with fields `name_{language}`, `description_{language}`, `price`.
     3. Build a prompt listing all current menu items, append the user’s question, and ask the model to respond in that language.
     4. Call OpenAI `chat.completions.create(...)` with `model: "gpt-4o"`.
     5. Insert a row into `chat_logs` recording `prompt_text`, `prompt_token_count`, `response_token_count`.
     6. Return `{ response: string }`.
   * **Web Chat Widget**:

     * If `FEATURE_FLAGS.aiAssistant = true`, include `<ChatWidget restaurantId={restaurantId} locale={locale} />` in the customer layout.
     * In `<ChatWidget>`, maintain a local `messages` array. On send, POST `{ restaurantId, language: locale, userQuery }` to `/api/v2/chatbot`, append the AI’s reply to `messages`.
     * Style chat bubbles so user messages are right-aligned and AI messages left-aligned.

3. **Messaging Integrations (Future)**

   * If you scaffold any webhook endpoints (e.g. `/api/v1/messaging/facebook`), leave them stubbed with a placeholder response (`{ ok: true }`) and mark the code with a `TODO: implement Facebook Messenger integration`.

4. **Audit Logging & Alerts**

   * All audit triggers and RLS on `audit_logs` should already exist. Do not modify them except to add new triggers if new critical tables are introduced.
   * For external alerts (failed logins, DoS, 500 spikes), document in README how to configure monitoring on Supabase and Vercel. Do not embed proprietary keys or webhooks in code.

5. **API Versioning & Deprecation**

   * Any new or breaking endpoints must go under `/api/v2`. For example, `/api/v2/payments/create-intent.ts`, `/api/v2/chatbot.ts`.
   * v1 endpoints remain functional for at least three months after v2 launch. Optionally, add a response header `x-deprecation-warning: "Use /api/v2/… instead"` in v1 handlers.

---

## 10. Testing & CI/CD Guidelines

1. **Web Unit & Integration Tests**

   * **RLS Protection**: Write a Jest test that instantiates Supabase JS client with a test JWT for Restaurant A and attempts to select rows for Restaurant B. Expect an empty array.
   * **Signup Flow**: Use React Testing Library to render the signup page, input an invalid subdomain, and confirm the validation error appears.
   * **Order Creation**: Use Supertest (or a Next.js integration test setup) to POST invalid `sessionId` to `/api/v1/orders/create`. Expect status 400 and appropriate error.
   * **i18n Rendering**: Render any component (e.g., header) under `NextIntlClientProvider` with `locale="en"` and confirm it shows English text; similarly for Vietnamese.
   * **Feature Flags**: Mock `FEATURE_FLAGS.payments = false`, render checkout page, and verify no Stripe fields appear, only “Cash only.”

2. **iOS Unit & UI Tests**

   * **OrderService.computeGrouping()**: Write a test that constructs dummy `Order` objects with identical `menuItemId` placed within 10 minutes, run `computeGrouping()`, and assert that grouping is correct.
   * **LoginView Snapshot**: Render `LoginView` in both `ja` and `en` and assert that the view exists without crash. (If snapshot testing is used, compare images.)
   * **PrinterManager.printReceipt()**: Call this method with `writeCharacteristic = nil` and ensure there is no crash.
   * **Feature Flags**: In a view that conditionally shows Stripe UI, simulate `FeatureFlags.enablePayments = false` and confirm Stripe UI is hidden.

3. **Security Scans & Dependency Checks**

   * **Web**: In CI, run `npm audit --audit-level=high`; fail if any high or critical vulnerability is found.
   * **Web**: Run `npm run lint` and `npm run format:check`; fix any errors before merging.
   * **iOS**: Run `swiftlint --strict` in CI; fix any violations.
   * Do not allow new dependencies that introduce high/critical vulnerabilities.

4. **CI/CD Pipeline Configuration**

   * **Web Job** (Ubuntu):

     1. Checkout code.
     2. Setup Node 18.
     3. `npm install` in `/web`.
     4. `npm run lint`, `npm run format:check`, `npm test`, `npm audit`.
     5. Deploy to Vercel using `amondnet/vercel-action@v20`, with environment set to “preview” on `develop` branch and “production” on `main`.
   * **iOS Job** (macOS):

     1. Checkout code.
     2. `brew install swiftlint`.
     3. Run `swiftlint --strict`.
     4. Run `xcodebuild -scheme ShopCopilotStaff -destination 'platform=iOS Simulator,name=iPhone 14' test | xcpretty`.
     5. Archive and upload to TestFlight, using GitHub secrets for App Store Connect API key.
   * Confirm that staging and production use different Supabase projects, different Stripe/PayPay keys, and different feature-flag values.

---

## 11. General Best Practices

1. **Naming Conventions**

   * Tables and columns in Supabase (Postgres) use snake\_case.
   * JavaScript/TypeScript variables and files use camelCase or kebab-case for filenames (e.g., `menuItemForm.tsx`).
   * Swift types and variables use PascalCase for types (e.g., `OrderService`) and camelCase for properties/methods.

2. **Localization Keys**

   * Keep all translation keys in `/web/i18n/locales/ja.json`, `en.json`, `vi.json`. The key hierarchy should mirror component or page structure (e.g., `"SIGNUP.TITLE"`, `"SIGNUP.SUBDOMAIN_PLACEHOLDER"`).
   * Never hard-code strings; always reference `useTranslations("KEY")`.

3. **Error Handling & Logging**

   * In every API route, wrap business logic in `try…catch`. On any catch, call `logEvent({ level: "ERROR", endpoint, message: err.message, metadata })` before returning a 500 error.
   * On client pages, show user-friendly, localized error messages. Log technical errors only in Supabase `logs` table.

4. **File Storage**

   * All uploads (logos, menu item images) go into the same bucket `restaurant-uploads`, under paths:

     ```
     restaurants/{restaurant_id}/logos/logo.png
     restaurants/{restaurant_id}/menu_items/{item_id}.jpg
     ```
   * Use Supabase Storage’s `upload` method with `upsert: true` for replacing existing files.
   * Generate publicly accessible URLs via `supabase.storage.from("restaurant-uploads").getPublicUrl(path)`; store that in the appropriate `logo_url` or `image_url` column.

5. **Code Organization**

   * Keep API routes under `/web/app/api/v1` or `/web/app/api/v2` depending on version.
   * Group related components under `/web/components`, but if a component is used only by a single page, co-locate it in the same folder under `/web/app/[locale]/…`.

6. **Feature Flag Discipline**

   * Whenever adding conditional code, check `FEATURE_FLAGS.<feature>` at the top level of the component or page. Do not scatter flag checks deep inside logic. For example, if payment UI is disabled, the entire `/customer/checkout` page should be replaced with a “Coming Soon” or “Cash only” notice early in the render.

7. **API Versioning**

   * Never modify a v1 endpoint in a breaking way. If an endpoint’s signature or behavior must change, copy it to v2 and deprecate the v1 route only after three months (document this in code and README).

8. **Testing Approach**

   * Write tests as soon as an API or component is stable. Do not defer tests until after launch.
   * For UI components, prefer React Testing Library or Snapshot tests. For Supabase logic, use integration tests with a test Supabase project and a test JWT.
   * For iOS, write XCTest cases for core logic (grouping, printer failure, feature-flag toggles) and at least one UI test for each major view.

---

By following these guidelines meticulously, any AI or developer will produce code that:

* Matches the **Overview** and **Requirements Checklist** exactly—no missing features.
* Adheres to the **High-Level Development Plan** without major refactoring later.
* Ensures security, multi-tenant isolation, i18n, and feature-flag flexibility from day one.
* Maintains a clean, consistent project structure and coding style across web and mobile.
