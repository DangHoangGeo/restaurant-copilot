## 🏗️ Foundational Setup (Before Milestones)

### 0.1. Monorepo Structure & Tooling

1. **Monorepo Root**

   * Create a new Git repository (`shop-copilot`).
   * At the root, place a README and any CI/CD configuration (e.g., GitHub Actions workflows).

2. **Workspaces** (using pnpm or npm workspaces)

   ```
   /web           ← Next.js app  
   /mobile        ← iOS SwiftUI project  
   /shared        ← Shared TypeScript types, constants, interfaces  
   /infra         ← Infrastructure-as-code (e.g., Terraform/Supabase migrations)  
   /config        ← Global configuration files (i18n, feature flags, environment schemas)  
   ```

3. **Linting & Formatting**

   * Install Prettier and ESLint in `/web` and `/shared`.
   * Set up a SwiftLint configuration in `/mobile` to enforce Swift style.

4. **Environment Management**

   * Use a `.env.example` in `/web` and document required keys (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   * In `/mobile`, create a template `Config.swift` with placeholders for Supabase URL/Key, default subdomain, etc.

---

### 0.2. Modular Architecture & Feature Flags

1. **API Versioning & Routing Conventions**

   * In the Next.js app, organize all backend endpoints under `/web/app/api/v1/…` from the start.
   * Any future endpoints (payments, AI) will live under `/v2/…` when they arrive.

2. **Feature Flags**

   * In `/config/feature-flags.ts`, define an interface:

     ```ts
     export interface FeatureFlags {
       payments: boolean;
       aiAssistant: boolean;
       onlineReviews: boolean;
       // add more as we go
     }
     ```
   * In `/web/lib/featureFlags.ts`, load flags from environment variables:

     ```ts
     export const FEATURE_FLAGS: FeatureFlags = {
       payments: process.env.NEXT_PUBLIC_FEATURE_PAYMENTS === "true",
       aiAssistant: process.env.NEXT_PUBLIC_FEATURE_AI === "true",
       onlineReviews: process.env.NEXT_PUBLIC_FEATURE_REVIEWS === "true",
     };
     ```
   * Wrap any code for payments or AI with `if (FEATURE_FLAGS.payments) { … }` so it’s dormant until you flip the flag.

3. **Shared Types & Interfaces**

   * In `/shared/types/restaurant.ts`:

     ```ts
     export type Locale = "ja" | "en" | "vi";
     export interface Restaurant {
       id: string;
       name: string;
       subdomain: string;
       defaultLanguage: Locale;
       // …other fields
     }
     ```
   * In `/shared/types/menu.ts`, `/shared/types/order.ts`, define all core schema interfaces. The web and mobile apps import these to ensure consistency.

---

### 0.3. Internationalization (i18n) by Default

1. **Install and Configure next-intl**

   * In `/web`:

     ```bash
     npm install next-intl
     ```
   * Create `/web/i18n/locales/ja.json`, `en.json`, `vi.json` with at least the minimal key structure:

     ```jsonc
     // ja.json
     {
       "MENU_TITLE": "メニュー",
       "CHECKOUT_BUTTON": "注文を確定",
       // …more keys
     }
     ```
2. **Next.js Layout with Locale Handling**

   * In `/web/app/layout.tsx`:

     ```tsx
     import { NextIntlClientProvider } from "next-intl";
     import { FEATURE_FLAGS } from "../lib/featureFlags";

     export default function RootLayout({ children, params }) {
       const locale: Locale = (params.locale || "ja") as Locale;
       const messages = require(`../i18n/locales/${locale}.json`);
       return (
         <html lang={locale}>
           <body>
             <NextIntlClientProvider locale={locale} messages={messages}>
               {children}
               {FEATURE_FLAGS.payments && <script src="/stripe.js" />}
               {FEATURE_FLAGS.aiAssistant && <script src="/openai.js" />}
             </NextIntlClientProvider>
           </body>
         </html>
       );
     }
     ```
   * Set up routing to handle localized paths (e.g., `/[locale]/customer/...`) so every page inherently expects a `locale` param.
3. **Wrap All UI Text**

   * As you generate components (even stubs), use `useTranslations("KEY")` instead of hard-coded strings.
   * Early adoption ensures every future feature is automatically translatable.

---

### 0.4. Supabase Project & Database Baseline

1. **Create Supabase Project**

   * “shop-copilot” (production) and “shop-copilot-staging.”
   * Enable Postgres extensions (`uuid-ossp` for `uuid_generate_v4()`).

2. **Database Migrations (Infra-as-Code)**

   * In `/infra/migrations/001_init.sql`, scaffold all core tables (restaurants, users, categories, menu\_items, tables, employees, schedules, orders, order\_items, reviews, feedback, inventory\_items, analytics\_snapshots).
   * Include indexes on frequently queried columns (e.g., `restaurant_id`, `created_at`).

3. **Edge Functions & Webhooks**

   * Scaffold a directory `/infra/functions/` with:

     * `generate_daily_snapshot.ts` (Edge Function to run once per day).
     * `handle_payment_webhook.ts` (placeholder for Stripe/PayPay integration).
   * In Supabase dashboard, create a CRON job pointing to `generate_daily_snapshot`.

---

## 🗂️ Milestone 1: Core Infrastructure & Alpha Framework

### 1.1. Next.js App Boilerplate

1. **Initialize Next.js**

   ```bash
   cd /web
   npx create-next-app@latest . --ts --app
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs next-intl
   ```

2. **Tailwind CSS Setup** (if not already done)

   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

   * Configure `tailwind.config.js` to scan `app/**/*.{js,ts,jsx,tsx}`.

3. **Supabase Client & Auth Helpers**

   * Create `/web/lib/supabaseClient.ts`:

     ```ts
     import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
     export const supabase = createBrowserSupabaseClient({
       supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
       supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     });
     ```
   * In `/web/app/layout.tsx`, add `<SessionContextProvider supabaseClient={supabase}>` around `<NextIntlClientProvider>` so the entire app can use Supabase auth.

4. **Feature Flag Stub**

   * In `/web/lib/featureFlags.ts`, import from `/config/feature-flags.ts` so the code can immediately reference `FEATURE_FLAGS.payments` or `FEATURE_FLAGS.aiAssistant`.

5. **Shared Types Import**

   * Install `/shared` as a dependency of `/web` using a relative path in `package.json`:

     ```json
     "dependencies": {
       "shared": "file:../shared"
     }
     ```
   * In `/web/tsconfig.json`, add:

     ```json
     {
       "paths": {
         "@shared/*": ["../shared/*"]
       }
     }
     ```
   * Now you can `import { Restaurant, Locale } from "@shared/types/restaurant";`.

### 1.2. Basic Supabase Schema Verification

1. **Run Migrations**

   * In the Supabase CLI (installed globally), run:

     ```
     supabase db push --project-ref <your-project-ref>
     ```
   * Confirm that all tables exist in the Supabase dashboard.

2. **Seed Minimal Data**

   * In `/infra/seeds/seed_restaurant.sql`:

     ```sql
     INSERT INTO restaurants (id, name, subdomain, default_language)
     VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Ramen', 'demo-ramen', 'ja');
     ```
   * Run seed script to confirm connectivity.

### 1.3. Next.js Middleware for Multi-Tenancy & i18n

1. **Create `/web/middleware.ts`**:

   ```ts
   import { NextResponse } from "next/server";
   import type { NextRequest } from "next/server";

   // assume subdomain.org.shop-copilot.com
   export function middleware(req: NextRequest) {
     const host = req.headers.get("host") || "";
     const subdomain = host.split(".")[0];

     // Block root or invalid subdomains
     if (subdomain === "shop-copilot" || !subdomain) {
       return NextResponse.redirect("https://www.shop-copilot.com"); // landing page
     }

     // Attach restaurant context
     req.nextUrl.searchParams.set("restaurant", subdomain);

     // Handle i18n: default to restaurant's locale
     const locale = req.nextUrl.searchParams.get("locale") || "ja";
     req.nextUrl.searchParams.set("locale", locale);

     return NextResponse.next();
   }

   export const config = {
     matcher: ["/((?!api|_next|static).*)"],
   };
   ```
2. **In `next.config.js`**, ensure middleware is enabled:

   ```js
   module.exports = {
     experimental: { middleware: true },
     i18n: {
       locales: ["ja", "en", "vi"],
       defaultLocale: "ja",
     },
   };
   ```
3. **Global Context Hook**

   * Create `/web/hooks/useRestaurantContext.ts`:

     ```ts
     import { useRouter } from "next/router";
     export function useRestaurantContext() {
       const { searchParams } = useRouter().query;
       const restaurantSubdomain = (searchParams?.restaurant as string) || "";
       const locale = (searchParams?.locale as string) || "ja";
       return { restaurantSubdomain, locale };
     }
     ```

---

Below is the revised plan with an explicit **Owner Registration & Subdomain Provisioning** step added at the very beginning of Milestone 1. This ensures that the registration flow (including subdomain assignment) is built in from day one.

---

## 🗂️ Milestone 1: Infrastructure Setup (Next.js + Supabase)

### 1.0. Owner Registration & Subdomain Provisioning

1. **Public Landing & Sign-Up Page**

   * Under `/web/app/` create a public route `/signup/page.tsx` (no auth required) that displays:

     * “Create Your Shop-Copilot Account” form with fields:

       * **Restaurant Name**
       * **Desired Subdomain** (e.g. `your-restaurant`)
       * **Email**
       * **Password**
       * **Confirm Password**
       * **Default Language** (dropdown: Ja / En / Vi)
     * Inline helper text:

       * “Your subdomain will be `your-restaurant.shop-copilot.com`”
       * Real-time validation on subdomain availability (see next).

2. **Subdomain Availability Check (Client + API)**

   * **Client-Side**: As the user types “Desired Subdomain,” call a debounced function to `/api/v1/subdomain/check?subdomain=…`.
   * **API Route `/api/v1/subdomain/check.ts`** (Next.js API):

     ```ts
     import { NextRequest, NextResponse } from "next/server";
     import { supabaseAdmin } from "../../../lib/supabaseAdmin"; // Server client

     export async function GET(req: NextRequest) {
       const subdomain = req.nextUrl.searchParams.get("subdomain") || "";
       if (!/^[a-z0-9-]+$/.test(subdomain)) {
         return NextResponse.json({ available: false, reason: "invalid_format" });
       }
       const { data } = await supabaseAdmin
         .from("restaurants")
         .select("id")
         .eq("subdomain", subdomain)
         .maybeSingle();
       return NextResponse.json({ available: !data });
     }
     ```
   * **Client-Side UI**:

     * If `available===true`, show a green check (“Subdomain available!”).
     * If `available===false`, show a red error (“Subdomain already taken” or “Use only lowercase letters and hyphens”).

3. **Registration Submission & Restaurant Record Creation**

   * When the user clicks “Sign Up,” submit the form to `/api/v1/register.ts` (Next.js API).
   * **API Route `/api/v1/register.ts`**:

     1. Validate form inputs (password match, subdomain regex).
     2. Call `supabaseAdmin.auth.admin.createUser({ email, password })` to create a Supabase Auth user.
     3. On success, insert into `restaurants` table:

        ```sql
        INSERT INTO restaurants (id, name, subdomain, default_language, created_at, updated_at)
        VALUES (uuid_generate_v4(), $1, $2, $3, now(), now())
        RETURNING id;
        ```
     4. Insert into `users` table with `role = 'owner'` and `restaurant_id` set to the newly created restaurant’s UUID.
     5. Respond with `{ success: true, restaurantId, userId }`.

4. **Automatic Subdomain Configuration**

   * **Vercel Setup**:

     * In the Vercel dashboard, enable wildcard custom domains (`*.shop-copilot.com`).
     * Add a CNAME record in DNS:

       ```
       TYPE: CNAME  
       NAME: *.shop-copilot.com  
       VALUE: cname.vercel-dns.com
       ```
   * **Next.js Middleware** uses the `Host` header to detect subdomain:

     ```ts
     // /web/middleware.ts
     import { NextResponse } from "next/server";
     import type { NextRequest } from "next/server";

     export function middleware(req: NextRequest) {
       const host = req.headers.get("host") || "";
       const subdomain = host.split(".")[0];

       // If no subdomain or “shop-copilot” root, send to landing
       if (subdomain === "shop-copilot" || !subdomain) {
         return NextResponse.next();
       }

       // Attach restaurant context
       req.nextUrl.searchParams.set("restaurant", subdomain);
       return NextResponse.next();
     }

     export const config = {
       matcher: ["/((?!api|_next|static).*)"],
     };
     ```

5. **Post-Registration Redirect**

   * After successful insert in `/api/v1/register`, return a JSON with `{ success: true, redirect: 'https://<subdomain>.shop-copilot.com/ja/dashboard' }`.
   * On the client—after receiving success—redirect the browser to that URL.

---

### 1.1. Initialize Monorepo and Project Structure

1. Create a new Git repository named `shop-copilot`.

2. At the root, initialize a Next.js project in `/web`:

   ```bash
   cd /web
   npx create-next-app@latest . --ts --app
   ```

3. Create folders:

   ```
   /mobile        ← for the iOS SwiftUI project
   /shared        ← shared TypeScript types/interfaces
   /infra         ← Supabase migrations, Edge Functions
   /config        ← i18n messages, feature-flag definitions
   ```

4. Configure `/config/feature-flags.ts`:

   ```ts
   export interface FeatureFlags {
     payments: boolean;
     aiAssistant: boolean;
     onlineReviews: boolean;
   }
   export const FEATURE_FLAGS: FeatureFlags = {
     payments: process.env.NEXT_PUBLIC_FEATURE_PAYMENTS === "true",
     aiAssistant: process.env.NEXT_PUBLIC_FEATURE_AI === "true",
     onlineReviews: process.env.NEXT_PUBLIC_FEATURE_REVIEWS === "true",
   };
   ```

5. Set up Linting & Formatting:

   * `/web`: ESLint + Prettier
   * `/shared`: ESLint + Prettier
   * `/mobile`: SwiftLint

6. Create `/shared/types/restaurant.ts`:

   ```ts
   export type Locale = "ja" | "en" | "vi";
   export interface Restaurant {
     id: string;
     name: string;
     subdomain: string;
     defaultLanguage: Locale;
     createdAt: string;
     updatedAt: string;
   }
   ```

---

### 1.2. Configure Supabase Backend

1. Create Supabase projects:

   * **Production**: `shop-copilot-prod`
   * **Staging**: `shop-copilot-staging`
2. Enable Postgres extensions (e.g., `uuid-ossp`).
3. Set up environment variables in `/web/.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   ```
4. Install Supabase SDK in `/web`:

   ```bash
   cd /web
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs next-intl
   ```
5. Create `/web/lib/supabaseClient.ts`:

   ```ts
   import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

   export const supabase = createBrowserSupabaseClient({
     supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
     supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
   });
   ```
6. Create `/web/lib/supabaseAdmin.ts` (server-side) with the service role key in `/web/.env.local` (e.g., `SUPABASE_SERVICE_ROLE_KEY`).

---

### 1.3. Define Database Schema (Supabase Migrations)

Add a migration file at `/infra/migrations/001_init.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: restaurants
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subdomain text UNIQUE NOT NULL,
  logo_url text,
  brand_color text,
  default_language text NOT NULL DEFAULT 'ja',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text CHECK (role IN ('owner','manager','staff')) NOT NULL DEFAULT 'staff',
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name_ja text NOT NULL,
  name_en text NOT NULL,
  name_vi text NOT NULL,
  description_ja text,
  description_en text,
  description_vi text,
  image_url text,
  price numeric NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  available boolean DEFAULT TRUE,
  weekday_visibility int[] DEFAULT ARRAY[1,2,3,4,5,6,7]::int[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: tables
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  qr_code text NOT NULL UNIQUE,
  position_x integer,
  position_y integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('chef','server','cashier','manager')) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: schedules
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  weekday int CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id uuid REFERENCES tables(id) ON DELETE CASCADE,
  session_id uuid UNIQUE NOT NULL,
  status text CHECK (status IN ('new','preparing','ready','completed')) NOT NULL DEFAULT 'new',
  total_amount numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: order_items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  rating smallint CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment text,
  resolved boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: feedback
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  comments text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: inventory_items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  stock_level integer DEFAULT 0,
  threshold integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: analytics_snapshots
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_sales numeric,
  top_seller_item uuid REFERENCES menu_items(id),
  orders_count integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_restaurant_subdomain ON restaurants(subdomain);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_availability ON menu_items(available);
```

After adding this file, run:

```bash
cd /infra
supabase db push --project-ref <your-project-ref>
```

---

## 🗂️ Milestone 2: Admin Dashboard (Menus, Tables, Staff, Reports) – Foundation First

> Because we have feature flags, i18n, and shared types in place, every page we build now comes with those capabilities automatically.

### 2.1. Authentication & Subdomain-Based Routing

1. **Login Page (`/web/app/login/page.tsx`)**

   * Show email/password inputs, “Login” button.
   * On submit:

     ```ts
     const { data, error } = await supabase.auth.signInWithPassword({ email, password });
     if (!error) router.push(`/dashboard?restaurant=${restaurantSubdomain}&locale=${locale}`);
     ```
   * Wrap form error messages with translation keys (e.g., `t("LOGIN_ERROR")`).

2. **Protected Layout Component**

   * In `/web/components/ProtectedLayout.tsx`:

     ```tsx
     import { useSession, SessionContextProvider } from "@supabase/auth-helpers-react";
     import { useRestaurantContext } from "../hooks/useRestaurantContext";

     export default function ProtectedLayout({ children }) {
       const { data: session } = useSession();
       const { restaurantSubdomain } = useRestaurantContext();

       if (!session) {
         // if no session, redirect to login (client-side)
         typeof window !== "undefined" && window.location.replace(`/login?restaurant=${restaurantSubdomain}`);
         return null;
       }
       return <>{children}</>;
     }
     ```
   * Wrap `/web/app/dashboard/layout.tsx` with `<SessionContextProvider>` and then `<ProtectedLayout>` so every child page is protected.

### 2.2. Dashboard Overview

1. **Data Fetching in Server Component**

   * In `/web/app/dashboard/page.tsx`, use a server-side `async` function to fetch:

     ```ts
     import { supabaseAdmin } from "../lib/supabaseAdmin"; // server-side client

     const { data: restaurant } = await supabaseAdmin
       .from("restaurants")
       .select("*")
       .eq("subdomain", restaurantSubdomain)
       .single();

     const { data: todaySnapshot } = await supabaseAdmin
       .from("analytics_snapshots")
       .select("*")
       .eq("restaurant_id", restaurant.id)
       .eq("date", new Date().toISOString().split("T")[0])
       .single();
     // …fetch active orders, top seller, low-stock
     ```
2. **Cards & Widgets**

   * Create `/web/components/DashboardCard.tsx` that accepts title, value, icon, and optional children.
   * Build a grid layout in the page, passing translated labels (e.g., `t("TODAYS_SALES")`).

### 2.3. Menu Management (Reordered)

1. **Category List (Server + Client Hybrid)**

   * In `/web/app/dashboard/menu/page.tsx` (server component), fetch `categories` and pass them as props to a client component.
   * In `/web/components/CategoryList.tsx` (client), render each category and a “New Category” button.

2. **CategoryForm & ItemForm**

   * In `/web/app/dashboard/menu/[categoryId]/edit/page.tsx` and `/new/page.tsx`, create forms that use `useForm` from React Hook Form.
   * All text fields use `t("CATEGORY_NAME")`, `t("SAVE")`, etc., to honor i18n.

3. **Drag-and-Drop Sorting**

   * Use `react-beautiful-dnd` in a client component. On drag end, call a Next.js API route (`/api/v1/menu/reorder`) passing the ordered IDs; update `position` in Supabase.

### 2.4. Table Management

1. **TableList Component**

   * In `/web/app/dashboard/tables/page.tsx`, fetch and pass table array to `/components/TableList.tsx`.
   * Each row shows table name and has a “Generate QR” button (modal or direct link).
2. **QR Generation**

   * In `/components/TableRow.tsx`, when “Generate QR” is clicked:

     ```tsx
     import QRCode from "qrcode.react";
     const url = `https://${restaurantSubdomain}.shop-copilot.com/customer/order?tableId=${table.id}&locale=${locale}`;
     return <QRCode value={url} size={128} />;
     ```
   * Add a “Download PNG” button using `canvas.toDataURL()`.

### 2.5. Employee & Schedule Management

1. **Employee Directory**

   * `/web/app/dashboard/employees/page.tsx` fetches `employees` joined with `users` → pass to a client list.
   * Each card shows name, role, and “Edit” / “Delete” buttons.
2. **Schedule Calendar Stub**

   * Scaffold a new route `/web/app/dashboard/employees/[employeeId]/schedule/page.tsx`.
   * Use a calendar component (e.g., `react-day-picker`) to display a week view, but leave full drag-and-drop for sprint 2.
   * Store schedule data in `schedules` table.

### 2.6. Reports & Analytics (Foundation)

1. **Reports Landing Page**

   * `/web/app/dashboard/reports/page.tsx` with tabs for Sales, Items, Feedback, Recommendations.
   * Each tab is a separate client component that fetches its data.
2. **Sales Chart Component**

   * Create `/web/components/SalesChart.tsx` using `recharts`. Read data from server props: `analytics_snapshots`.
3. **Item Report Table**

   * Build a generic `/web/components/DataTable.tsx` that accepts columns and rows → reuse for items and feedback.
   * This ensures any future report is just configuration, not new code structure.

---

## 🗂️ Milestone 3: QR Code Ordering System (Layered & Modular)

By now, your app is already i18n-ready, connected to Supabase, and uses feature flags. So adding the customer side is a matter of layering on top.

### 3.1. Customer-Facing Folder Structure

1. **Create `/web/app/[locale]/customer/…`**

   * Using the `matched` route from middleware, the URL will look like:

     ```
     https://demo-ramen.shop-copilot.com/ja/customer/order?tableId=…
     ```
   * Under `/web/app/[locale]/customer`, scaffold:

     ```
     /order/[sessionId]/page.tsx  
     /order/thank-you/page.tsx  
     /review/[itemId]/page.tsx  
     /layout.tsx  
     ```
2. **Shared Customer Layout**

   * In `/web/app/[locale]/customer/layout.tsx`, wrap children in a `<CustomerHeader>` (with language switcher) and `<Footer>`.

### 3.2. Session Creation & Validation

1. **API Endpoint `/api/v1/sessions/create.ts`**

   * Accepts `{ tableId, locale }` from query.
   * Verifies table belongs to the current restaurant (via subdomain).
   * Inserts a new `orders` row with `session_id = uuid_generate_v4()` and returns that to the client.
2. **API Endpoint `/api/v1/sessions/validate.ts`**

   * Accepts `sessionId`, checks `orders` status; returns `{ valid: boolean }`.

### 3.3. Customer Ordering Page (`/order/[sessionId]`)

1. **Server Component**

   * In `page.tsx`, read `params.sessionId` and `searchParams.tableId, locale`.
   * Validate session by calling `/api/v1/sessions/validate`. If invalid, render a “Session expired” view.
   * Fetch categories + menu\_items for the restaurant, filtering by `weekday_visibility` and `available = true`.

2. **Client Component**

   * Build an interactive product grid where:

     * Each item uses `t("ADD_TO_CART")`, `t("PRICE_LABEL")`, etc.
     * Localize each `item.name_[locale]` and `item.description_[locale]`.
     * Show a `StarRating` component driven by data from `reviews`.
   * Maintain a local React state (or Zustand store in `/shared/store.ts`) for the cart.

3. **Cart & Checkout Drawer**

   * Create `/web/components/CartDrawer.tsx` as a client component.
   * When user taps “View Cart,” animate in a sliding drawer.
   * On “Checkout,” call `/api/v1/orders/create.ts` to commit order\_items and update `orders.status` to `new`.

4. **Session Expiration**

   * After checkout, update the order’s status to `completed`.
   * Any subsequent calls to `/api/v1/sessions/validate` return `valid: false`.

---

## 🗂️ Milestone 4: Multilingual Frontend (Already Embedded)

Because we scaffolded i18n at day one, all new customer pages automatically use translation keys. Any time we add a string—whether it’s a button label, error message, or placeholder—we use `useTranslations("KEY")`. This means no large rewrites later.

---

## 🗂️ Milestone 5: Smart Reports & Feedback (Composable, Feature-Flagged)

### 5.1. Daily Snapshot Edge Function (Already Created)

* Because we set it up in `/infra/functions` and scheduled the CRON, the data accumulates transparently.

### 5.2. Low-Stock & Recommendations (Dashboard Extensions)

1. **Feature Flagged Components**

   * In `/web/components/LowStockCard.tsx`, wrap in:

     ```tsx
     import { FEATURE_FLAGS } from "../lib/featureFlags";
     if (!FEATURE_FLAGS.reviews) return null;
     ```

2. **Recommendations Widget**

   * Build `/web/components/MenuRecommendation.tsx` that fetches last 7-day sales.
   * On click “Apply to Next Week,” call an API route `/api/v1/menu/apply-recommendations.ts` that duplicates those items into a “Featured” category with `weekday_visibility = [1…7]`.

3. **Feedback List**

   * In `/web/app/dashboard/reports/feedback/page.tsx`, fetch `reviews` and show in `/shared/components/DataTable.tsx`.

---

## 🗂️ Milestone 6: iOS App (Defined with Foundation in Mind)

By now, we have Supabase schema and feature flags defined. The iOS app can rely on that stable contract—no surprises later.

### 6.1. Xcode Project & Shared Config

1. **Create Xcode “ShopCopilotStaff” App**

   * In `/mobile`, generate a new SwiftUI project.
   * Add `Config.swift` with constants for `supabaseUrl`, `supabaseAnonKey`, and an enum `FeatureFlags` that reads from a plist or build settings.

2. **Supabase iOS SDK Integration**

   * Add `supabase-swift` via Swift Package Manager.
   * Create a `SupabaseService.swift` that initializes a `SupabaseClient` using config.

3. **Localization in iOS**

   * In Xcode, add `Localizable.strings` for `ja`, `en`, `vi`.
   * Use `NSLocalizedString("ORDER_LIST_TITLE", comment: "")` everywhere.
   * Ensure any UI created now uses localized keys (e.g., button titles, alerts).

### 6.2. Authentication & Restaurant Context

1. **Login Screen**

   * SwiftUI view with TextFields for email, password, subdomain (prefilled from a previous run or stored in `UserDefaults`).
   * On tap “Sign In,” call `supabase.auth.signIn(email:password:)` and then fetch restaurant info by subdomain—store `restaurantId` and `locale` in `AppStorage`.

### 6.3. Real-Time Orders & Feature Flags

1. **Realtime Subscription**

   * In `OrderService.swift` (an `ObservableObject`), subscribe to `orders` table for the current `restaurantId`.
   * Only process records where `status` ≠ `completed`.
2. **Feature-Flagged UI**

   * In `AppState.swift`, read a plist or environment variable `FEATURE_PAYMENTS` and `FEATURE_AI`.
   * Conditionally show/hide payment buttons or AI chat screens based on these flags.

### 6.4. Order List & Detail (Foundation)

1. **OrderListView**

   * SwiftUI `List` bound to `@Published var orders: [Order]`.
   * Each row: localized status badge, table number, item count.
   * Tapping navigates to `OrderDetailView`.
2. **OrderDetailView**

   * Shows items, total, special notes (localized).
   * Buttons to update status—wrapped in `if (FeatureFlags.enableOrderUpdates) { … }`.

### 6.5. Kitchen Grouping (Reused Logic)

1. **KitchenBoardView**

   * Compute grouping logic in `OrderService` the same way as described before.
   * Use localized dish names (`menuItem.nameJa`, `menuItem.nameEn`, `menuItem.nameVi`) based on `restaurant.defaultLanguage`.
   * “Mark as Completed” triggers updates in Supabase for all underlying orders.

### 6.6. Bluetooth Printing (Abstracted)

1. **PrinterManager**

   * Provide a unified interface (`printOrder(_:)`, `printGroupedSummary(_:)`, `printReceipt(_:)`).
   * Internally, check `FeatureFlags.enablePrinting`; if false, skip or log.

---

## 🗂️ Milestone 7: Future Modules (Payments, AI) – Already Primed

### 7.1. Payments (Feature-Flagged)

* **Web**

  * The `/web/app/customer/checkout` flow already checks `FEATURE_FLAGS.payments`.
  * If true, load Stripe scripts and render the card form; otherwise, show “Coming Soon.”
  * API route `/api/v1/payments/create-intent` is scaffolded in `/infra/functions` (no logic yet).
* **iOS**

  * In `CheckoutView`, wrap payment UI in `if FeatureFlags.enablePayments` so nothing breaks if it’s off.

### 7.2. AI Assistant (Generative)

* **Web**

  * The chat widget is already in place but gated by `FEATURE_FLAGS.aiAssistant`.
  * API route `/api/v1/chatbot` is stubbed in the `/infra/functions` folder (no biz logic yet).
* **iOS**

  * In `SettingsView`, show “AI Chat Test” only if `FeatureFlags.enableAI` is true.

---

## 🔗 Final Validation & CI/CD

1. **Automated Tests**

   * Web: Jest + React Testing Library for core components (MenuList, CartDrawer, ProtectedLayout).
   * iOS: Basic SwiftUI snapshot tests and unit tests for `OrderService` logic (grouping, state updates).

2. **CI Pipeline (GitHub Actions)**

   * On every push to `main`:

     * Lint & format check (`pnpm lint`, `npm run lint:swift`).
     * Run web unit tests.
     * Build iOS project via `xcodebuild -scheme ShopCopilotStaff -destination 'platform=iOS Simulator,name=iPhone 14' build`.

3. **Staging Deployments**

   * Web: auto-deploy `/web` to `staging.shop-copilot.com` after CI passes.
   * Mobile: auto-increment build number and upload to TestFlight.

4. **Feature Flag Rollout**

   * Initially, set `FEATURE_FLAGS.payments=false` and `FEATURE_FLAGS.aiAssistant=false`.
   * Flip to `true` only when the feature is fully implemented and tested in staging.

---

### ✅ Summary

By introducing i18n, feature flags, modular folder structure, shared types, and a solid Supabase schema from day one, you ensure:

* **Minimal Refactoring**: All new features—payments, AI, multi-language UI—are simply added behind toggles or in designated folders.
* **Consistent Contracts**: Shared TypeScript interfaces and Supabase migrations guarantee that both web and mobile “speak” the same data shape.
* **Scalable Extensibility**: Edge Functions and API versioning mean you can launch v2 endpoints without disrupting v1.
* **Localized Experience Out of the Gate**: Every page and component has the machinery to display Japanese, English, or Vietnamese text, so translating future features is trivial.
