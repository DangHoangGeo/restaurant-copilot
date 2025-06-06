Below is a comprehensive, sectioned checklist covering **every requirement** for Shop-Copilot. Use this to mark off features as they are implemented and verified.

---

## 1. Foundational & Security Requirements

* [ ] **Monorepo Structure & Tooling**

  * [ ] Folders `/web`, `/mobile`, `/shared`, `/infra`, `/config` exist.
  * [ ] ESLint + Prettier configured in `/web` and `/shared`.
  * [ ] SwiftLint configured in `/mobile`.

* [ ] **Environment & Secrets**

  * [ ] `/web/.env.example` lists:

    * `NEXT_PUBLIC_SUPABASE_URL`
    * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    * `SUPABASE_SERVICE_ROLE_KEY`
    * `NEXT_PUBLIC_FEATURE_PAYMENTS`
    * `NEXT_PUBLIC_FEATURE_AI`
    * `NEXT_PUBLIC_FEATURE_REVIEWS`
    * `NEXT_PUBLIC_FEATURE_LOWSTOCK`
    * `NEXT_PUBLIC_FEATURE_TABLEBOOKING`
    * `NEXT_PUBLIC_CAPTCHA_SITE_KEY`
    * `NEXT_PRIVATE_CAPTCHA_SECRET`
    * `NEXT_PRIVATE_STRIPE_SECRET_KEY`
    * `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
    * `NEXT_PRIVATE_OPENAI_API_KEY`
  * [ ] CI/CD injects real secrets; no secrets leak into client bundles.
  * [ ] Separate Supabase projects (staging vs. production) and Vercel deployments.

* [ ] **Feature Flags & API Versioning**

  * [ ] `/config/feature-flags.ts` defines flags:

    * `payments`
    * `aiAssistant`
    * `onlineReviews`
    * `lowStockAlerts`
    * `tableBooking`
  * [ ] All code gated behind `if (FEATURE_FLAGS.xxx) { … }`.
  * [ ] API folders `/web/app/api/v1` (stable) and `/web/app/api/v2` (breaking/new).

* [ ] **Internationalization (i18n)**

  * [ ] `next-intl` installed and configured.
  * [ ] `/web/i18n/locales/ja.json`, `en.json`, `vi.json` contain translation keys.
  * [ ] `next.config.js` contains:

    ```js
    i18n: {
      locales: ["ja","en","vi"],
      defaultLocale: "ja"
    }
    ```
  * [ ] All UI text uses `useTranslations("KEY")` or `<FormattedMessage>` (no hard-coded English).

* [ ] **Rate Limiting & WAF**

  * [ ] Supabase Edge Functions implementing a rate limiter (e.g., token bucket) for:

    * `/api/v1/register`
    * `/api/v1/login`
    * `/api/v1/orders/create`
    * `/api/v1/bookings/create`
    * `/api/v2/chatbot`
  * [ ] Vercel Web Application Firewall (“Attack Challenge”) enabled on all routes.

* [ ] **CAPTCHA Integration**

  * [ ] hCaptcha (or reCAPTCHA) present on:

    * Signup (`/signup`)
    * Login (`/login`)
    * Forgot Password (`/forgot-password`)
  * [ ] Edge Function `/api/v1/verify-captcha` verifies tokens server-side before any credential logic.

* [ ] **Logging & Monitoring**

  * [ ] Supabase query logs and RLS failure logs enabled in project settings.
  * [ ] Vercel Analytics (or equivalent) tracks request rates, errors, geo data.
  * [ ] Custom `logs` table in Supabase with columns:

    * `id uuid`
    * `restaurant_id uuid`
    * `user_id uuid`
    * `level text` (`INFO`,`WARN`,`ERROR`,`DEBUG`)
    * `endpoint text`
    * `message text`
    * `metadata jsonb`
    * `created_at timestamptz`
  * [ ] All API routes call a `logEvent()` utility to record errors and key actions.

---

## 2. Database & RLS Requirements

* [ ] **Core Tables (all include `restaurant_id`)**

  * [ ] `restaurants`
  * [ ] `users`
  * [ ] `categories`
  * [ ] `menu_items`
  * [ ] `tables`
  * [ ] `employees`
  * [ ] `schedules`
  * [ ] `orders`
  * [ ] `order_items`
  * [ ] `bookings`
  * [ ] `reviews`
  * [ ] `feedback`
  * [ ] `inventory_items`
  * [ ] `analytics_snapshots`
  * [ ] `chat_logs`
  * [ ] `audit_logs`

* [ ] **Indexes & Constraints**

  * [ ] Composite index `(restaurant_id, status)` on `orders`.
  * [ ] Composite index `(restaurant_id, available)` on `menu_items`.
  * [ ] Composite index `(restaurant_id, stock_level)` on `inventory_items`.
  * [ ] Composite index `(restaurant_id, date)` on `analytics_snapshots`.
  * [ ] Unique constraint `restaurants.subdomain`.
  * [ ] Unique constraint `orders.session_id`.
  * [ ] Unique constraint `tables.qr_code` if stored.
  * [ ] Index on `(restaurant_id, booking_date)`.

* [ ] **Row-Level Security (RLS)**

  * [ ] RLS enabled on every tenant-scoped table (including `bookings` and `storage.objects`).
  * [ ] Policies require `restaurant_id = auth.jwt() ->> 'restaurant_id'` for `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
  * [ ] Revoke generic privileges: ensure only RLS policies grant access.
  * [ ] RLS on `storage.objects` restricts paths to `bucket_id = 'restaurant-uploads'` and prefix matching `auth.jwt()->>'restaurant_id'`.

* [ ] **Storage Bucket Organization**

  * [ ] Single bucket named `restaurant-uploads`.
  * [ ] File paths prefixed by `restaurants/{restaurant_id}/…` for:

    * Logos (`/logos/…`)
    * Menu item images (`/menu_items/{item_id}.jpg`)
    * Other uploads.
  * [ ] RLS policies on `storage.objects` enforce tenant access only.

* [ ] **Audit & Chat Logs**

  * [ ] `audit_logs` table with columns:

    * `id uuid PRIMARY KEY`
    * `restaurant_id uuid`
    * `user_id uuid`
    * `action text` (`INSERT`,`UPDATE`,`DELETE`)
    * `table_name text`
    * `record_id uuid`
    * `changes jsonb` (`{"old":…, "new":…}`)
    * `ip_address inet`
    * `created_at timestamptz DEFAULT now()`
  * [ ] Triggers on `orders`, `menu_items`, `inventory_items`, `bookings` call `log_changes()` to populate `audit_logs`.
  * [ ] RLS on `audit_logs`: `restaurant_id = auth.jwt()->>'restaurant_id'`.
  * [ ] `chat_logs` table exists; RLS restricts to that restaurant.

---

## 3. Tenant Registration & Subdomain Provisioning

* [ ] **Public Signup Page (`/signup`)**

  * [ ] Fields (with Zod validation):

    * `name` (non-empty, ≤100 chars)
    * `subdomain` (regex `^[a-z0-9-]{3,30}$`)
    * `email` (valid format)
    * `password` (≥8 chars, complexity)
    * `confirmPassword` (matches `password`)
    * `defaultLanguage` (`"ja" | "en" | "vi"`)
    * `captchaToken` (non-empty)
  * [ ] hCaptcha/reCAPTCHA widget integrated.

* [ ] **Subdomain Availability Check**

  * [ ] API: `GET /api/v1/subdomain/check?subdomain=…` returns `{ available: true/false, reason? }`.
  * [ ] Client uses debounce to show real-time feedback.

* [ ] **Register Endpoint (`/api/v1/register`)**

  * [ ] Validates inputs server-side with the same Zod schema.
  * [ ] Verifies `subdomain` is not already taken.
  * [ ] Creates Supabase Auth user (`supabaseAdmin.auth.admin.createUser`).
  * [ ] Inserts into `restaurants` with `(name, subdomain, default_language)`.
  * [ ] Updates Auth user’s custom claims: `app_metadata.restaurant_id = restaurant_id`, `role = "owner"`.
  * [ ] Inserts into `users` table with `(id = auth user ID, restaurant_id, role = "owner", name, email)`.
  * [ ] Returns `{ success: true, redirect: "https://{subdomain}.shop-copilot.com/ja/dashboard" }`.

* [ ] **Wildcard Subdomain Setup**

  * [ ] DNS: `CNAME *.shop-copilot.com → cname.vercel-dns.com`.
  * [ ] Vercel: wildcard domain `*.shop-copilot.com` and root `shop-copilot.com` configured.
  * [ ] Next.js middleware extracts `subdomain` from `Host` header and calls `/api/v1/restaurant/exists?subdomain=…` to validate.

* [ ] **Restaurant Existence API**

  * [ ] `GET /api/v1/restaurant/exists?subdomain=…` returns `{ exists: true/false }`.

---

## 4. Admin Dashboard (Web) Requirements

* [ ] **Authentication & Middleware**

  * [ ] `middleware.ts` extracts `subdomain` from `Host`; validates it via `/api/v1/restaurant/exists`.
  * [ ] `ProtectedLayout` wraps dashboard routes; redirects unauthenticated users to `/{subdomain}/{locale}/login`.
  * [ ] Supabase JWT includes `restaurant_id` and `role`.
  * [ ] All Supabase queries rely on RLS to return only tenant-scoped data.

* [ ] **Restaurant Profile & Settings**

  * [ ] Settings page shows and allows editing:

    * Restaurant Name
    * Logo (upload to `restaurants/{id}/logos/logo.png`; update `logo_url`)
    * Brand Color (hex code)
    * Default Language (`ja`/`en`/`vi`)
    * Contact Info (phone, address)
  * [ ] Zod validation on all fields.
  * [ ] Uploading a new logo replaces the previous file and updates `logo_url`.

* [ ] **Menu Management**

  * **Categories**

    * [ ] List categories sorted by `position`.
    * [ ] Create/Edit/Delete categories with Zod: `name` (non-empty, ≤50 chars), `position` (number).
    * [ ] Drag-and-drop to reorder categories; API `/api/v1/menu/reorder` updates `position`.
  * **Menu Items**

    * [ ] List menu items per category sorted by `position`.
    * [ ] Create/Edit form fields (with Zod):

      * `name_ja`, `name_en`, `name_vi` (all required)
      * `description_ja`, `description_en`, `description_vi` (optional)
      * `price` (numeric, ≥0)
      * `tags` (array of strings)
      * `available` (boolean)
      * `weekday_visibility` (array of ints 1–7)
      * `image` upload (PNG/JPEG, max 2 MB)
    * [ ] Store image under `restaurants/{restaurant_id}/menu_items/{item_id}.jpg`; update `image_url`.
    * [ ] Only items with `available = true` and `weekday_visibility` including today’s weekday appear on customer site.

* [ ] **Table Management & QR Codes**

  * [ ] List tables showing: `name`, optional `(position_x, position_y)`.
  * [ ] Create/Edit/Delete table form: `name` (required), optional coordinates.
  * [ ] “Generate QR” page that displays a QR code for URL:

    ```
    https://{subdomain}.shop-copilot.com/{locale}/customer/order?tableId={tableId}
    ```
  * [ ] “Download PNG” button to download the QR code image.

* [ ] **Employee & Schedule Management**

  * **Employees**

    * [ ] List employees (join `employees.user_id` → `users.name`, show `role`).
    * [ ] Create/Edit form: select existing user by `email` (must belong to same restaurant), assign `role` (`chef`, `server`, `cashier`, `manager`).
  * **Schedules**

    * [ ] Weekly calendar view (Mon–Sun, time slots 06:00–23:00).
    * [ ] Create/Edit/Delete shifts: select `employee_id`, `weekday` (1–7), `start_time`, `end_time`.
    * [ ] Zod validation: `start_time < end_time`, `weekday` ∈ 1–7.

* [ ] **Reports & Analytics**

  * **Dashboard Cards** (server-side, Supabase query):

    * [ ] Today’s Total Sales (from `analytics_snapshots` where `date = today`, `restaurant_id`).
    * [ ] Active Orders Count (`orders` where `restaurant_id` and `status != "completed"`).
    * [ ] Top-Selling Item Today (join `order_items` → `orders`, group by `menu_item_id`, order by SUM).
    * [ ] Low-Stock Alerts (`inventory_items` where `stock_level ≤ threshold`, `restaurant_id`).
  * **Sales Report Tab**

    * [ ] Date range selector (day/week/month).
    * [ ] Bar chart of revenue over selected range.
    * [ ] Pie (or bar) chart showing category breakdown of revenue.
    * [ ] Ability to export as CSV/PDF.
  * **Items Report Tab**

    * [ ] Table with columns: Item Name, Total Sold, Revenue, Avg Rating.
    * [ ] Sortable by any column.
    * [ ] Export to CSV/PDF.
  * **Feedback Report Tab**

    * [ ] List latest 50 reviews: Dish Name (localized), Rating, Comment, Date, Resolved status.
    * [ ] “Resolve” toggle button updates `reviews.resolved = true`.
  * **Recommendations Widget**

    * [ ] Fetch top 3 sellers from last 7 days via RPC `get_top_sellers_7days(restaurant_id, 3)`.
    * [ ] Display names and quantities.
    * [ ] “Apply to Next Week” button calls Edge Function `/api/v1/recommendations/apply` which:

      * [ ] Creates or fetches a “Featured” category for that restaurant.
      * [ ] Deletes existing items in “Featured”.
      * [ ] Copies top sellers into “Featured” with `weekday_visibility = [1..7]`.

---

## 5. Customer-Facing Ordering Site Requirements

* [ ] **Locale-Aware Routing & Layout**

  * [ ] Routes under `/{locale}/customer/...`, where `locale ∈ {"ja","en","vi"}`.
  * [ ] Customer layout includes:

    * Header with Restaurant Name, business hours (if set), and a `<LanguageSwitcher />`.
    * Footer with © year.

* [ ] **Session Creation via QR Scan API**

  * [ ] Edge Function `GET /api/v1/sessions/create?tableId={UUID}`:

    * Validates `tableId` belongs to that restaurant.
    * Inserts new `orders` row with:

      * `session_id = uuid_generate_v4()`
      * `status = "new"`
      * `restaurant_id` and `table_id`
    * Returns `{ sessionId }`.
    * 404 if `tableId` invalid.

* [ ] **Order Page** (`/order?sessionId={UUID}`)

  * [ ] Server-side validation:

    * `sessionId` exists in `orders` with `status = "new"` and correct `restaurant_id`.
    * If invalid/expired, render “Session expired” message.
  * [ ] Fetch `categories` and `menu_items` where:

    * `restaurant_id = currentRestaurantId`
    * `available = true`
    * `weekday_visibility` contains today’s weekday
  * [ ] Pass data to client.

* [ ] **Menu Rendering & Interaction**

  * [ ] Display categories as tabs or collapsible sections.
  * [ ] For each `menu_item`:

    * Show `image_url` (fallback if missing).
    * Show `name_{locale}`, `description_{locale}`.
    * Show `price` formatted via `Intl.NumberFormat(locale)`.
    * Show inline `StarRating` (average from `reviews`) or “No reviews yet.”
    * “＋”/“–” buttons to adjust quantity.
  * [ ] Maintain cart state in React state (e.g., Zustand or useState).

* [ ] **Filters & Sorting**

  * [ ] Buttons/dropdown to sort by:

    * Top Seller
    * Price (asc/desc)
    * Rating (high→low)
  * [ ] Top Seller data precomputed daily in `analytics_snapshots` or via a dedicated API.

* [ ] **Booking & Preordering**

  * [ ] “Book a Table” option integrated on menu or separate page (`/customer/book`).
  * [ ] Booking form fields (Zod validation):

    * `tableId` (UUID from URL or dropdown)
    * `customerName` (non-empty)
    * `customerContact` (email or phone)
    * `bookingDate` (today or future)
    * `bookingTime` (valid time string, within operating hours)
    * `partySize` (int ≥ 1)
    * Optional `preorderItems`: array of objects `{ menuItemId, quantity ≥1, notes? }`
  * [ ] POST `/api/v1/bookings/create`:

    * Validate inputs server-side.
    * Verify `tableId` belongs to this restaurant.
    * Check for conflicts: same `table_id`, same `booking_date`, same `booking_time`, and `status != "canceled"`. If conflict, return 409.
    * Insert into `bookings` with `status = "pending"`.
    * Return `{ success: true, bookingId }`.
  * [ ] Client shows “Booking Pending Approval” on success.
  * [ ] If `FEATURE_FLAGS.tableBooking = false`, hide “Book a Table” site-wide.

* [ ] **Cart & Checkout (Cash Only)**

  * [ ] Floating Cart button shows total items and total price.
  * [ ] “Checkout” button calls `POST /api/v1/orders/create` with:

    ```jsonc
    {
      "sessionId": "uuid",
      "items": [
        { "menuItemId": "uuid", "quantity": number, "notes": "string?" },
        …
      ]
    }
    ```
  * [ ] Server-side validation:

    * `sessionId` belongs to this restaurant and `status = "new"`.
    * Each `menuItemId` exists, belongs to this restaurant, and `available = true`.
    * `quantity ≥ 1`.
    * Calculate `total_amount` by fetching current prices.
    * Insert into `order_items` and update `orders.total_amount`.
    * Return `{ success: true, orderId }`.
  * [ ] Client redirects to `/thank-you?orderId={UUID}`.
  * [ ] After checkout, leave `orders.status = "new"` (staff marks “completed” in iOS) so session stays open until staff finish.

* [ ] **Session Expiry**

  * [ ] Once staff updates `orders.status = "completed"`, any reload of `/order?sessionId=…` shows “Session closed/expired.”
  * [ ] Invalid `sessionId` (malicious or another restaurant’s) returns 404/400.

* [ ] **Thank You & Reviews**

  * [ ] “Thank You” page displays order summary: Order ID, Table number, Items, Quantities, Total.
  * [ ] Each item shows a “Rate this Dish” link → `/review/{menuItemId}`.

* [ ] **Review Submission** (`/review/{menuItemId}`)

  * [ ] Form fields:

    * `rating` (int 1–5)
    * `comment` (optional text)
  * [ ] POST `/api/v1/reviews/create` with `{ menuItemId, rating, comment }`.
  * [ ] Validate: `menuItemId` belongs to this restaurant; `rating` ∈ 1–5.
  * [ ] Insert into `reviews` with `restaurant_id` and `user_id = null`.
  * [ ] Redirect back to menu or show “Thank you for your feedback.”
  * [ ] If `FEATURE_FLAGS.onlineReviews = false`, hide review links.

---

## 6. Staff iOS App Requirements

* [ ] **Xcode & Dependency Setup**

  * [ ] SwiftUI project `SOder.jp` created.
  * [ ] Swift Package Manager includes:

    * `supabase-swift`
    * `ESCManager` (or equivalent ESC/POS library)
    * (Optional v2) `stripe-ios` for PaymentSheet.
  * [ ] `Config.swift` contains:

    * `supabaseUrl`
    * `supabaseAnonKey`
    * `defaultLocale`
    * `maxRetryAttempts` for printing.
  * [ ] In `Info.plist`, add usage descriptions:

    * `NSBluetoothAlwaysUsageDescription`
    * `NSPhotoLibraryAddUsageDescription` (if saving any images).

* [ ] **Localization**

  * [ ] `Localizable.strings` for `ja`, `en`, `vi`.
  * [ ] All UI text uses `NSLocalizedString("KEY", comment: "")`.

* [ ] **Authentication Flow**

  * [ ] **LoginView**:

    * Fields: Email, Password, Subdomain.
    * On “Sign In”:

      * Call `supabase.auth.signIn(email: password:)`.
      * Extract JWT from `SupabaseAuthSession`, decode to get `restaurant_id` and `role`.
      * Store `jwtToken`, `restaurantId`, `userRole` in `@AppStorage`.
      * On success, navigate to `OrderListView`.
    * If login fails, show localized error.
  * [ ] **Persistence**:

    * If valid JWT exists on launch, skip login.
    * Handle JWT refresh automatically via Supabase SDK.
  * [ ] **Logout** clears stored credentials and returns to `LoginView`.

* [ ] **Realtime Order Subscription**

  * [ ] `OrderService` (ObservableObject) initializes `SupabaseClient(supabaseURL, supabaseKey: jwtToken)`.
  * [ ] Subscribe to Realtime channel `public:orders` filtered by `restaurant_id`.
  * [ ] Maintain `@Published var activeOrders: [Order]` containing orders where `status != "completed"`.
  * [ ] `updateOrderStatus(orderId, newStatus)` uses Supabase client to update `orders.status`.

* [ ] **Order List & Detail**

  * [ ] **OrderListView**:

    * Displays `activeOrders` sorted by `created_at DESC`.
    * Each row: Table number, Item count (e.g. “3 items”), Timestamp, Status badge (color-coded: New=blue, Preparing=orange, Ready=green, Completed=gray).
    * Tap navigates to `OrderDetailView(order: Order)`.
  * [ ] **OrderDetailView**:

    * Shows line items: item name (localized), quantity, notes.
    * Shows `totalAmount` formatted as currency for locale.
    * Status transition buttons:

      * If `status == "new"`: “Mark Preparing” → calls `OrderService.updateOrderStatus(..., "preparing")`.
      * If `status == "preparing"`: “Mark Ready” → `updateOrderStatus(..., "ready")`.
      * If `status == "ready"`: “Complete & Print” → `updateOrderStatus(..., "completed")` then call `PrinterManager.printReceipt(order)`.

* [ ] **Kitchen Grouping Board (iPad)**

  * [ ] **KitchenBoardView**:

    * Filters `order_items` from `activeOrders` with `status ∈ {"new","preparing"}` and `created_at ≥ now() - 600s`.
    * Groups by `menuItemId`, accumulating total `quantity` and set of `tableIds`.
    * Displays grid of cards with: dish name (localized), quantity, tables (e.g. “T3 ×2, T5 ×1”).
    * “Mark Done” button on each card: marks all underlying orders as `completed` (or updates related `order_items` and triggers a server-side process).
    * Optionally calls `PrinterManager.printGroupedSummary(group)`.

* [ ] **Printer Setup & Bluetooth ESC/POS**

  * [ ] **PrinterSetupView**:

    * Scans for BLE peripherals advertising ESC/POS service UUID.
    * Lists discovered devices with “Connect” button.
    * Displays connection status (Connected/Disconnected/Scanning/Error).
    * “Test Print” button sends a simple sample string.
  * [ ] **PrinterManager** (Singleton):

    * Manages CBCentralManager, scan, connect to ESC/POS printers.
    * Holds `writeCharacteristic: CBCharacteristic?`.
    * Methods:

      * `connect(to:)`
      * `printOrder(order: Order)`
      * `printReceipt(order: Order)`
      * `printGroupedSummary(group: GroupedItem)`
    * Converts text/receipt to ESC/POS commands and writes via BLE.
    * Retries on failure up to `maxRetryAttempts`.

* [ ] **Booking Management**

  * [ ] **BookingService** (ObservableObject):

    * Subscribes to Realtime channel `public:bookings` filtered by `restaurant_id`.
    * Publishes `@Published var bookings: [Booking]`.
    * Methods:

      * `updateBookingStatus(bookingId, newStatus)` calls Supabase to update `bookings.status`.
      * (Optional) `createBooking(...)` to insert directly or call the API.
  * [ ] **BookingListView**:

    * Lists `bookings` sorted by `booking_date` then `booking_time`, showing: Customer Name, Contact, Date & Time, Party Size, Status badge.
    * Tap navigates to `BookingDetailView(booking)`.
  * [ ] **BookingDetailView**:

    * Displays all booking fields plus any `preorder_items` (list each with localized item name, quantity, notes).
    * Buttons:

      * If `status == "pending"`: show “Confirm” → `BookingService.updateBookingStatus(..., "confirmed")`.
      * If `status ∈ {"pending","confirmed"}`: show “Cancel” → `updateBookingStatus(..., "canceled")`.
    * After update, refresh list.

* [ ] **Checkout & Receipt Printing (Cash Only)**

  * [ ] **CheckoutView** (for `status == "ready"`) displays:

    * Itemized list, table number, total amount.
    * “Confirm Payment (Cash) & Print Receipt” button:

      1. Calls `updateOrderStatus(order.id, "completed")`.
      2. Calls `PrinterManager.printReceipt(order)`.
    * On success, navigate back to `OrderListView`.

* [ ] **In-App Alerts & Feature Flag Checks**

  * [ ] If `FEATURE_FLAGS.lowStockAlerts = true`: subscribe to `inventory_items` Realtime events; when `stock_level ≤ threshold`, show local notification/banner.
  * [ ] If `FEATURE_FLAGS.enablePayments = false`: hide payment UI.
  * [ ] If `FEATURE_FLAGS.enableAI = false`: hide Chatbot UI.
  * [ ] If `FEATURE_FLAGS.tableBooking = false`: hide booking screens and menus.

---

## 7. Smart Reports, Feedback & Planner Requirements

* [ ] **Daily Snapshot Function & Scheduling**

  * [ ] SQL function `public.generate_daily_snapshot()` exists to:

    * For each `restaurant_id`, calculate `total_sales` for current date from `orders`.
    * Determine `top_seller_item` by summing `quantity` in `order_items` for today.
    * Count `orders_count` for today.
    * Insert into `analytics_snapshots(restaurant_id, date, total_sales, top_seller_item, orders_count)`.
  * [ ] `pg_cron` job scheduled to run daily at `00:00` calling `public.generate_daily_snapshot()`.

* [ ] **Low-Stock Trigger & Inventory Update**

  * [ ] Trigger function `adjust_inventory_on_order()` on `AFTER INSERT` of `order_items` that decrements `inventory_items.stock_level` by `NEW.quantity` for matching `restaurant_id` and `menu_item_id`.
  * [ ] RLS ensures only correct tenant’s inventory is adjusted.

* [ ] **Recommendations & Next-Week Planner**

  * [ ] RPC `public.get_top_sellers_7days(p_restaurant uuid, p_limit int)` returns top `p_limit` `(menu_item_id, total_sold)` over last 7 days.
  * [ ] RPC `public.apply_recommendations(p_restaurant uuid)` that:

    * Creates/fetches “Featured” category for that restaurant.
    * Deletes existing items in “Featured.”
    * Copies top sellers into “Featured” with `weekday_visibility = [1,2,3,4,5,6,7]`.
  * [ ] Edge Function `POST /api/v1/recommendations/apply` calls `public.apply_recommendations(restaurant_id)` and returns `{ success: true }`.
  * [ ] Recommendations widget in dashboard displays top 3 sellers and has “Apply to Next Week” button invoking the Edge Function.

* [ ] **Feedback Moderation UI**

  * [ ] Feedback Report page lists latest 50 `reviews` where `restaurant_id` matches:

    * Columns: Item Name (localized), Rating, Comment, Date formatted for locale, Resolved status.
    * “Resolve” button for each row calls `POST /api/v1/reviews/resolve` with `{ reviewId }`.
  * [ ] Edge Function `/api/v1/reviews/resolve` updates `reviews.resolved = true` for that `id`.
  * [ ] RLS on `reviews` ensures only that restaurant’s reviews are accessed.

---

## 8. Advanced Modules (Feature-Flagged)

* [ ] **Payments Integration (Stripe & PayPay)**

  * **Edge Functions & APIs**

    * [ ] Edge Function `/api/v2/payments/create-intent`:

      * Accepts `{ orderId, amount, currency }`.
      * Creates Stripe PaymentIntent with `amount * 100`, `currency`, `metadata={orderId}`.
      * Returns `{ clientSecret }`.
    * [ ] Next.js API `/api/v2/payments/create-intent` proxies to the Edge Function.
    * [ ] (Future) `/api/v2/payments/confirm` to confirm payment and update `orders.status = "completed"`.
  * **Web Checkout (if `FEATURE_FLAGS.payments = true`)**

    * [ ] Load `@stripe/stripe-js` in root layout.
    * [ ] Checkout page uses `<Elements>` and `<CardElement>`; on submit, calls `confirmCardPayment(clientSecret)`.
    * [ ] On success, call `/api/v1/orders/update` or `/api/v1/orders/complete` to set `status = "completed"`, then redirect to “Thank You.”
  * **iOS Checkout (if `FeatureFlags.enablePayments = true`)**

    * [ ] Fetch client secret from `/api/v2/payments/create-intent`.
    * [ ] Present Stripe `PaymentSheet` with client secret.
    * [ ] On success, update order status to `completed` and print receipt via `PrinterManager`.

* [ ] **AI Assistant (Chatbot)**

  * [ ] Edge Function `/api/v2/chatbot`:

    * Accepts `{ restaurantId, language, userQuery }`.
    * Fetches `menu_items` for that restaurant (localized name/description, price).
    * Constructs a prompt: list menu items, append user question.
    * Calls OpenAI’s `chat.completions` (model `gpt-4o`).
    * Logs prompt and token usage to `chat_logs` (columns: `restaurant_id`, `user_language`, `prompt_text`, `prompt_token_count`, `response_token_count`).
    * Returns `{ response: text }`.
  * [ ] RLS on `chat_logs` restricts access to that `restaurant_id`.
  * [ ] Web chat widget (if `FEATURE_FLAGS.aiAssistant = true`):

    * Floating button opens chat modal.
    * Text input for user question; on submit, call `/api/v2/chatbot`.
    * Display AI responses in chat UI.

* [ ] **Messaging Integrations (Future)**

  * [ ] Prepare placeholders/hooks for linking with Facebook Messenger, LINE, WhatsApp.
  * [ ] (Future) Edge Functions or webhook endpoints to receive messages and forward to in-dashboard UI.

* [ ] **Audit Logging & Advanced Monitoring**

  * [ ] SQL function `public.log_changes()` logs INSERT/UPDATE/DELETE on critical tables to `audit_logs`.
  * [ ] Triggers:

    * `trg_orders_audit` on `orders`
    * `trg_menu_items_audit` on `menu_items`
    * `trg_inventory_audit` on `inventory_items`
    * `trg_bookings_audit` on `bookings`
  * [ ] RLS on `audit_logs`: only allow `SELECT` when `restaurant_id = auth.jwt()->>'restaurant_id'`.
  * [ ] Alerts (external):

    * > 100 failed logins/hour → notify Slack/email.
    * > 10,000 orders/hour (possible DoS) → alert.
    * > 5% 500s in 10 minutes (across web requests) → alert.

* [ ] **API Versioning & Deprecation**

  * [ ] All new or breaking APIs placed under `/api/v2`.
  * [ ] v1 endpoints remain functional for at least 3 months after v2 launch.
  * [ ] Deprecation notices (in docs or response headers) for v1 endpoints.

---

## 9. Testing & CI/CD Verification

* [ ] **Web Unit & Integration Tests**

  * [ ] Jest + React Testing Library covers:

    1. **RLS Protection**: querying one restaurant’s data with another restaurant’s JWT returns empty.
    2. **Signup Flow**: invalid subdomain yields 409, invalid CAPTCHA yields 400.
    3. **Order Creation**: invalid `sessionId` returns 400; invalid `menuItemId` returns 400.
    4. **i18n Rendering**: with `locale="en"`, UI shows English strings; with `locale="vi"`, shows Vietnamese.
    5. **Feature Flags**: when `FEATURE_FLAGS.payments=false`, visiting checkout page hides payment UI and shows “Coming Soon.”

* [ ] **iOS Unit & UI Tests**

  * [ ] XCTest for:

    1. `OrderService.computeGrouping()`: grouping identical items correctly over last 10 minutes.
    2. `LoginView` snapshot in `ja` and `en`.
    3. `PrinterManager.printReceipt()` handles “no printer connected” gracefully (no crash).
    4. Feature flag checks: if `FeatureFlags.enablePayments=false`, `CheckoutView` does not display Stripe UI.

* [ ] **Security Scans & Dependency Checks**

  * [ ] In CI: `npm audit --prefix web --audit-level=high` fails on any high/critical.
  * [ ] In CI: `swiftlint --strict` fails on violations.

* [ ] **CI/CD Pipeline**

  * [ ] **Web** (Ubuntu runner):

    1. `actions/checkout@v3`
    2. Setup Node (v18)
    3. `npm install` in `/web`
    4. `npm run lint` and `npm run format:check` in `/web`
    5. `npm test` in `/web`
    6. `npm audit` in `/web`
    7. Deploy to Vercel:

       * On `develop`: staging (`staging.shop-copilot.com`) with staging Supabase keys.
       * On `main`: production (`shop-copilot.com`) with production Supabase keys.
  * [ ] **iOS** (macOS runner):

    1. `actions/checkout@v3`
    2. `brew install swiftlint`
    3. `swiftlint --strict`
    4. `xcodebuild -scheme SOder.jp -destination 'platform=iOS Simulator,name=iPhone 14' test | xcpretty`
    5. Archive & upload to TestFlight (using App Store Connect API key in GitHub secrets).

---

## How to Use This Checklist

1. **During Development**: Mark each box as soon as that requirement is fully implemented and tested.
2. **Before Release**: Review every unchecked item in a staging environment—deploy the web, run through flows, and use a physical iOS device for printing.
3. **AI-Assisted Verification**: Supply this list to your automated test agent so it can script API calls and UI flows to confirm each box.

By systematically ticking off every item, you guarantee that Shop-Copilot is secure, robust, and feature-complete from day one.
