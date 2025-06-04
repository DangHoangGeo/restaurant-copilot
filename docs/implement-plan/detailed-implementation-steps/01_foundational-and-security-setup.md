
### 1. Foundational & Security Setup

1.1. **Initialize Monorepo Structure & Tooling**

* Create root folders:

  ```
  /web
  /mobile
  /shared
  /infra
  /config
  README.md
  ```

  (Req 1.1)
* In `/web`: run

  ```bash
  npx create-next-app@latest . --ts --app
  npm install tailwindcss postcss autoprefixer next-intl react-beautiful-dnd react-qr-code recharts @hookform/resolvers zod @supabase/auth-helpers-nextjs
  npx tailwindcss init -p
  ```

  Configure `tailwind.config.js` and add basic styles.
* In `/shared`: `npm init -y`, install ESLint + Prettier, add shared Zod schemas (e.g., `signupSchema`, `bookingSchema`).
* In `/mobile`: create a new SwiftUI project named `ShopCopilotStaff`. Add `swiftlint.yml`.
* In `/infra`: create subfolders for SQL migrations (`/infra/migrations`) and Edge Functions (`/infra/edge`).
* In `/config`: create `feature-flags.ts` (see step 1.3).
* Verify ESLint and Prettier run without errors. Run `swiftlint` in `/mobile`—fix any warnings.
  ‣ (Req 1.1, 1.2)

1.2. **Configure Environment & Secrets**

* In `/web/.env.example`, list:

  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  NEXT_PUBLIC_FEATURE_PAYMENTS=false
  NEXT_PUBLIC_FEATURE_AI=false
  NEXT_PUBLIC_FEATURE_REVIEWS=true
  NEXT_PUBLIC_FEATURE_LOWSTOCK=true
  NEXT_PUBLIC_FEATURE_TABLEBOOKING=true
  NEXT_PUBLIC_CAPTCHA_SITE_KEY=
  NEXT_PRIVATE_CAPTCHA_SECRET=
  NEXT_PRIVATE_STRIPE_SECRET_KEY=
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
  NEXT_PRIVATE_OPENAI_API_KEY=
  ```

  (Req 1.2)
* In GitHub (or Vercel) settings, create two environment groups (“staging” and “production”) and populate with real Supabase URLs/keys, CAPTCHA secret, Stripe/PayPay keys, OpenAI key, and feature-flag variables (`true`/`false`).
* Ensure no `NEXT_PRIVATE_…` variables are accidentally exposed to the client. Write a quick check: in a dev build, open DevTools and inspect `window.env`—it should only contain `NEXT_PUBLIC_…`.
  ‣ (Req 1.2)

1.3. **Implement Feature Flags & API Versioning Framework**

* Create `/config/feature-flags.ts`:

  ```ts
  export interface FeatureFlags {
    payments: boolean;
    aiAssistant: boolean;
    onlineReviews: boolean;
    lowStockAlerts: boolean;
    tableBooking: boolean;
  }
  export const FEATURE_FLAGS: FeatureFlags = {
    payments: process.env.NEXT_PUBLIC_FEATURE_PAYMENTS === "true",
    aiAssistant: process.env.NEXT_PUBLIC_FEATURE_AI === "true",
    onlineReviews: process.env.NEXT_PUBLIC_FEATURE_REVIEWS === "true",
    lowStockAlerts: process.env.NEXT_PUBLIC_FEATURE_LOWSTOCK === "true",
    tableBooking: process.env.NEXT_PUBLIC_FEATURE_TABLEBOOKING === "true",
  };
  ```

  (Req 1.3)
* Under `/web/app/api`, create folders `v1/` and `v2/`. All existing baseline Edge Functions (e.g. `register.ts`, `login.ts`, `orders/create.ts`, `bookings/create.ts`) go into `v1`. Any breaking-change or new feature (e.g., `/api/v2/payments/create-intent.ts`, `/api/v2/chatbot.ts`) goes under `v2`.
* In each place where a new feature is in progress (e.g., Payments UI or AI Chat), wrap code in:

  ```ts
  if (!FEATURE_FLAGS.payments) return null;
  ```

  so toggling the flag hides the feature from both web and iOS.
  ‣ (Req 1.3)

1.4. **Set Up Internationalization (i18n)**

* Run `npm install next-intl` in `/web`.
* Create `/web/i18n/locales/ja.json`, `en.json`, `vi.json`. Add neutral keys (e.g., `"SIGN_UP_TITLE": "店舗登録"` for Japanese, `"SIGN_UP_TITLE": "Register Your Restaurant"` for English, etc.).
* In `/web/next.config.js`, add:

  ```js
  module.exports = {
    i18n: {
      locales: ["ja","en","vi"],
      defaultLocale: "ja"
    },
    experimental: { middleware: true },
  };
  ```

  (Req 1.4)
* In `/web/app/layout.tsx` (root), wrap the returned `<html>` in `NextIntlClientProvider`:

  ```tsx
  import { NextIntlClientProvider } from "next-intl";
  export default async function RootLayout({ children, params }) {
    const locale = params.locale || "ja";
    const messages = (await import(`../i18n/locales/${locale}.json`)).default;
    return (
      <html lang={locale}>
        <body>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    );
  }
  ```
* Audit all existing UI components: replace hard-coded text with `const t = useTranslations("CATEGORY_KEY");` and `t("STRING_KEY")`.
* Verify that switching `?locale=en` or `?locale=vi` shows the corresponding language strings.
  ‣ (Req 1.4)

1.5. **Implement Rate Limiting & Enable WAF**

* For each critical Edge Function (e.g., `/api/v1/register.ts`, `/api/v1/login.ts`, `/api/v1/orders/create.ts`, `/api/v1/bookings/create.ts`, `/api/v2/chatbot.ts`), add a simple in-memory token bucket by IP or by user. Example skeleton in `register.ts`:

  ```ts
  let ipCounters: Record<string, { tokens: number; lastRefill: number }> = {};

  function rateLimit(ip: string, limit = 10, windowSec = 60): boolean {
    // …token bucket logic…
  }

  export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(ip)) {
      return new Response("Too Many Requests", { status: 429 });
    }
    // …rest of signup logic…
  }
  ```

  (Req 1.5)
* In Vercel Dashboard → **Settings → Security → Web Application Firewall**, enable “Attack Challenge” on all routes. That will block common OWASP threats before they hit our APIs.
* Test by hammering a signup endpoint with more than 10 requests/minute; expect a 429 response.
  ‣ (Req 1.5)

1.6. **Integrate CAPTCHA on Auth Flows**

* Install `react-google-recaptcha` in `/web`.
* On Signup page (`/web/app/[locale]/signup/page.tsx`), add:

  ```tsx
  import ReCAPTCHA from "react-google-recaptcha";
  // inside form:
  <ReCAPTCHA
    sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
    onChange={(token) => setCaptchaToken(token)}
  />
  ```

  (Req 1.6)
* Create Edge Function `/web/app/api/v1/verify-captcha.ts`:

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  export async function POST(req: NextRequest) {
    const { token } = await req.json();
    const secret = process.env.NEXT_PRIVATE_CAPTCHA_SECRET!;
    const res = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await res.json();
    if (!data.success) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }
    return NextResponse.json({ valid: true });
  }
  ```
* In `/api/v1/register.ts` and `/api/v1/login.ts`, before processing credentials, call `await fetch("/api/v1/verify-captcha", { method: "POST", body: JSON.stringify({ token: captchaToken }) })`. If invalid, return 400.
* Repeat on the Forgot Password page.
* Verify that submitting with an invalid or expired CAPTCHA token yields a 400 error.
  ‣ (Req 1.6)

1.7. **Set Up Logging & Monitoring**

* In Supabase Dashboard → **Settings → Database → Logs**, enable query logging and RLS failure logging.
* Create a `logs` table via SQL in `/infra/migrations/001_init.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid REFERENCES restaurants(id),
    user_id uuid REFERENCES users(id),
    level text CHECK (level IN ('INFO','WARN','ERROR','DEBUG')),
    endpoint text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
  );
  ```

  (Req 1.7)
* In `/web/lib/logger.ts`, create a reusable function:

  ```ts
  import { supabaseAdmin } from "./supabaseAdmin";
  export async function logEvent({ restaurantId, userId, level, endpoint, message, metadata }: {
    restaurantId?: string;
    userId?: string;
    level: "INFO"|"WARN"|"ERROR"|"DEBUG";
    endpoint: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    await supabaseAdmin.from("logs").insert([{
      restaurant_id: restaurantId, user_id: userId,
      level, endpoint, message, metadata
    }]);
  }
  ```
* In every API route’s `catch` block, invoke `logEvent({ level: "ERROR", endpoint: "/api/v1/xyz", message: err.message, metadata: { … } })`.
* In Vercel Analytics (or another APM) verify that requests, latencies, 4xx/5xx rates, and geo-distribution are tracked.
  ‣ (Req 1.7)

---
