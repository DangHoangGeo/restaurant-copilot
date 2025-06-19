CoOrder is a mobile-first, AI-augmented SaaS platform that empowers small restaurants to manage their entire operation—menus, orders, table bookings, staff, and analytics—entirely from a smartphone or tablet. Each restaurant gets its own subdomain (e.g. `restaurantabc.coorder`) and full data isolation via Supabase’s Row-Level Security. Customers can browse a multilingual menu, book a table, preorder dishes, place orders via QR codes, and leave reviews. Staff use an iOS app to receive and process orders in real time, print kitchen tickets and customer receipts over Bluetooth ESC/POS, manage bookings, and view smart analytics. Advanced features—including credit-card/PayPay payments, an AI-powered chatbot assistant, and messaging integrations—are feature-flagged for a smooth, iterative rollout.

---

## Key Features

* **Multi-Tenant Architecture & Subdomains**
  • Each restaurant registers its own subdomain (e.g. `yourbrand.coorder`).
  • Supabase RLS ensures total data isolation: users and staff in one restaurant cannot access another’s data.

* **Restaurant Admin Dashboard (Web)**
  • **Branding & Localization**—Set restaurant name, logo, brand colors, contact info, and default language (Japanese, English, Vietnamese).
  • **Menu Management**—Create/edit categories and items (multi-language names/descriptions, price, images, tags, availability per weekday, ratings, feedback).
  • **Table & QR Code Management**—Define tables, generate/download per-table QR codes for ordering or booking.
  • **Employee & Schedule Management**—Assign roles (chef/server/cashier/manager), create weekly shifts in a calendar interface.
  • **Booking & Pre-Ordering**—Accept table reservations, take preorders, check for time conflicts, and let staff confirm or cancel bookings.
  • **Reports & Analytics**—
     • **Dashboard Cards**: Today’s sales, active orders count, top-seller, low-stock alerts.
     • **Sales Reports**: Revenue charts (daily/weekly/monthly), category breakdown pie-chart.
     • **Items Report**: Quantity sold, revenue, average rating per item (sortable, exportable).
     • **Feedback Management**: View or resolve customer reviews.
     • **Recommendations & Next-Week Planner**: Generate top-seller suggestions, auto-populate a “Featured” category for next week.

* **Customer-Facing Website (Web)**
  • **Fully Multilingual** (ja, en, vi)—Menu, buttons, prompts, errors—all localized via `next-intl`.
  • **QR Code Ordering & Booking**—
     1. Scan table’s QR code → creates a new “session” tied to that table.
     2. Browse menu (only items available on the current weekday).
     3. Sort by “Top Seller”/price/rating, adjust quantity, see inline star ratings and review counts.
     4. Checkout (current version: cash; future: card/PayPay) or submit a booking with optional preorder.
     5. Session expires upon checkout or booking confirmation.
  • **Booking Flow**—Select date/time, party size, enter contact info, optionally preorder dishes. Staff see incoming bookings in their iOS app.
  • **Reviews**—After ordering or booking, customers can rate each dish (1–5 stars) and leave comments inline.

* **Staff iOS App**
  • **Realtime Order Management**—
     • Orders created on the web appear instantly via Supabase Realtime.
     • View order details (table, dishes, notes, total).
     • Transition status: New → Preparing → Ready → Completed.
     • “Complete & Print” sends an ESC/POS receipt to a Bluetooth printer.
  • **Kitchen Grouping Board (iPad-Optimized)**—Automatically group identical dishes from multiple orders placed in the last 10 minutes. Display quantity and table numbers; tap “Mark Done” to clear the group and print a consolidated ticket.
  • **Table Booking Management**—View pending bookings, confirm or cancel, view any preorders included, all in one screen.
  • **Low-Stock Alerts & Notifications**—Realtime subscriptions to inventory levels trigger in-app banners when stock falls below thresholds.
  • **Printer Setup & ESC/POS Print**—Scan for nearby ESC/POS Bluetooth printers, connect, test-print, and handle retry logic.
  • **Feature Flag Support**—If “Payments” or “AI Chat” flags are off, related UI elements remain hidden.

* **Advanced Modules (Feature-Flagged for Future Phases)**
  • **Online Payments (Stripe & PayPay)**—Web checkout with Stripe Elements or PayPay button; iOS PaymentSheet integration; webhooks confirm payment and trigger receipt printing.
  • **AI Assistant (Chatbot)**—Customers ask “What should I order?” in their language; the AI responds with tailored recommendations based on that restaurant’s current menu. All chat calls are rate-limited and logged.
  • **Messaging Integrations**—Link the dashboard to Facebook Messenger, LINE, WhatsApp, etc., for two-way communication (e.g., booking confirmations, customer support).

---

## Technology Stack

**Web (Admin Dashboard & Customer Site)**

* **Framework**: Next.js (App Router, TypeScript)
* **Styling**: Tailwind CSS
* **i18n**: next-intl (ja, en, vi)
* **QR Generation**: react-qr-code
* **Drag-and-Drop**: react-beautiful-dnd (or headless DnD)
* **Charts**: recharts (bar, pie)
* **Forms & Validation**: React Hook Form + Zod
* **Auth, Database, Realtime, Storage**: Supabase (Postgres + RLS + Auth + Storage + Realtime + Edge Functions + pg\_cron)
* **Deployment & CI**: Vercel (wildcard domains), GitHub Actions (lint, test, audit, deploy)

**Mobile (Staff iOS App)**

* **UI Framework**: SwiftUI
* **Realtime & Auth**: supabase-swift SDK
* **Bluetooth ESC/POS**: CoreBluetooth + ESCManager
* **Payments (future)**: Stripe iOS SDK (PaymentSheet)
* **Localization**: `Localizable.strings` (ja, en, vi)
* **Dependency Management**: Swift Package Manager
* **Linting**: SwiftLint
* **CI/CD (iOS)**: Xcodebuild + TestFlight (GitHub Actions)

---

## Security & Extensibility-by-Design

1. **Row-Level Security (RLS)**
   • Every table includes a `restaurant_id` column. RLS policies ensure that any SELECT/INSERT/UPDATE/DELETE is allowed only if `restaurant_id = auth.jwt()→>'restaurant_id'`.
   • Supabase Storage has a single bucket (`restaurant-uploads`) with RLS on object paths (e.g. `restaurants/{restaurant_id}/…`).

2. **Rate Limiting & WAF**
   • Critical Edge Functions (signup/login, order creation, booking creation, AI chatbot) use a token-bucket approach to throttle abusive traffic.
   • Vercel Web Application Firewall is enabled (“Attack Challenge”) for all routes.

3. **CAPTCHA on Auth Flows**
   • hCaptcha/reCAPTCHA on Signup, Login, and Forgot Password pages. Edge Function `/verify-captcha` validates tokens before any credential processing.

4. **Environment & Secrets**
   • All sensitive keys (Supabase Service-Role, Stripe Secret, OpenAI API Key, CAPTCHA Secret) live in CI/CD-injected environment variables (`.env` never committed).
   • Frontend bundles expose only `NEXT_PUBLIC_…` variables.

5. **Audit Logging**
   • Triggers on `orders`, `menu_items`, `inventory_items`, `bookings` capture `OLD` vs. `NEW` in an `audit_logs` table (tenant-scoped via RLS).
   • Supabase query logs and RLS failure logs are enabled. Custom `logs` table records errors and key actions (e.g. failed login, order creation).

6. **Feature Flags & API Versioning**
   • `/config/feature-flags.ts` in the repo centralizes flags (`payments`, `aiAssistant`, `onlineReviews`, `lowStockAlerts`, `tableBooking`).
   • All new/experimental features are gated behind flags to minimize refactoring.
   • Production APIs live under `/api/v1/…`; any breaking or major additions go under `/api/v2/…` with a deprecation schedule for v1.

---

## Getting Started

1. **Clone the Repository**

   ```bash
   git clone git@github.com:<your-org>/coorder.git
   cd coorder
   ```

2. **Environment Setup (Web)**

   * Copy `/web/.env.example → /web/.env.local` and fill in:

     ```
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     NEXT_PUBLIC_FEATURE_PAYMENTS=false
     NEXT_PUBLIC_FEATURE_AI=false
     NEXT_PUBLIC_FEATURE_REVIEWS=true
     NEXT_PUBLIC_FEATURE_LOWSTOCK=true
     NEXT_PUBLIC_FEATURE_TABLEBOOKING=true
     NEXT_PUBLIC_CAPTCHA_SITE_KEY=your-captcha-site-key
     NEXT_PRIVATE_CAPTCHA_SECRET=your-captcha-secret
     NEXT_PRIVATE_STRIPE_SECRET_KEY=your-stripe-secret
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable
     NEXT_PRIVATE_OPENAI_API_KEY=your-openai-key
     ```
   * Install dependencies:

     ```bash
     cd web
     npm install
     ```

3. **Supabase Setup**

   * Create a Supabase project (staging/production).
   * In SQL editor, run the migration scripts from `/infra/migrations/001_init.sql`, `/002_inventory_triggers.sql`, etc., to create all tables, RLS policies, triggers, and functions.
   * Enable Realtime and Storage for your project.
   * Create a second Supabase project for staging, repeat migrations there.

4. **Run the Web App Locally**

   ```bash
   cd web
   npm run dev
   ```

   • Visit `http://localhost:3000/signup` to register a new restaurant.
   • In development, use `app.usePreviewAuth` or manually set a JWT with Supabase Auth Helpers.

5. **iOS App Setup**

   * Open `mobile/SOder.jp.xcodeproj` in Xcode.
   * In `Info.plist`, add your Supabase URL and Anon Key under `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
   * Install SPM dependencies (Supabase-Swift, ESCManager).
   * Run the app on a Simulator or device (Bluetooth capabilities require a real device for printing).

6. **CI/CD & Deployment**

   * Configure GitHub Actions workflows:
     • **Web**: ESLint, Prettier, Jest tests, npm audit, deploy to Vercel (staging on `develop`, production on `main`).
     • **iOS**: SwiftLint, XCTest, archive, and upload to TestFlight (requires App Store Connect API key in GitHub secrets).

7. **Feature Flags & Versioning**

   * Toggling a new feature (e.g. payments) is as simple as setting `NEXT_PUBLIC_FEATURE_PAYMENTS=true` in Vercel’s environment variables.
   * New endpoints go under `/api/v2`, alongside v1. When stable, deprecate v1 after 3 months.

## **i18n Contribution Cheat-Sheet**

1. **Choose the right namespace**

   * Public: `landing`, `auth`, `legal`
   * Service-admin: `serviceAdmin/<feature>`
   * Restaurant owner: `owner/<page>`
   * Customer: `customer/<page>`
   * Global shared: `common`

2. **Don’t duplicate**

   * Search `/src/locales/**` first.
   * If it’s global (buttons/errors/weekdays), put it in `common.json`.

3. **File & key conventions**

   * Files: `/src/locales/en/<namespace>.json` (folders for sub-namespaces).
   * Keys: camelCase or nested objects, e.g.

     ```json
     { "titles": { "addItem": "Add Menu Item" } }
     ```

4. **Load it**

   * Add your `<namespace>.json` to `NAMESPACES` in `src/i18n.ts`.

5. **Use it**

   * No hard-coded text:

     ```ts
     const t = useTranslations('owner/menu');
     t('titles.addItem');
     ```
   * For globals: `useTranslations('common')`.

6. **New feature flow**

   1. Create `…/<namespace>.json`.
   2. Add to `NAMESPACES`.
   3. Move any truly shared strings to `common.json`.
   4. Use `useTranslations` in your component.
   5. Test all locales.


---

## Why CoOrder?

* **Mobile-First Staff Experience**: Kitchen staff and servers never need to juggle a laptop—everything works on iPads and iPhones.
* **Smart, AI-Ready Foundation**: Generative AI chatbot, payment integrations, messaging hooks, and advanced analytics can be adopted gradually via feature flags—no large refactor later.
* **Turnkey Multi-Language & Multi-Tenant**: Full Japanese/English/Vietnamese support from day one, with each restaurant on an auto-provisioned subdomain.
* **Built for Growth**: RLS, rate limiting, WAF, audit logging, and CI/CD ensure security and reliability at every scale.

With CoOrder, small restaurants can modernize their operations, delight customers with seamless ordering/booking, and leverage data-driven insights—all from the palm of their hand.
