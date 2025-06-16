Below is a comprehensive, sectioned checklist covering **every requirement** for CoOrder. Use this to mark off features as they are implemented and verified.

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

  * [ ] API: `GET /api/v1/restaurant/check-subdomain?subdomain=…` returns `{ available: true/false, reason? }`.
  * [ ] Client uses debounce to show real-time feedback.

* [ ] **Register Endpoint (`/api/v1/register`)**

  * [ ] Validates inputs server-side with the same Zod schema.
  * [ ] Verifies `subdomain` is not already taken.
  * [ ] Creates Supabase Auth user (`supabaseAdmin.auth.admin.createUser`).
  * [ ] Inserts into `restaurants` with `(name, subdomain, default_language)`.
  * [ ] Updates Auth user’s custom claims: `app_metadata.restaurant_id = restaurant_id`, `role = "owner"`.
  * [ ] Inserts into `users` table with `(id = auth user ID, restaurant_id, role = "owner", name, email)`.
  * [ ] Returns `{ success: true, redirect: "https://{subdomain}.coorder/ja/dashboard" }`.

* [ ] **Wildcard Subdomain Setup**

  * [ ] DNS: `CNAME *.coorder → cname.vercel-dns.com`.
  * [ ] Vercel: wildcard domain `*.coorder` and root `coorder` configured.
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
    https://{subdomain}.coorder/{locale}/customer/order?tableId={tableId}
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

### ✅ Completed Items

* [x] **Locale-Aware Routing & Layout**
  * [x] Routes under `/{locale}/customer/...`, where `locale ∈ {"ja","en","vi"}`.
  * [x] Customer layout includes header with Restaurant Name and `<LanguageSwitcher />`.
  * [x] Footer with © year implemented.

* [x] **Basic Session Management**
  * [x] Session creation flow with guest count dialog
  * [x] Session joining with passcode functionality
  * [x] localStorage persistence for session data
  * [x] URL parameter handling for sessionId

* [x] **Menu Rendering & Interaction**
  * [x] Display categories and menu items
  * [x] Show localized names and descriptions
  * [x] Price formatting via locale
  * [x] Cart state management in React
  * [x] Quantity adjustment buttons

### 🚧 Partially Implemented

* [ ] **Session Creation via QR Scan API**
  * [x] Basic session creation endpoint structure
  * [ ] ⚠️ **TODO**: Implement complete `/api/v1/customer/reviews/check` endpoint for validation
  * [ ] ⚠️ **TODO**: Implement `/api/v1/customer/reviews/join` endpoint
  * [ ] ⚠️ **TODO**: Proper error handling instead of alert() calls

* [ ] **Order Page** (`/order?sessionId={UUID}`)
  * [x] Server-side session validation structure
  * [x] Client-side session expired/invalid handling
  * [ ] ⚠️ **TODO**: Fix incomplete translation key `t("session.")` on line 234
  * [x] Fetch and display menu data with availability filtering

* [ ] **Feature Flag Integration**
  * [x] Basic feature flag structure in place
  * [ ] ⚠️ **TODO**: Move FEATURE_FLAGS from local definition to `/config/feature-flags.ts`
  * [ ] ⚠️ **TODO**: Implement AI chat functionality (currently flagged false)
  * [x] Table booking integration
  * [x] Advanced reviews integration

### ❌ Not Implemented Yet

* [ ] **Missing API Endpoints**
  * [ ] 🔴 **CRITICAL**: `GET /api/v1/customer/reviews/check` - session validation
  * [ ] 🔴 **CRITICAL**: `POST /api/v1/customer/reviews/join` - join existing session
  * [ ] 🔴 **CRITICAL**: `POST /api/v1/orders/create` - complete order creation
  * [ ] 🔴 **CRITICAL**: `POST /api/v1/customer/reviews/create` - review submission

* [ ] **Cart & Checkout (Cash Only)**
  * [ ] 🔴 **CRITICAL**: Complete order creation API integration
  * [ ] 🔴 **CRITICAL**: Server-side order validation
  * [ ] 🔴 **CRITICAL**: Proper error handling and user feedback
  * [ ] Redirect to thank-you page after successful order

* [ ] **Enhanced User Experience**
  * [ ] 🟡 **HIGH**: Toast notification system (replace alert() calls)
  * [ ] 🟡 **HIGH**: Loading states for all async operations
  * [ ] 🟡 **HIGH**: Error boundary components
  * [ ] 🟡 **HIGH**: Offline support and network error handling

* [ ] **Admin Panel Integration**
  * [ ] 🔴 **CRITICAL**: Remove placeholder "Redirecting to admin panel..." on line 325
  * [ ] Implement proper admin view or remove the case entirely

* [ ] **Progressive Web App Features**
  * [ ] 🟢 **MEDIUM**: PWA manifest and service worker
  * [ ] 🟢 **MEDIUM**: Offline menu browsing
  * [ ] 🟢 **MEDIUM**: Push notifications for order updates

* [ ] **Accessibility & Performance**
  * [ ] 🟡 **HIGH**: ARIA labels and keyboard navigation
  * [ ] 🟡 **HIGH**: Image optimization for menu items
  * [ ] 🟢 **MEDIUM**: Code splitting and lazy loading
  * [ ] 🟢 **MEDIUM**: Bundle size optimization

### 🧪 Testing Requirements

* [ ] **Unit Tests**
  * [ ] Session management logic
  * [ ] Cart functionality  
  * [ ] Component rendering with different locales
  * [ ] Feature flag conditional rendering

* [ ] **Integration Tests**
  * [ ] Complete ordering flow
  * [ ] Session joining flow
  * [ ] Error handling scenarios
  * [ ] API endpoint integration

* [ ] **End-to-End Tests**
  * [ ] QR code scan to order completion
  * [ ] Multi-user session joining
  * [ ] Review submission flow
  * [ ] Booking creation flow

---

### 🚨 Critical Issues Requiring Immediate Attention

1. **Type Safety**: Multiple unsafe type casting with `as MenuViewProps`, `as CheckoutViewProps` - needs proper type guards
2. **Error Handling**: Replace all `alert()` calls with proper UI feedback
3. **Missing APIs**: Several critical endpoints not implemented
4. **Translation**: Incomplete translation key causing runtime error
5. **Feature Flags**: Hardcoded flags need to be moved to central configuration

### 📋 Development Priority Order

**Week 1 (Critical Fixes)**
1. Fix translation key error
2. Implement session check API
3. Replace alert() with toast notifications
4. Add proper error boundaries

**Week 2 (Core Functionality)**  
1. Complete order creation API
2. Implement review submission API
3. Add loading states throughout
4. Fix type safety issues

**Week 3 (User Experience)**
1. Add PWA capabilities
2. Implement offline support
3. Enhance accessibility
4. Add comprehensive error handling

**Week 4 (Polish & Testing)**
1. Add comprehensive test suite
2. Performance optimization
3. Bundle analysis and optimization
4. Documentation updates

---
