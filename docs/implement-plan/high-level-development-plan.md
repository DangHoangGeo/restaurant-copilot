## A. High-Level Development Plan

1. **Foundational & Security Setup**
   Establish the project structure, configure linting/formatting, set up environment/secrets, enable feature flags and i18n, and implement rate limiting, WAF, CAPTCHA, logging, and monitoring.
   ‣ (Req 1.\*)

2. **Database Schema & Row-Level Security (RLS)**
   Create all core tables (restaurants, users, categories, etc.), including the new `bookings` table. Define indexes, constraints, and RLS policies so that every tenant’s data is isolated. Configure Supabase Storage with RLS on object paths.
   ‣ (Req 2.\*)

3. **Tenant Registration & Subdomain Provisioning**
   Build a public signup page with subdomain availability checks and CAPTCHA. Implement the `register` API to create Auth users, insert into `restaurants` and `users` tables, and set custom JWT claims. Configure wildcard DNS and Next.js middleware to route each subdomain to the correct tenant.
   ‣ (Req 3.\*)

4. **Admin Dashboard (Web)**
   Under each restaurant’s subdomain, build a protected dashboard allowing owners/managers to:

   * Edit restaurant profile and branding
   * Manage categories and menu items (with drag-drop ordering, per-weekday availability, multi-language fields, image uploads)
   * Manage tables and generate per-table QR codes
   * Manage employees and create weekly schedules
   * View detailed reports and analytics (dashboard cards, sales/item/feedback tabs, recommendation widget)
     All data operations must leverage RLS and feature flags.
     ‣ (Req 4.\*)

5. **Customer-Facing Website (Web)**
   Create a multilingual ordering site under `/{locale}/customer`, where:

   * Scanning a table’s QR code calls an API to create a new “session” (order)
   * The order page shows today’s categories/items (available and visible on that weekday), with sorting/filtering, quantity controls, and live star ratings
   * A “Book a Table” flow allows date/time selection, party size, contact info, and optional preorder. Staff see bookings in their app.
   * Cart and checkout (cash only) call an API to create `order_items` and keep `orders.status = "new"` until staff completes it
   * A Thank-You page shows the summary and links to leave item reviews
   * Review submission API inserts into `reviews`.
     Everything must respect RLS and feature flags.
     ‣ (Req 5.\*)

6. **Staff iOS App**
   Build a SwiftUI app that:

   * Logs in via Supabase Auth, caches JWT with `restaurant_id` and `role` (Chef/Server/Cashier/Manager)
   * Subscribes in real time to `orders` (filtered by `restaurant_id`) and maintains an active-orders list
   * Displays `OrderListView` and `OrderDetailView` to update statuses (New → Preparing → Ready → Completed) and print receipts over Bluetooth ESC/POS
   * Provides an “KitchenBoard” (iPad-optimised) that groups identical items from active orders in the last 10 minutes, with a “Mark Done” action and group ticket printing
   * Provides a “BookingListView” and “BookingDetailView” to confirm or cancel pending/confirmed bookings (with preorder viewing)
   * Offers a “CheckoutView” for Ready orders (cash only) that marks complete and prints a receipt
   * Allows scanning for and connecting to ESC/POS Bluetooth printers (PrinterSetupView + PrinterManager singleton)
   * Subscribes to `inventory_items` changes for low-stock alerts (feature-flagged)
   * Hides or shows Payments or AI Chat features based on flags.
     ‣ (Req 6.\*)

7. **Smart Reports, Feedback & Planner**
   Implement server-side routines (SQL functions and cron jobs) to capture daily snapshots, decrement inventory on each `order_items` insert, generate top-seller recommendations, and auto-populate a “Featured” category. Build front-end analytics pages (in the Admin Dashboard) for sales, items, feedback, and recommendations with charting and export options.
   ‣ (Req 7.\*)

8. **Advanced Modules (Feature-Flagged Future Work)**

   * **Payments (Stripe & PayPay)**: Build Edge Functions to create/confirm PaymentIntents; integrate Stripe Elements on the web and Stripe PaymentSheet on iOS (behind `FEATURE_FLAGS.payments`).
   * **AI Assistant (Chatbot)**: Build an Edge Function to fetch menu context, call OpenAI, log usage to `chat_logs`, and return AI responses; add a web chat widget (behind `FEATURE_FLAGS.aiAssistant`).
   * **Messaging Integrations** (Facebook Messenger, LINE, WhatsApp): scaffold webhook endpoints and UI placeholders for two-way messaging.
   * **Audit Logging & Monitoring Alerts**: Create triggers to log changes in critical tables to `audit_logs` (tenant-scoped via RLS); configure external alerts for suspicious patterns (failed logins, DoS, error spikes).
   * **API Versioning & Deprecation**: Keep foundational APIs under `/api/v1`, place all breaking/new features under `/api/v2`, and plan a 3-month deprecation for v1 endpoints.
     ‣ (Req 8.\*)

9. **Testing & CI/CD**

   * **Web**: Jest + React Testing Library tests covering RLS protection, signup flow, order creation validation, i18n rendering, feature-flag toggles. Add `npm audit`, ESLint, Prettier checks.
   * **iOS**: XCTest for `OrderService.computeGrouping()`, `LoginView` snapshots, `PrinterManager.printReceipt()` error handling, and feature-flag UI tests. Enforce SwiftLint.
   * **CI/CD Pipelines** (GitHub Actions):

     * **Web Job** (Ubuntu): checkout, install, lint, format, test, audit, deploy to Vercel (staging on `develop`, production on `main`).
     * **iOS Job** (macOS): checkout, install SwiftLint, run tests, archive, upload to TestFlight.
       ‣ (Req 9.\*)

---