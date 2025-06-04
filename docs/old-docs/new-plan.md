## High-Level Development Plan for Shop-Copilot

1. **Foundational Setup & Security Hardening**
   1.1. Monorepo & Tooling
   1.2. Environment & Secret Management
   1.3. Feature Flag & API Versioning Framework
   1.4. Internationalization (i18n) Ready
   1.5. Rate Limiting & WAF Configuration
   1.6. CAPTCHA Integration
   1.7. Logging & Monitoring Baseline

2. **Database Schema Design & RLS Policies**
   2.1. Review & Refine Table Structures
   2.2. Add Tenant‐scoping (`restaurant_id`) Everywhere
   2.3. Define Relationships, Indexes, and Audit Columns
   2.4. Enable Row-Level Security (RLS) and Write Policies
   2.5. Storage Bucket Organization and RLS

3. **Tenant Registration & Subdomain Provisioning**
   3.1. Public Signup Page with CAPTCHA
   3.2. Subdomain Availability API & Validation
   3.3. Create Supabase Auth User + Custom JWT Claims
   3.4. Insert `restaurants` and `users` Records
   3.5. DNS & Vercel Wildcard Domain Setup

4. **Next.js Web Admin Dashboard (v1)**
   4.1. Authentication Middleware & Protected Layout
   4.2. Restaurant Profile & Settings (Branding, Language)
   4.3. Menu Management (Categories, Items, Weekday Visibility)
   4.4. Table Management & QR Code Generation
   4.5. Employee & Schedule Management
   4.6. Reports & Analytics Dashboard (Sales, Inventory, Feedback)

5. **Customer-Facing Ordering Website (v1)**
   5.1. Locale-Aware Routing & Layout
   5.2. Session Creation via QR Scan API
   5.3. Dynamic Menu Rendering with Filters & Ratings
   5.4. Shopping Cart & Checkout API (Server-Side Validation)
   5.5. Session Expiration & Security Checks

6. **iOS Mobile App (Order Processing & Printing v1)**
   6.1. Xcode Project Setup & Supabase SDK Integration
   6.2. Authentication & JWT Claim Handling
   6.3. Realtime Order Subscription & RLS Compliance
   6.4. Order List & Detail Views with Status Transitions
   6.5. Kitchen Grouping Board (iPad) & Bluetooth ESC/POS Printing
   6.6. Checkout View & Receipt Printing (Cash Only)
   6.7. In-App Alerts & Feature Flag Checks

7. **Smart Reports, Feedback & Next-Week Planner**
   7.1. Daily Snapshot Edge Function & CRON Job
   7.2. Low-Stock Alerts & Inventory Management Hooks
   7.3. Recommendations Widget & Next-Week Menu Automation
   7.4. Review & Feedback Moderation UI

8. **Advanced Modules (v2+ behind Feature Flags)**
   8.1. Payment Gateway Integration (Stripe/PayPay)
   8.2. Generative AI Assistant (Chatbot)
   8.3. Audit Logging & Advanced Monitoring
   8.4. API Versioning (`/api/v2/…`) for Breaking Changes

9. **Testing, CI/CD & Deployment**
   9.1. Unit & Integration Tests (Web & iOS)
   9.2. Automated Security Scans (`npm audit`, SwiftLint)
   9.3. CI Pipeline (Lint, Test, Deploy to Staging)
   9.4. Staging & Production Environment Separation
   9.5. Feature Flag Rollout Strategy

---

## Detailed Implementation Steps

### 1. Foundational Setup & Security Hardening

#### 1.1. Monorepo & Tooling

* **Create Repository Skeleton**

  * Initialize Git repo: `shop-copilot`.
  * Create folders:

    ```
    /web           ← Next.js app  
    /mobile        ← Xcode SwiftUI project  
    /shared        ← Shared TS types, Zod schemas, constants  
    /infra         ← Supabase migrations & Edge Functions  
    /config        ← i18n messages, feature-flag definitions  
    ```
* **Install Linting & Formatting**

  * In `/web`: ESLint + Prettier.
  * In `/shared`: ESLint + Prettier.
  * In `/mobile`: SwiftLint.
  * Commit `.eslintrc.js`, `.prettierrc`, and `swiftlint.yml` with baseline rules.

#### 1.2. Environment & Secret Management

* **Define `.env.example`** in `/web`:

  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  NEXT_PUBLIC_FEATURE_PAYMENTS=false
  NEXT_PUBLIC_FEATURE_AI=false
  NEXT_PUBLIC_FEATURE_REVIEWS=false
  NEXT_PUBLIC_FEATURE_WAF=true
  NEXT_PUBLIC_CAPTCHA_SITE_KEY=
  NEXT_PRIVATE_CAPTCHA_SECRET=
  NEXT_PRIVATE_STRIPE_SECRET_KEY=
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
  NEXT_PRIVATE_OPENAI_API_KEY=
  ```
* **Configure CI/CD Secrets**

  * In GitHub Actions / Vercel: add real values for all the above.
  * Ensure `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PRIVATE_OPENAI_API_KEY`, and `NEXT_PRIVATE_STRIPE_SECRET_KEY` never appear in client bundles.

#### 1.3. Feature Flag & API Versioning Framework

* **Create `/config/feature-flags.ts`**:

  ```ts
  export interface FeatureFlags {
    payments: boolean;
    aiAssistant: boolean;
    onlineReviews: boolean;
    lowStockAlerts: boolean;
  }

  export const FEATURE_FLAGS: FeatureFlags = {
    payments: process.env.NEXT_PUBLIC_FEATURE_PAYMENTS === "true",
    aiAssistant: process.env.NEXT_PUBLIC_FEATURE_AI === "true",
    onlineReviews: process.env.NEXT_PUBLIC_FEATURE_REVIEWS === "true",
    lowStockAlerts: process.env.NEXT_PUBLIC_FEATURE_LOWSTOCK === "true",
  };
  ```
* **API Namespacing**

  * Under `/web/app/api/v1/…` place all current endpoints.
  * Future breaking changes (e.g., AI endpoints) go under `/api/v2/…`.

#### 1.4. Internationalization (i18n) Ready

* **Install `next-intl` in `/web`:** `npm install next-intl`.
* **Create `/web/i18n/locales/ja.json`, `en.json`, `vi.json`** with keys like:

  ```jsonc
  // ja.json
  {
    "SIGN_UP_TITLE": "店舗登録",
    "SUBDOMAIN_LABEL": "サブドメイン",
    "CHECK_AVAILABILITY": "利用可能か確認",
    "REGISTER_BUTTON": "登録する",
    "LOGIN_TITLE": "ログイン",
    "MENU_TITLE": "メニュー",
    "CHECKOUT_BUTTON": "注文を確定する"
    // ...add as needed
  }
  ```
* **Wrap Root Layout**
  In `/web/app/layout.tsx`:

  ```tsx
  import { NextIntlClientProvider } from "next-intl";
  import { FEATURE_FLAGS } from "../../config/feature-flags";

  export default async function RootLayout({ children, params }) {
    // params.locale is injected by Next.js “i18n” config
    const locale = params.locale || "ja";
    const messages = (await import(`../i18n/locales/${locale}.json`)).default;

    return (
      <html lang={locale}>
        <body>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            {/* Load Stripe.js only if payments is enabled */}
            {FEATURE_FLAGS.payments && (
              <script src="https://js.stripe.com/v3/"></script>
            )}
          </NextIntlClientProvider>
        </body>
      </html>
    );
  }
  ```
* **Enforce All Strings Use `useTranslations("KEY")`**

  * When writing any page or component, reference translation keys.
  * Example in sign-up form:

    ```tsx
    const t = useTranslations("SIGN_UP");
    <h1>{t("SIGN_UP_TITLE")}</h1>
    <label>{t("SUBDOMAIN_LABEL")}</label>
    ```
* **Next.js `next.config.js` i18n Section**:

  ```js
  module.exports = {
    i18n: {
      locales: ["ja", "en", "vi"],
      defaultLocale: "ja",
    },
    experimental: { middleware: true },
  };
  ```

#### 1.5. Rate Limiting & WAF Configuration

* **Supabase Edge Functions for API Endpoints**

  * Whenever creating custom API logic (e.g., `/api/v1/register`, `/api/v1/order/create`, `/api/v2/chatbot`), implement a rate limiter:

    1. In each Edge Function, read `x-forwarded-for` or `req.ip`.
    2. Use an in-memory or Redis-backed token bucket.
    3. If requests exceed threshold (e.g., 20 req/min/IP for signup, 50 req/min/IP for orders), reject with `429 Too Many Requests`.
* **Enable Vercel WAF**

  * Go to Vercel Dashboard → Settings → Security → Web Application Firewall.
  * Turn on “Attack Challenge” for all routes.
  * This ensures basic SQLi/XSS/CSRF patterns are blocked before hitting our code.

#### 1.6. CAPTCHA Integration

* **Install hCaptcha or reCAPTCHA** on `/web/app/signup/page.tsx`, `/web/app/login/page.tsx`, and `/web/app/forgot-password/page.tsx`.
* **Server-Side Verification**

  * Create `/web/app/api/v1/verify-captcha.ts` Edge Function (server-side only).
  * Expect `req.body.token` and call hCaptcha/Google API with `NEXT_PRIVATE_CAPTCHA_SECRET`.
  * Return `{ success: boolean, error?: string }`.
* **Client-Side Hook**

  * In Sign-Up and Login forms, before form submission:

    1. Load CAPTCHA widget (e.g., `<ReCAPTCHA sitekey={NEXT_PUBLIC_CAPTCHA_SITE_KEY} />`).
    2. On token received, call `/api/v1/verify-captcha` to confirm.
    3. Only proceed with actual signup/login if CAPTCHA validation passes.

#### 1.7. Logging & Monitoring Baseline

* **Supabase Logs**

  * In the Supabase dashboard, enable query logging and RLS failure logs.
* **Vercel Analytics**

  * Enable on `shop-copilot.com` to track request rates, 4xx/5xx spikes, geographic distribution.
* **Custom `logs` Table** in Supabase:

  ```sql
  CREATE TABLE IF NOT EXISTS logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid REFERENCES restaurants(id),
    user_id uuid REFERENCES users(id),
    level text CHECK (level IN ('INFO','WARN','ERROR','DEBUG')),
    endpoint text,
    message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
  );
  ```
* **Log Helper Utility** in `/web/lib/logger.ts`:

  ```ts
  import { supabaseAdmin } from "./supabaseAdmin";

  export async function logEvent({
    restaurantId,
    userId,
    level,
    endpoint,
    message,
    metadata,
  }: {
    restaurantId?: string;
    userId?: string;
    level: "INFO" | "WARN" | "ERROR" | "DEBUG";
    endpoint: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    await supabaseAdmin.from("logs").insert([
      { restaurant_id: restaurantId, user_id: userId, level, endpoint, message, metadata },
    ]);
  }
  ```
* **Usage in API Routes**:

  ```ts
  try {
    // your logic
  } catch (err) {
    await logEvent({
      restaurantId: currentRestaurantId,
      userId: userSession?.user?.id,
      level: "ERROR",
      endpoint: "/api/v1/orders/create",
      message: err.message,
      metadata: { stack: err.stack },
    });
    throw err;
  }
  ```

---

### 2. Database Schema Design & RLS Policies

#### 2.1. Review & Refine Table Structures

Below is the revised schema—every table explicitly includes `restaurant_id`, audit fields, and indices optimized for tenant-scoped access. Additional tables for chat logs and audit logs have been added.

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

> **Indexes & Constraints**: Add commonly queried columns—such as `(restaurant_id, status)` on orders; `(restaurant_id, available)` on `menu_items`; `(restaurant_id, stock_level)` on `inventory_items`—to speed up queries.
>
> **Audit Columns**: Each table has `created_at` and `updated_at` for consistency and potential soft-delete implementation.

#### 2.2. Add Tenant‐scoping (`restaurant_id`) Everywhere

* **Enforce NOT NULL** for `restaurant_id` in every table.
* **Foreign Key Constraints** cascade on delete to prevent orphan records.
* **Default Index** on `restaurant_id` for each table to optimize RLS filtering.

#### 2.3. Define Relationships, Indexes, and Audit Columns

* **Composite Indexes**

  * `(restaurant_id, category_id)` in `menu_items` for fast filtering by restaurant & category.
  * `(restaurant_id, status)` in `orders`, `(restaurant_id, stock_level)` in `inventory_items`.
* **Audit Logs**

  * Create triggers on critical tables (e.g., `orders`, `menu_items`, `inventory_items`) to insert into `audit_logs` on INSERT/UPDATE/DELETE with `OLD` and `NEW` JSONB snapshots.
  * Sample trigger function in Supabase SQL:

    ```sql
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
        NEW.restaurant_id,
        auth.uid(), -- from JWT claim
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(OLD.id, NEW.id),
        jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
        current_setting('request.ip', true)::inet
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    ```
  * Attach to `orders` table:

    ```sql
    CREATE TRIGGER trg_orders_audit
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION public.log_changes();
    ```

#### 2.4. Enable Row-Level Security (RLS) and Write Policies

* **Enable RLS on Each Table**:

  ```sql
  ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
  ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
  ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
  ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
  ```
* **JWT-Based Tenant Policy** (preferred approach):

  * After a successful login, Supabase issues a JWT containing `restaurant_id` and `role` in `app_metadata`.
  * **Policy Example for `menu_items`**:

    ```sql
    CREATE POLICY "Tenant can SELECT menu_items"
      ON menu_items
      FOR SELECT
      USING (
        restaurant_id = auth.jwt() ->> 'restaurant_id'
      );

    CREATE POLICY "Tenant can INSERT menu_items"
      ON menu_items
      FOR INSERT
      WITH CHECK (
        restaurant_id = auth.jwt() ->> 'restaurant_id'
      );

    CREATE POLICY "Tenant can UPDATE menu_items"
      ON menu_items
      FOR UPDATE
      USING (
        restaurant_id = auth.jwt() ->> 'restaurant_id'
      )
      WITH CHECK (
        restaurant_id = auth.jwt() ->> 'restaurant_id'
      );

    CREATE POLICY "Tenant can DELETE menu_items"
      ON menu_items
      FOR DELETE
      USING (
        restaurant_id = auth.jwt() ->> 'restaurant_id'
      );
    ```
* **Repeat Policies** for every table, replacing `menu_items` with the appropriate table name, and checking `restaurant_id` against `auth.jwt() ->> 'restaurant_id'`.
* **Revoke Generic Grants**:

  ```sql
  REVOKE ALL ON menu_items FROM authenticated;
  REVOKE ALL ON orders FROM authenticated;
  -- …and so on
  ```

#### 2.5. Storage Bucket Organization and RLS

* **Single Shared Bucket with Tenant Prefix** (bucket: `restaurant-uploads`):

  * File path pattern: `restaurants/{restaurant_id}/menu_items/{item_id}.jpg` or `restaurants/{restaurant_id}/logos/{filename}`.
* **Enable RLS on `storage.objects`**:

  ```sql
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Restrict storage access to own tenant"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'restaurant-uploads'
      AND substring(path from 1 for length(auth.jwt() ->> 'restaurant_id')) 
           = auth.jwt() ->> 'restaurant_id'
    );

  CREATE POLICY "Restrict storage insert to own tenant"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'restaurant-uploads'
      AND substring(path from 1 for length(auth.jwt() ->> 'restaurant_id')) 
           = auth.jwt() ->> 'restaurant_id'
    );

  REVOKE ALL ON storage.objects FROM authenticated;
  ```

---

### 3. Tenant Registration & Subdomain Provisioning

#### 3.1. Public Signup Page with CAPTCHA

* **Route:** `/web/app/[locale]/signup/page.tsx` (no auth required).
* **Form Fields**:

  1. **Restaurant Name** (`name`) – required, max length 100, validated backend-side.
  2. **Desired Subdomain** (`subdomain`) – required, regex `^[a-z0-9-]{3,30}$`.
  3. **Email** (`email`) – required, valid email format.
  4. **Password** (`password`) – required, min length 8, complexity enforced (letters, numbers).
  5. **Confirm Password** (`confirmPassword`) – must match `password`.
  6. **Default Language** (`defaultLanguage`) dropdown: options `ja`, `en`, `vi`.
  7. **CAPTCHA Token** (hidden input).
* **Client-Side Validation**:

  * Use a Zod schema imported from `/shared/schemas/signup.ts`:

    ```ts
    import { z } from "zod";

    export const signupSchema = z.object({
      name: z.string().min(1).max(100),
      subdomain: z.string().regex(/^[a-z0-9-]{3,30}$/),
      email: z.string().email(),
      password: z.string().min(8),
      confirmPassword: z.string().min(8),
      defaultLanguage: z.enum(["ja","en","vi"]),
      captchaToken: z.string().min(1),
    }).refine(data => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
    ```
  * Use React Hook Form + `zodResolver(signupSchema)`.

#### 3.2. Subdomain Availability API & Validation

* **Endpoint:** `/web/app/api/v1/subdomain/check.ts` (Edge Function).

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";

  export async function GET(req: NextRequest) {
    const subdomain = req.nextUrl.searchParams.get("subdomain") || "";
    if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
      return NextResponse.json({ available: false, reason: "invalid_format" });
    }
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("subdomain", subdomain)
      .single();
    return NextResponse.json({ available: !data });
  }
  ```
* **Client-Side Debounce**

  * In the signup form, as the user types `subdomain`, call this API after a 300ms debounce.
  * Show a loading spinner while checking, then display green check or red error with `reason`.

#### 3.3. Create Supabase Auth User + Custom JWT Claims

* **Endpoint:** `/web/app/api/v1/register.ts` (Edge Function).

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";
  import { logEvent } from "../../../lib/logger";
  import { signupSchema } from "../../../shared/schemas/signup";

  export async function POST(req: NextRequest) {
    // 1. Parse & validate body
    const body = await req.json();
    const parseResult = signupSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, errors: parseResult.error.flatten().fieldErrors }, 
        { status: 400 }
      );
    }
    const { name, subdomain, email, password, defaultLanguage } = parseResult.data;

    // 2. Check if subdomain still available
    const { data: existing } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("subdomain", subdomain)
      .single();
    if (existing) {
      return NextResponse.json({ success: false, error: "Subdomain taken" }, { status: 409 });
    }

    // 3. Create Auth user
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: {}, // set restaurant_id AFTER we create restaurant
    });
    if (authError) {
      await logEvent({ level: "ERROR", endpoint: "/api/v1/register", message: authError.message });
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
    }

    // 4. Insert restaurant & assign owner role
    const { data: restaurantData, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .insert([{ name, subdomain, default_language: defaultLanguage }])
      .select("id")
      .single();
    if (restErr) {
      // Attempt to rollback Auth user
      await supabaseAdmin.auth.admin.deleteUser(userData.id);
      await logEvent({ level: "ERROR", endpoint: "/api/v1/register", message: restErr.message, userId: userData.id });
      return NextResponse.json({ success: false, error: restErr.message }, { status: 500 });
    }

    // 5. Update Auth user with custom claim and role
    await supabaseAdmin.auth.admin.updateUserById(userData.id, {
      app_metadata: { restaurant_id: restaurantData.id, role: "owner" },
    });

    // 6. Insert into users table
    await supabaseAdmin
      .from("users")
      .insert([{ id: userData.id, restaurant_id: restaurantData.id, email, role: "owner", name }]);

    // 7. Return success with redirect URL
    const redirectUrl = `https://${subdomain}.shop-copilot.com/ja/dashboard`;
    return NextResponse.json({ success: true, redirect: redirectUrl });
  }
  ```

#### 3.4. Insert `restaurants` and `users` Records

* **Tables Involved**:

  * `restaurants`: insert `id`, `name`, `subdomain`, `default_language`.
  * `users`: insert `id` (from supabase Auth), `restaurant_id`, `email`, `role='owner'`, `name`.
* **JWT Claim**:

  * After inserting `restaurants`, call `supabaseAdmin.auth.admin.updateUserById(...)` to set `app_metadata.restaurant_id` = newly created `restaurants.id` and `role` = `"owner"`.
  * The next time the user logs in, their JWT includes `restaurant_id` and `role`, enabling RLS.

#### 3.5. DNS & Vercel Wildcard Domain Setup

* **DNS Record** (at your domain registrar):

  ```
  CNAME  *.shop-copilot.com  cname.vercel-dns.com
  ```
* **Vercel Configuration**:

  1. Go to Vercel project → Settings → Domains.
  2. Add wildcard domain: `*.shop-copilot.com`.
  3. Ensure the root domain `shop-copilot.com` is also added.
* **Next.js Middleware** already reads `Host` header to extract subdomain (Milestone 1.3).

---

### 4. Next.js Web Admin Dashboard (v1)

#### 4.1. Authentication Middleware & Protected Layout

* **Middleware**: `/web/middleware.ts`

  ```ts
  import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";
  import { FEATURE_FLAGS } from "../config/feature-flags";

  export async function middleware(req: NextRequest) {
    const host = req.headers.get("host") || "";
    const parts = host.split(".");
    const subdomain = parts.length > 2 ? parts[0] : null;

    // If no valid subdomain (or root domain), allow landing pages and signup/login
    if (!subdomain || subdomain === "shop-copilot") {
      return NextResponse.next();
    }

    // Validate subdomain exists in restaurants
    const res = await fetch(`https://${req.headers.get("host")}/api/v1/restaurant/exists?subdomain=${subdomain}`);
    const { exists } = await res.json();
    if (!exists) {
      return NextResponse.redirect("https://shop-copilot.com/404");
    }

    // Append restaurantSubdomain and locale to URL searchParams
    req.nextUrl.searchParams.set("restaurant", subdomain);

    // Ensure user is authenticated for protected routes
    const pathname = req.nextUrl.pathname;
    const publicPaths = ["/login", "/signup", "/api/v1"];
    if (!publicPaths.some((p) => pathname.startsWith(p))) {
      const token = req.cookies.get("sb:token")?.value;
      if (!token) {
        return NextResponse.redirect(`https://${subdomain}.shop-copilot.com/ja/login`);
      }
      // Let Supabase Auth handle token validation on the server side
    }

    return NextResponse.next();
  }

  export const config = {
    matcher: ["/((?!api|_next|static|favicon.ico).*)"],
  };
  ```
* **Protected Layout**: `/web/components/ProtectedLayout.tsx`

  ```tsx
  import { useSession, SessionContextProvider } from "@supabase/auth-helpers-react";
  import { supabase } from "../lib/supabaseClient";
  import { useRestaurantContext } from "../hooks/useRestaurantContext";
  import { useRouter } from "next/router";

  export function ProtectedLayout({ children }) {
    const { data: session } = useSession();
    const { restaurantSubdomain } = useRestaurantContext();
    const router = useRouter();

    if (typeof window !== "undefined" && !session) {
      router.replace(`/${restaurantSubdomain}/ja/login`);
      return null;
    }

    return <>{children}</>;
  }

  // Use in `/web/app/dashboard/layout.tsx`:
  // <SessionContextProvider supabaseClient={supabase}><ProtectedLayout>{children}</ProtectedLayout></SessionContextProvider>
  ```

#### 4.2. Restaurant Profile & Settings (Branding, Language)

* **Page:** `/web/app/[locale]/dashboard/settings/page.tsx`
* **Fetch Restaurant Info** (server-side):

  ```ts
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";
  import { getCurrentRestaurantId } from "../../../lib/tenant-utils";

  export default async function SettingsPage({ searchParams }) {
    const restaurantId = await getCurrentRestaurantId(searchParams);
    const { data: restaurant } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .single();
    return <SettingsForm restaurant={restaurant} />;
  }
  ```
* **SettingsForm** (client component):

  * Fields:

    1. **Restaurant Name** (text, max 100)
    2. **Logo Upload** (image file, max 2MB, PNG/JPEG)

       * On upload, store in Supabase Storage at `restaurants/{restaurant_id}/logo.png`.
    3. **Brand Color** (color picker)
    4. **Default Language** (dropdown: `ja`, `en`, `vi`)
    5. **Contact Info** (phone, address, optional)
  * **Validation**:

    * `name`: required, length 1–100.
    * `logo`: file type + size.
    * `brand_color`: valid hex code.
  * **Submit Handler**:

    ```ts
    const handleSubmit = async (values) => {
      const { data, error } = await supabase
        .from("restaurants")
        .update({
          name: values.name,
          default_language: values.defaultLanguage,
          brand_color: values.brandColor,
          contact_info: values.contactInfo,
        })
        .eq("id", restaurantId);
      // Upload logo separately if changed
      // Show success or error toast
    };
    ```

#### 4.3. Menu Management (Categories, Items, Weekday Visibility)

1. **Category List** `/web/app/[locale]/dashboard/menu/page.tsx`

   * **Server Component**:

     ```ts
     import { supabaseAdmin } from "../../../lib/supabaseAdmin";
     import { getCurrentRestaurantId } from "../../../lib/tenant-utils";

     export default async function MenuPage({ searchParams }) {
       const restaurantId = await getCurrentRestaurantId(searchParams);
       const { data: categories } = await supabaseAdmin
         .from("categories")
         .select("*, menu_items(*)")
         .eq("restaurant_id", restaurantId)
         .order("position", { ascending: true });
       return <CategoryList categories={categories} />;
     }
     ```
   * **CategoryList (Client Component)**:

     * Displays categories as draggable items (use `react-beautiful-dnd`).
     * Each category expands to show `menu_items` (pass them as props).
     * “New Category” button opens `/dashboard/menu/new` form.

2. **CategoryForm** `/web/app/[locale]/dashboard/menu/new/page.tsx` & `.../edit/[categoryId]/page.tsx`

   * Fields:

     * `name` (text, 1–50).
     * `position` (integer, optional; defaults to last).
   * **On Submit**:

     * If new: `INSERT INTO categories (restaurant_id, name, position)`.
     * If edit: `UPDATE categories SET name = ..., position = ... WHERE id = ... AND restaurant_id = ...`.
   * **Validation**:

     * Name required, unique within this restaurant (enforce in backend or with a UNIQUE partial index).

3. **MenuItemForm** `/web/app/[locale]/dashboard/menu/[categoryId]/items/new/page.tsx` & `.../edit/[itemId]/page.tsx`

   * Fields:

     * `name_ja`, `name_en`, `name_vi` (text, required)
     * `description_ja`, `description_en`, `description_vi` (textarea, optional)
     * `price` (number, ≥ 0)
     * `image` (upload to `restaurants/{restaurant_id}/menu_items/{item_id}.jpg`, max 2MB)
     * `tags` (multi-select from predefined list)
     * `available` (boolean)
     * `weekday_visibility` (checkbox group for 1–7)
   * **On Submit**:

     * If new:

       1. Generate `item_id = uuid_generate_v4()`.
       2. Upload image to Supabase Storage under path.
       3. `INSERT INTO menu_items` with all fields, `restaurant_id`, `category_id`.
     * If edit:

       1. If image changed, re-upload.
       2. `UPDATE menu_items SET … WHERE id = itemId AND restaurant_id = …`.
   * **Validation** (Zod schema `/shared/schemas/menu-item.ts`):

     ```ts
     export const menuItemSchema = z.object({
       categoryId: z.string().uuid(),
       name_ja: z.string().min(1),
       name_en: z.string().min(1),
       name_vi: z.string().min(1),
       description_ja: z.string().optional(),
       description_en: z.string().optional(),
       description_vi: z.string().optional(),
       price: z.number().nonnegative(),
       tags: z.array(z.string()),
       available: z.boolean(),
       weekdayVisibility: z.array(z.number().min(1).max(7)),
       imageFile: z.any().optional(), // validate type/size runtime
     });
     ```

4. **Drag-and-Drop Reordering**

   * On `CategoryList` and within each category’s `MenuItemList`: use `react-beautiful-dnd`.
   * **On Drag End**: collect new order of IDs, call `/api/v1/menu/reorder` Edge Function with payload `[{ id: uuid, position: newIndex }, …]`.
   * **Edge Function**: Update each record’s `position` in a single `UPDATE … FROM (VALUES …)` query transactionally.

#### 4.4. Table Management & QR Code Generation

1. **Table List** `/web/app/[locale]/dashboard/tables/page.tsx`

   * **Server Component**:

     ```ts
     const restaurantId = await getCurrentRestaurantId(searchParams);
     const { data: tables } = await supabaseAdmin
       .from("tables")
       .select("*")
       .eq("restaurant_id", restaurantId)
       .order("name", { ascending: true });
     return <TableList tables={tables} />;
     ```
   * **TableList (Client Component)**:

     * Show table `name`, “Generate QR” button, “Edit” and “Delete” icons.
2. **New/Edit Table Form** `/web/app/[locale]/dashboard/tables/new/page.tsx` & `.../edit/[tableId]/page.tsx`

   * Fields:

     * `name` (text, required)
     * `position_x`, `position_y` (optional integers if using floor plan)
   * **On Submit**:

     * If new: generate `table_id = uuid_generate_v4()`, upload no file.
     * Insert into `tables` with `restaurant_id`.
     * If edit: `UPDATE tables SET name = … WHERE id = tableId AND restaurant_id = …`.
3. **QR Code Generation** `/web/app/[locale]/dashboard/tables/[tableId]/qr/page.tsx`

   * **Server Component**: nothing special—just pass `tableId` and `restaurantId` to client.
   * **Client Component**:

     ```tsx
     import QRCode from "react-qr-code";
     const url = `https://${restaurantSubdomain}.shop-copilot.com/${locale}/customer/order?tableId=${tableId}`;
     return (
       <div>
         <QRCode value={url} size={200} />
         <button onClick={() => downloadQRCodeAsPNG() }>Download PNG</button>
       </div>
     );
     ```
   * **Download Logic**:

     * Render `<canvas>` via `react-qr-code` to get data URL, then create a temporary `<a>` link with `href=dataURL` and `download='table-{tableId}.png'`.

#### 4.5. Employee & Schedule Management

1. **Employee Directory** `/web/app/[locale]/dashboard/employees/page.tsx`

   * **Server Component**:

     ```ts
     const restaurantId = await getCurrentRestaurantId(searchParams);
     const { data: employees } = await supabaseAdmin
       .from("employees")
       .select("id, user_id, role, users(name)")
       .eq("restaurant_id", restaurantId)
       .callJoin("users on employees.user_id = users.id");
     return <EmployeeList employees={employees} />;
     ```
   * **EmployeeList (Client Component)**:

     * Show `user.name`, `role`, “Edit” and “Delete.”
2. **New/Edit Employee Form** `/web/app/[locale]/dashboard/employees/new/page.tsx` & `.../edit/[employeeId]/page.tsx`

   * Fields:

     * `userEmail` (dropdown or autocomplete from `/api/v1/users?restaurantId=…`)
     * `role` (select: `chef`, `server`, `cashier`, `manager`)
   * **On Submit**:

     * If new: find `user.id` by email (ensuring user exists and belongs to same restaurant).
     * Insert into `employees` with `restaurant_id`, `user_id`, `role`.
     * If edit: `UPDATE employees SET role = … WHERE id = employeeId AND restaurant_id = …`.
3. **Schedule Calendar** (later milestones for full drag-and-drop):

   * Scaffold `/web/app/[locale]/dashboard/employees/[employeeId]/schedule/page.tsx`.
   * Render a weekly grid (days Mon–Sun, hours 06:00–23:00).
   * **Client Interaction**:

     * Click & drag to create a shift block—post to `/api/v1/schedules/create`.
     * Show existing shifts with colored blocks—click block to edit or delete (calls `/api/v1/schedules/update` or `/delete`).
   * **Zod Schema** `/shared/schemas/schedule.ts`:

     ```ts
     export const scheduleSchema = z.object({
       employeeId: z.string().uuid(),
       weekday: z.number().min(1).max(7),
       startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
       endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
     });
     ```

#### 4.6. Reports & Analytics Dashboard (Sales, Inventory, Feedback)

1. **Reports Landing** `/web/app/[locale]/dashboard/reports/page.tsx`

   * Tabs: Sales, Items, Feedback, Recommendations.

2. **Sales Chart** `/web/components/SalesChart.tsx`

   * Uses `recharts` or `victory` to render:

     * Bar chart: daily revenue for last 7 days.
     * Pie chart: category breakdown for last month.
   * **Data Fetch** (server-side in `page.tsx`):

     ```ts
     const { data: snapshots } = await supabaseAdmin
       .from("analytics_snapshots")
       .select("*")
       .eq("restaurant_id", restaurantId)
       .gte("date", dateSevenDaysAgo)
       .order("date", { ascending: true });
     ```

3. **Items Report** `/web/components/ItemReportTable.tsx`

   * Columns: `Item Name`, `Total Sold`, `Revenue`, `Avg Rating`.
   * **Data Fetch**: join `order_items` → `orders` → filter by `restaurant_id & date range` → aggregate.
   * Render with a generic `/shared/components/DataTable` to allow sorting and filtering (e.g., by rating or date).

4. **Feedback List** `/web/app/[locale]/dashboard/reports/feedback/page.tsx`

   * Server fetch:

     ```ts
     const { data: reviews } = await supabaseAdmin
       .from("reviews")
       .select("id, menu_item_id, rating, comment, resolved, created_at, menu_items(name_ja, name_en, name_vi)")
       .eq("restaurant_id", restaurantId)
       .order("created_at", { ascending: false })
       .limit(50);
     ```
   * Client renders a table with “Resolve” toggle.
   * **Resolve Action**: POST `/api/v1/reviews/resolve` with `{ reviewId }`, update `resolved = true`.

5. **Recommendations Widget** `/web/components/MenuRecommendation.tsx`

   * Server logic (Edge Function `/infra/functions/generate_recommendations.ts`):

     ```ts
     export async function handler(req) {
       const { restaurantId } = req.body;
       // Query last 7 days:
       const { data } = await supabaseAdmin
         .rpc('get_top_sellers', { rest_id: restaurantId, days: 7, limit: 3 });
       return new Response(JSON.stringify({ topSellers: data }), { status: 200 });
     }
     ```
   * In `reports/page.tsx`, call this Edge Function and render cards:
     “Top Seller: <Dish Name> (sold X) — Suggest promoting next week.”
   * “Apply to Next Week” button calls `/api/v1/menu/apply_recommendations` which:

     * Reads top sellers.
     * Inserts or updates a `Featured` category (if not existing, create one).
     * Sets those items’ `weekday_visibility` to `[1,2,3,4,5,6,7]` (all days).

---

### 5. Customer-Facing Ordering Website (v1)

#### 5.1. Locale-Aware Routing & Layout

* **Folder Structure**: `/web/app/[locale]/customer/...`

  * Routing will be `/ja/customer/...`, `/en/customer/...`, `/vi/customer/...`.
* **Customer Layout** `/web/app/[locale]/customer/layout.tsx`

  ```tsx
  import { useTranslations } from "next-intl";
  import LanguageSwitcher from "../../../components/LanguageSwitcher";
  export default function CustomerLayout({ children, params }) {
    const t = useTranslations("CUSTOMER_LAYOUT");
    return (
      <div className="flex flex-col min-h-screen">
        <header className="p-4 bg-white shadow">
          <h1>{t("WELCOME")}</h1>
          <LanguageSwitcher />
        </header>
        <main className="flex-grow">{children}</main>
        <footer className="p-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Shop-Copilot
        </footer>
      </div>
    );
  }
  ```

#### 5.2. Session Creation via QR Scan API

* **Endpoint** `/web/app/api/v1/sessions/create.ts` (Edge Function)

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";
  import { getCurrentRestaurantId } from "../../../lib/tenant-utils";
  import { randomUUID } from "crypto";

  export async function GET(req: NextRequest) {
    const tableId = req.nextUrl.searchParams.get("tableId");
    const restaurantSubdomain = req.nextUrl.searchParams.get("restaurant");
    if (!tableId) return NextResponse.json({ error: "Missing tableId" }, { status: 400 });
    // Verify table belongs to restaurant
    const restaurantId = await getCurrentRestaurantId(req);
    const { data: table, error: tableErr } = await supabaseAdmin
      .from("tables")
      .select("id")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (tableErr || !table) {
      return NextResponse.json({ error: "Invalid table" }, { status: 404 });
    }
    // Create session (order row)
    const sessionId = randomUUID();
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert([{ restaurant_id: restaurantId, table_id: table.id, session_id: sessionId, status: "new" }])
      .select("id")
      .single();
    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }
    return NextResponse.json({ sessionId });
  }
  ```
* **Client-Side Redirect**

  * After scanning QR code (with a phone’s camera), the URL is:

    ```
    https://demo-ramen.shop-copilot.com/ja/customer/order?tableId=abcd-uuid
    ```
  * In `/web/app/[locale]/customer/order/page.tsx`, read `sessionId` from `GET /api/v1/sessions/create?tableId=abcd-uuid`.
  * Store `sessionId` in React state.

#### 5.3. Dynamic Menu Rendering with Filters & Ratings

* **Page** `/web/app/[locale]/customer/order/page.tsx`

  * **Server Component**:

    1. Read `sessionId` and verify via `/api/v1/sessions/validate?sessionId=…`.
    2. Fetch `categories` and `menu_items` filtered by `restaurant_id`, `available=true`, and `weekday_visibility` contains today’s weekday.
    3. Pass the data to a client component as props.
  * **Client Component**:

    * Renders tabs or collapsible categories.
    * For each `menu_item`, show:

      * `image_url` (fallback to placeholder).
      * `name_${locale}` and `description_${locale}`.
      * `price` formatted with Intl.NumberFormat using the locale.
      * `StarRating` from `/shared/components/StarRating.tsx`, which takes an average rating.
    * Provide “+” and “−” buttons to adjust quantity, storing selections in local state.
    * Show a “View Cart” button with total items and total price.

* **Ratings & Feedback Inline**:

  * Preload each item’s average rating via a separate query or include in server fetch:

    ```sql
    SELECT menu_item_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
    FROM reviews
    WHERE restaurant_id = $1
    GROUP BY menu_item_id;
    ```
  * Display stars accordingly; if no reviews, show “No reviews yet” in locale.

#### 5.4. Shopping Cart & Checkout API (Server-Side Validation)

* **Cart Drawer Component** `/web/components/CartDrawer.tsx`

  * Shows a list of selected items with quantity, subtotal per item, and “Checkout” button.
* **Create Order API** `/web/app/api/v1/orders/create.ts` (Edge Function)

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../lib/supabaseAdmin";
  import { z } from "zod";
  import { logEvent } from "../../../lib/logger";

  const createOrderSchema = z.object({
    sessionId: z.string().uuid(),
    items: z.array(z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
      notes: z.string().optional(),
    })).min(1),
  });

  export async function POST(req: NextRequest) {
    const body = await req.json();
    const parseResult = createOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, errors: parseResult.error.errors }, { status: 400 });
    }
    const { sessionId, items } = parseResult.data;

    // Validate session
    const { data: orderRow } = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id, status")
      .eq("session_id", sessionId)
      .single();
    if (!orderRow || orderRow.status !== "new") {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 400 });
    }
    const { id: orderId, restaurant_id: restaurantId } = orderRow;

    // Insert order items and compute total_amount
    let totalAmount = 0;
    const orderItemInserts = items.map((it) => {
      return {
        order_id: orderId,
        menu_item_id: it.menuItemId,
        quantity: it.quantity,
        notes: it.notes || null,
      };
    });
    // Fetch prices in one query
    const itemIds = items.map((it) => it.menuItemId);
    const { data: menuItems } = await supabaseAdmin
      .from("menu_items")
      .select("id, price")
      .in("id", itemIds)
      .eq("restaurant_id", restaurantId);
    const priceMap = Object.fromEntries(menuItems.map((m) => [m.id, m.price]));
    items.forEach((it) => {
      totalAmount += priceMap[it.menuItemId] * it.quantity;
    });

    // Start transaction: insert order_items, update orders.total_amount
    const { error: insertErr } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemInserts);
    if (insertErr) {
      await logEvent({ level: "ERROR", endpoint: "/api/v1/orders/create", message: insertErr.message });
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }
    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({ total_amount: totalAmount })
      .eq("id", orderId);
    if (updateErr) {
      await logEvent({ level: "ERROR", endpoint: "/api/v1/orders/create", message: updateErr.message });
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // Emit a Realtime event so iOS app picks up new order
    // Supabase automatically sends INSERT event on order_items table; if you need a direct signal, insert into a queue table or call an Edge Function.

    return NextResponse.json({ success: true, orderId });
  }
  ```
* **Client-Side Checkout Flow**:

  * On clicking “Checkout,” call this API.
  * Upon success, show a “Thank you” page `/web/app/[locale]/customer/thank-you/page.tsx` with order summary.
  * After checkout, the session’s `status` becomes “new” until kitchen marks it “completed.”
  * Session expiry is handled server-side: once all `order_items` inserted and items marked, if restaurant wishes to disallow further orders, update `orders.status` to `"completed"` when the app triggers receipt printing.

#### 5.5. Session Expiration & Security Checks

* **Validate Session on Page Load** `/web/app/[locale]/customer/order/page.tsx` (server component):

  ```ts
  const sessionId = searchParams.sessionId;
  const restaurantId = await getCurrentRestaurantId(searchParams);
  const { data: orderRow } = await supabaseAdmin
    .from("orders")
    .select("status, created_at")
    .eq("session_id", sessionId)
    .eq("restaurant_id", restaurantId)
    .single();
  // If orderRow.status === 'completed', render “Session expired” page.
  // Else proceed to fetch menu.
  ```
* **Edge Case Handling**:

  * If the user tries to reopen `order?sessionId=…` after checkout, show a “Session closed” message and grey out all UI.
  * If someone tampers with `sessionId` (i.e., a random GUID), server returns 404 or 400.

---

### 6. iOS Mobile App (Order Processing & Printing v1)

#### 6.1. Xcode Project Setup & Supabase SDK Integration

* **Create Xcode Project**

  1. Open Xcode → New Project → App → Name: `ShopCopilotStaff`.
  2. Interface: SwiftUI, Language: Swift, Devices: iPhone & iPad.
* **Add Swift Package Dependencies**

  * **Supabase iOS SDK**:

    * URL: `https://github.com/supabase-community/supabase-swift.git`
  * **ESC/POS Printer Library** (e.g., `https://github.com/KazuCocoa/ESCManager`)
  * **Alamofire** (optional, for custom networking if needed)
* **Config.swift** in `/mobile/ShopCopilotStaff/Models`:

  ```swift
  struct Config {
    static let supabaseUrl = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as! String
    static let supabaseAnonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as! String
    static let defaultLocale = "ja"
    static let maxRetryAttempts = 3
  }
  ```
* **Info.plist** Settings:

  * `NSBluetoothAlwaysUsageDescription`: description string
  * `NSPhotoLibraryAddUsageDescription`: if you allow image saving

#### 6.2. Authentication & JWT Claim Handling

* **LoginView\.swift** (SwiftUI)

  * TextFields: `email`, `password`, `subdomain`.
  * On “Sign In” tap:

    ```swift
    Task {
      let client = SupabaseClient(supabaseURL: Config.supabaseUrl, supabaseKey: Config.supabaseAnonKey)
      do {
        let authResponse = try await client.auth.signIn(email: email, password: password)
        guard let session = authResponse.session else { return }
        // Extract JWT
        let jwt = session.accessToken
        // Decode JWT to read custom claims: restaurant_id, role
        let claims = try decodeJWT(jwt)
        let restaurantId = claims["restaurant_id"] as? String ?? ""
        let role = claims["role"] as? String ?? ""
        // Store in AppStorage
        await MainActor.run {
          self.authenticated = true
          self.restaurantId = restaurantId
          self.userRole = role
          self.jwt = jwt
        }
      } catch {
        // Show error alert
      }
    }
    ```
  * `decodeJWT(_:)` helper to parse base64 payload and JSON decode.

#### 6.3. Realtime Order Subscription & RLS Compliance

* **OrderService.swift** (ObservableObject)

  ```swift
  import Supabase

  class OrderService: ObservableObject {
    @Published var activeOrders: [Order] = []
    private var client: SupabaseClient
    private var subscription: RealtimeChannel?

    init(jwt: String, restaurantId: String) {
      self.client = SupabaseClient(supabaseURL: Config.supabaseUrl, supabaseKey: jwt)
      subscribeToOrders(restaurantId: restaurantId)
    }

    func subscribeToOrders(restaurantId: String) {
      subscription = client.realtime.channel("restaurant_orders_\(restaurantId)")
        .on(.postgresChanges, { [weak self] payload in
          guard let newOrder = payload.newObj else { return }
          // Parse newOrder into Order model
          // Only insert if status != "completed"
          if newOrder["status"] as? String != "completed" {
            self?.activeOrders.append(Order(from: newOrder))
          }
        })
        .subscribe()
    }

    func updateOrderStatus(orderId: String, newStatus: String) async throws {
      let response = try await client.database
        .from("orders")
        .update(values: ["status": newStatus])
        .eq(column: "id", value: orderId)
        .execute()
      if let error = response.error { throw error }
    }
  }

  struct Order: Identifiable {
    let id: String
    let tableId: String
    let items: [OrderItem]
    let totalAmount: Double
    var status: String
    let createdAt: Date

    init(from dict: [String: Any]) {
      id = dict["id"] as! String
      tableId = dict["table_id"] as! String
      totalAmount = (dict["total_amount"] as? Double) ?? 0.0
      status = dict["status"] as! String
      createdAt = ISO8601DateFormatter().date(from: dict["created_at"] as! String) ?? Date()
      items = [] // Fetch associated order_items separately or via a join subscription
    }
  }

  struct OrderItem: Identifiable {
    let id: String
    let menuItemId: String
    let quantity: Int
    let notes: String?
  }
  ```

* **RLS Compliance**

  * Because the JWT’s `restaurant_id` is used as the Supabase anon key, all queries from this client automatically respect RLS policies—fetching only rows where `restaurant_id` matches.
  * On `updateOrderStatus`, the middleware and RLS check ensure only orders for this restaurant can be updated.

#### 6.4. Order List & Detail Views with Status Transitions

* **OrderListView\.swift** (SwiftUI)

  ```swift
  struct OrderListView: View {
    @StateObject var orderService: OrderService

    var body: some View {
      NavigationView {
        List(orderService.activeOrders) { order in
          NavigationLink(destination: OrderDetailView(order: order, service: orderService)) {
            HStack {
              Text("Table \(order.tableId)")
              Spacer()
              Text(order.status.capitalized)
                .font(.caption)
                .padding(4)
                .background(statusColor(order.status))
                .cornerRadius(4)
            }
          }
        }
        .navigationTitle("Active Orders")
      }
    }

    func statusColor(_ status: String) -> Color {
      switch status {
      case "new": return .blue
      case "preparing": return .orange
      case "ready": return .green
      default: return .gray
      }
    }
  }
  ```
* **OrderDetailView\.swift** (SwiftUI)

  ```swift
  struct OrderDetailView: View {
    @State var order: Order
    @ObservedObject var service: OrderService

    var body: some View {
      VStack(alignment: .leading) {
        Text("Table \(order.tableId)")
          .font(.title2)
        List(order.items) { item in
          HStack {
            Text(item.menuItemName)
            Spacer()
            Text("x\(item.quantity)")
          }
        }
        Text("Total: ¥\(order.totalAmount, specifier: "%.2f")")
          .font(.headline)
          .padding(.top)
        HStack {
          if order.status == "new" {
            Button("Mark Preparing") { updateStatus("preparing") }
              .buttonStyle(.borderedProminent)
          }
          if order.status == "preparing" {
            Button("Mark Ready") { updateStatus("ready") }
              .buttonStyle(.borderedProminent)
          }
          if order.status == "ready" {
            Button("Complete & Print") { completeAndPrint() }
              .buttonStyle(.borderedProminent)
          }
        }
        Spacer()
      }
      .padding()
      .navigationTitle("Order Details")
    }

    func updateStatus(_ newStatus: String) {
      Task {
        do { try await service.updateOrderStatus(orderId: order.id, newStatus: newStatus)
          order.status = newStatus
        } catch {
          // Show error
        }
      }
    }

    func completeAndPrint() {
      updateStatus("completed")
      PrinterManager.shared.printReceipt(order: order)
    }
  }
  ```

#### 6.5. Kitchen Grouping Board (iPad) & Bluetooth ESC/POS Printing

* **KitchenBoardView\.swift** (SwiftUI)

  ```swift
  struct KitchenBoardView: View {
    @ObservedObject var orderService: OrderService
    @State private var groupedItems: [GroupedItem] = []

    var body: some View {
      ScrollView {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 200))]) {
          ForEach(groupedItems) { group in
            VStack {
              Text(group.itemName).font(.headline)
              Text("Qty: \(group.quantity)").font(.subheadline)
              Text("Tables: \(group.tables.joined(separator: ", "))")
                .font(.footnote)
              Button("Mark Done") { markGroupDone(group) }
                .buttonStyle(.bordered)
            }
            .padding()
            .background(Color(UIColor.systemGray6))
            .cornerRadius(8)
          }
        }
        .padding()
      }
      .onAppear(perform: computeGrouping)
      .navigationTitle("Kitchen Board")
    }

    func computeGrouping() {
      // Group all order items with status "new" or "preparing" in last 10 minutes
      let cutoff = Date().addingTimeInterval(-600)
      var temp: [String: GroupedItem] = [:]
      for order in orderService.activeOrders {
        if let createdAt = order.createdAt, createdAt >= cutoff {
          for item in order.items {
            let key = item.menuItemId
            if temp[key] == nil {
              temp[key] = GroupedItem(
                itemId: item.menuItemId,
                itemName: item.menuItemName,
                quantity: item.quantity,
                tables: [order.tableId]
              )
            } else {
              temp[key]!.quantity += item.quantity
              temp[key]!.tables.insert(order.tableId)
            }
          }
        }
      }
      groupedItems = Array(temp.values)
    }

    func markGroupDone(_ group: GroupedItem) {
      Task {
        for tableId in group.tables {
          // Fetch associated orders by tableId & itemId, update each to "completed"
          // Or implement a join query on server for efficiency
          // Then call service.updateOrderStatus(orderId: order id, newStatus: "completed")
        }
        // Optionally print group summary
        PrinterManager.shared.printGroupedSummary(group: group)
        computeGrouping() // refresh
      }
    }
  }

  struct GroupedItem: Identifiable {
    let id = UUID()
    let itemId: String
    let itemName: String
    var quantity: Int
    var tables: Set<String>
  }
  ```
* **PrinterManager.swift** (Singleton)

  ```swift
  class PrinterManager: NSObject {
    static let shared = PrinterManager()
    private var peripheral: CBPeripheral?
    // ESC/POS communication code

    func connectToPrinter() {
      // Use CoreBluetooth to scan, connect, and store `peripheral`
    }

    func printOrder(order: Order) {
      guard let printer = peripheral else { return }
      let receipt = buildReceipt(order: order)
      sendESCCommands(receipt, to: printer)
    }

    func printReceipt(order: Order) {
      printOrder(order: order) // same as printOrder for simplicity
    }

    func printGroupedSummary(group: GroupedItem) {
      guard let printer = peripheral else { return }
      var summary = "Grouped Items Summary\n"
      summary += "\(group.itemName) x\(group.quantity)\n"
      summary += "Tables: \(group.tables.joined(separator: ", "))\n"
      summary += "---------------------\n"
      sendESCCommands(summary, to: printer)
    }

    private func sendESCCommands(_ text: String, to printer: CBPeripheral) {
      // Convert `text` to ESC/POS bytes and send via BLE
    }
  }
  ```
* **Printer Setup Screen** `/mobile/ShopCopilotStaff/Views/PrinterSetupView.swift`

  * List available BLE devices matching ESC/POS service UUID.
  * “Connect” button for each.
  * Show connection status icon.
  * Test-print sample text.

#### 6.6. Checkout View & Receipt Printing (Cash Only)

* **View:** `/mobile/ShopCopilotStaff/Views/CheckoutView.swift`

  ```swift
  struct CheckoutView: View {
    @ObservedObject var orderService: OrderService
    let order: Order

    var body: some View {
      VStack {
        List(order.items) { item in
          HStack {
            Text(item.menuItemName)
            Spacer()
            Text("x\(item.quantity)")
          }
        }
        HStack {
          Text("Total:").font(.headline)
          Spacer()
          Text("¥\(order.totalAmount, specifier: "%.2f")").font(.headline)
        }
        .padding()
        Button("Confirm Payment (Cash) & Print") {
          Task {
            do {
              try await orderService.updateOrderStatus(orderId: order.id, newStatus: "completed")
              PrinterManager.shared.printReceipt(order: order)
            } catch {
              // Show error
            }
          }
        }
        .buttonStyle(.borderedProminent)
        Spacer()
      }
      .navigationTitle("Checkout")
    }
  }
  ```

#### 6.7. In-App Alerts & Feature Flag Checks

* **Alerts for Low-Stock & Top Sellers**

  * Extend `OrderService` or create `AlertsService` to subscribe to `inventory_items` changes via Supabase Realtime:

    ```swift
    if FEATURE_FLAGS.lowStockAlerts {
      subscription = client.realtime.channel("inventory_alerts_\(restaurantId)")
        .on(.postgresChanges, { payload in
          let newStock = payload.newObj["stock_level"] as? Int ?? 0
          let threshold = payload.newObj["threshold"] as? Int ?? 0
          if newStock <= threshold {
            showLocalNotification(title: "Low Stock", body: "\(payload.newObj["menu_item_id"]) is low")
          }
        })
        .subscribe()
    }
    ```
* **Feature Flag Handling in UI**

  * In SwiftUI views, wrap optional features with:

    ```swift
    if FeatureFlags.enablePayments {
      // Show payment UI
    }
    if FeatureFlags.enableAI {
      // Show Chatbot test screen
    }
    ```

---

### 7. Smart Reports, Feedback & Next-Week Planner

#### 7.1. Daily Snapshot Edge Function & CRON Job

* **SQL Function** `/infra/functions/generate_daily_snapshot.sql`

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
* **CRON Job** (Supabase Dashboard → Extensions → pg\_cron):

  ```sql
  SELECT cron.schedule('0 0 * * *', $$SELECT public.generate_daily_snapshot();$$);
  ```

#### 7.2. Low-Stock Alerts & Inventory Management Hooks

* **Trigger** on `order_items` insert:

  ```sql
  CREATE OR REPLACE FUNCTION adjust_inventory_on_order()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE inventory_items
    SET stock_level = stock_level - NEW.quantity
    WHERE restaurant_id = NEW.restaurant_id
      AND menu_item_id = NEW.menu_item_id;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_decrement_inventory
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION adjust_inventory_on_order();
  ```
* **Realtime Notification** is handled by iOS subscription to `inventory_items` changes.

#### 7.3. Recommendations Widget & Next-Week Menu Automation

* **Edge Function** `/infra/functions/get_top_sellers_7days.sql`

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
* **Apply Recommendations Edge Function** `/infra/functions/apply_recommendations.sql`

  ```sql
  CREATE OR REPLACE FUNCTION public.apply_recommendations(p_restaurant uuid)
  RETURNS void AS $$
  DECLARE
    rec RECORD;
    featuredCat uuid;
  BEGIN
    -- Create "Featured" category if not exists
    SELECT id INTO featuredCat
    FROM categories
    WHERE restaurant_id = p_restaurant AND name = 'Featured'
    LIMIT 1;
    IF NOT FOUND THEN
      INSERT INTO categories (restaurant_id, name, position)
      VALUES (p_restaurant, 'Featured', 0)
      RETURNING id INTO featuredCat;
    END IF;

    -- Clear existing Featured items
    DELETE FROM menu_items
    WHERE restaurant_id = p_restaurant AND category_id = featuredCat;

    -- Get top 3 sellers
    FOR rec IN SELECT * FROM get_top_sellers_7days(p_restaurant, 3) LOOP
      INSERT INTO menu_items (id, restaurant_id, category_id, name_ja, name_en, name_vi, description_ja, description_en, description_vi, price, tags, available, weekday_visibility)
      SELECT id, restaurant_id, featuredCat, name_ja, name_en, name_vi, description_ja, description_en, description_vi, price, tags, true, ARRAY[1,2,3,4,5,6,7]
      FROM menu_items
      WHERE id = rec.menu_item_id;
    END LOOP;
  END;
  $$ LANGUAGE plpgsql;
  ```
* **Dashboard Button** calls HTTP Edge Function:

  * Client: `await fetch("/api/v1/recommendations/apply", { method: "POST" });`
  * Edge Function wrapper calls `SELECT public.apply_recommendations(restaurantId);`

#### 7.4. Review & Feedback Moderation UI

* **Fetch Reviews** in `/web/app/[locale]/dashboard/reports/feedback/page.tsx` (already covered).
* **Resolve Action**:

  * Client calls `/api/v1/reviews/resolve` with `{ reviewId }`.
  * Edge Function:

    ```ts
    import { NextRequest, NextResponse } from "next/server";
    import { supabaseAdmin } from "../../../lib/supabaseAdmin";

    export async function POST(req: NextRequest) {
      const { reviewId } = await req.json();
      if (!reviewId) return NextResponse.json({ success: false, error: "Missing reviewId" }, { status: 400 });
      const { error } = await supabaseAdmin
        .from("reviews")
        .update({ resolved: true })
        .eq("id", reviewId);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    ```

---

### 8. Advanced Modules (v2+ behind Feature Flags)

#### 8.1. Payment Gateway Integration (Stripe/PayPay)

* **Edge Function** `/infra/functions/create_payment_intent.ts` (Node):

  ```ts
  import Stripe from "stripe";

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });

  export async function handler(req) {
    const { orderId, amount, currency = "jpy" } = await req.json();
    if (!orderId || !amount) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert to yen in smallest unit
        currency,
        metadata: { orderId },
      });
      return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), { status: 200 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
  ```

* **Next.js API Route** `/web/app/api/v2/payments/create-intent.ts` that proxies to Edge Function.

* **Web Checkout Page** `/web/app/[locale]/customer/checkout/page.tsx`:

  * If `FEATURE_FLAGS.payments === true`: render Stripe Elements (load Stripe.js in root layout).
  * Else show “Coming Soon.”
  * After payment success, call `/api/v2/payments/confirm` to update `orders.status = 'completed'` and trigger `printReceipt`.

* **iOS Stripe Integration**:

  * Add `stripe-ios` via SPM.
  * In `CheckoutView`, if `FeatureFlags.enablePayments`:

    1. Fetch PaymentIntent client secret from `/api/v2/payments/create-intent`.
    2. Display `PaymentSheet` or `STPCardField`.
    3. Confirm payment; on success, mark order as completed and print receipt.

#### 8.2. Generative AI Assistant (Chatbot)

* **Edge Function** `/infra/functions/chatbot.ts`:

  ```ts
  import OpenAI from "openai";

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  export async function handler(req) {
    const { restaurantId, language, userQuery } = await req.json();
    if (!restaurantId || !language || !userQuery) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }
    // Fetch menu items for context
    const { data: menuItems } = await supabaseAdmin
      .from("menu_items")
      .select(`name_${language}, description_${language}, price`)
      .eq("restaurant_id", restaurantId)
      .eq("available", true);

    // Build prompt
    let prompt = `You are a virtual assistant for a restaurant. The menu items are:\n`;
    menuItems.forEach((item) => {
      prompt += `• ${item[`name_${language}`]}: ${item[`description_${language}`]} (¥${item.price})\n`;
    });
    prompt += `\nCustomer asks (in ${language}): ${userQuery}\nAnswer in concise ${language}.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.choices[0].message.content;
      // Log to chat_logs
      await supabaseAdmin.from("chat_logs").insert({
        restaurant_id: restaurantId,
        user_id: auth.user?.id, // optional
        user_language: language,
        prompt_text: userQuery,
        prompt_token_count: response.usage.prompt_tokens,
        response_token_count: response.usage.completion_tokens,
      });
      return new Response(JSON.stringify({ response: text }), { status: 200 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
  ```

* **Web Frontend Chat Widget** `/web/components/ChatWidget.tsx`:

  * Floating button opens modal.
  * Textarea for user input.
  * Language inferred from `locale`.
  * On submit, call `/api/v2/chatbot` with `{ restaurantId, language, userQuery }`.
  * Stream or display response.

* **RLS on `chat_logs`** ensures only that restaurant’s logs are written/fetched.

#### 8.3. Audit Logging & Advanced Monitoring

* **Extend RLS to `audit_logs`**:

  ```sql
  CREATE POLICY "Restrict audit logs"
    ON audit_logs
    FOR SELECT
    USING ( restaurant_id = auth.jwt() ->> 'restaurant_id' );
  ```
* **Set Up Alerting**

  * Use Supabase alerts or an external service (e.g., PagerDuty) to notify when:

    * > 100 failed login attempts/hour.
    * > 95% CPU usage on Supabase Postgres.
    * > 500 errors in web API in last 10 minutes.
* **Daily Log Cleanup**

  * If logs grow too large, schedule a CRON job to archive older than 90 days to a backup table or external storage.

#### 8.4. API Versioning for Breaking Changes

* **Place All New (v2) Endpoints** under `/web/app/api/v2/…`.
* **Retain v1 Endpoints** for backwards compatibility until clients are upgraded.
* **Deprecation Strategy**:

  * Mark v1 endpoints as deprecated in docs.
  * After 3 months of dual support, remove or redirect v1 to v2 with translation logic.

---

### 9. Testing, CI/CD & Deployment

#### 9.1. Unit & Integration Tests (Web)

* **Testing Frameworks**: Jest + React Testing Library.
* **Key Tests**:

  1. **RLS Protection**:

     * Mock a JWT with `restaurant_id = A`; attempt to query `menu_items` where `restaurant_id = B` → expect empty or forbidden.
  2. **API Validation**:

     * POST `/api/v1/register` with invalid subdomain → 400.
     * POST `/api/v1/orders/create` with missing items → 400.
     * POST `/api/v2/chatbot` when `FEATURE_FLAGS.aiAssistant = false` → 404 or `{ error: "Feature disabled" }`.
  3. **i18n Rendering**:

     * Render a page in `locale='en'` and verify English text appears.
     * Switch to `locale='vi'`, verify Vietnamese.

#### 9.2. UI Tests (iOS)

* **XCTest** for SwiftUI views:

  * Snapshot test: render `LoginView` in both light and dark modes.
  * Unit test: `OrderService.computeGrouping()` yields correct groups from sample data.
  * Test `PrinterManager`: simulate a “printer not connected” state and verify error handling UI appears.

#### 9.3. Security Scans & Dependency Hygiene

* **Web**:

  * Add `npm audit` to CI. If any `high` or `critical` vulnerability persists, fail build.
  * Run `npm run lint` and `npm run format:check`.
* **iOS**:

  * Run `swiftlint --strict` in CI.
  * Periodically run `swift package audit` (via sources like `SafetyKit`) for known vulnerabilities.

#### 9.4. CI Pipeline (GitHub Actions)

* **Workflow Steps**:

  1. **Checkout Code**
  2. **Install Dependencies** (`npm install --prefix web`, `bundle install` if using Ruby-based tooling, etc.)
  3. **Lint & Format Checks**
  4. **Run Web Tests** (`npm test --prefix web`)
  5. **Build Web App** (`npm run build --prefix web`)
  6. **Build & Test iOS App** (`xcodebuild -scheme ShopCopilotStaff -destination 'platform=iOS Simulator,name=iPhone 14' test`)
  7. **Security Audit** (`npm audit --prefix web`)
* **Deployment Jobs** (only on `main` branch):

  * **Web**: Deploy to Vercel staging if on `develop`, production if on `main`.
  * **Mobile**: On `main`, build archive and upload to TestFlight.

#### 9.5. Environment Separation

* **Staging vs. Production**:

  * **Supabase**: Two Projects (`shop-copilot-staging`, `shop-copilot-prod`).
  * **Vercel**:

    * `staging.shop-copilot.com` points to staging build.
    * `shop-copilot.com` points to production build.
  * **Mobile**:

    * Use a Debug build for staging—points to `shop-copilot-staging.supabase.co`.
    * Release build for production—points to `shop-copilot-prod.supabase.co`.

#### 9.6. Feature Flag Rollout Strategy

* **Default Flags**:

  * `FEATURE_FLAGS.payments = false`
  * `FEATURE_FLAGS.aiAssistant = false`
  * `FEATURE_FLAGS.onlineReviews = true`
  * `FEATURE_FLAGS.lowStockAlerts = true`
* **Enable in Staging First**:

  * Flip flags in staging environment variables.
  * Test end-to-end workflows (e.g., payment flow, AI chat).
  * When stable, flip same flags in production environment.

---

