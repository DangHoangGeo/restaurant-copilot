## 3. Tenant Registration & Subdomain Provisioning

### 3.1. **Build Public Signup Page**

* In `/web/app/[locale]/signup/page.tsx`:

  * Use React Hook Form + Zod (`signupSchema`) for:

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

    (Req 3.1)
  * Include `<ReCAPTCHA />` and pass its token into form state.
  * On form submit:

    1. POST to `/api/v1/verify-captcha` with `{ token: captchaToken }`. If invalid, show error.
    2. POST to `/api/v1/register` with `{ name, subdomain, email, password, defaultLanguage }`.
  * Show localized validation and server errors.
* Create `/shared/schemas/signup.ts` so the same `signupSchema` can be imported in both client and server code.
  ‣ (Req 3.1, 1.6)

### 3.2. **Implement Subdomain Availability Check**

* Create Edge Function at `/web/app/api/v1/subdomain/check.ts`:

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

  export async function GET(req: NextRequest) {
    const subdomain = req.nextUrl.searchParams.get("subdomain") || "";
    if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
      return NextResponse.json({ available: false, reason: "invalid_format" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("subdomain", subdomain)
      .single();
    return NextResponse.json({ available: !data });
  }
  ```

  (Req 3.2)
* In the signup form, wire a debounce (e.g. 300 ms) that calls `/api/v1/subdomain/check?subdomain=${value}` and displays “Available”/“Not available” below the subdomain input.
  ‣ (Req 3.2)

### 3.3. **Implement Register Endpoint**

* Create Edge Function `/web/app/api/v1/register.ts` that:

  1. Parses `req.json()` and validates with `signupSchema`.
  2. Rechecks subdomain in `restaurants`; if taken, return 409.
  3. Create Supabase Auth user:

     ```ts
     const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
       email, password, email_confirm: true, user_metadata: { name }
     });
     if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
     ```
  4. Insert into `restaurants` with `{ name, subdomain, default_language }`, returning `restaurant_id`.
  5. Update Auth user to set custom claims:

     ```ts
     await supabaseAdmin.auth.admin.updateUserById(userData.id, {
       app_metadata: { restaurant_id: restaurantId, role: "owner" }
     });
     ```
  6. Insert into `users` table:

     ```ts
     await supabaseAdmin.from("users").insert([{ 
       id: userData.id, restaurant_id: restaurantId, email, name, role: "owner" 
     }]);
     ```
  7. Return `{ success: true, redirect: "https://{subdomain}.shop-copilot.com/ja/dashboard" }`.
  8. On any error, call `logEvent({ level: "ERROR", endpoint: "/api/v1/register", message: error.message })`.
     (Req 3.3)
* Test by submitting a valid signup → verify in Supabase that:
  • A new Auth user exists with `app_metadata.restaurant_id` set.
  • Restaurants and users tables have the correct rows.
  • JWT issued to that user contains `restaurant_id` and `role = "owner"`.
  ‣ (Req 3.3)

### 3.4. **Configure Wildcard Subdomain & Middleware**

* DNS: Point `*.shop-copilot.com` to Vercel by creating a CNAME record to `cname.vercel-dns.com`.
* In Vercel, add two domains:

  1. `shop-copilot.com` (root)
  2. `*.shop-copilot.com` (wildcard)
* Create Next.js middleware in `/web/middleware.ts`:

  ```ts
  import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";

  export async function middleware(req: NextRequest) {
    const host = req.headers.get("host") || "";
    const parts = host.split(".");
    const subdomain = parts.length > 2 ? parts[0] : null;

    // If no subdomain (root domain), allow visit: signup, login, landing pages
    if (!subdomain || subdomain === "shop-copilot") {
      return NextResponse.next();
    }

    // Validate subdomain
    const res = await fetch(`https://${req.headers.get("host")}/api/v1/restaurant/exists?subdomain=${subdomain}`);
    const { exists } = await res.json();
    if (!exists) {
      return NextResponse.redirect("https://shop-copilot.com/404");
    }

    // Attach subdomain to searchParams so downstream can read it
    req.nextUrl.searchParams.set("restaurant", subdomain);
    return NextResponse.next();
  }

  export const config = {
    matcher: ["/((?!api|_next|static|favicon.ico).*)"],
  };
  ```

  (Req 3.4, 3.5)
* Implement `/web/app/api/v1/restaurant/exists.ts` to query `restaurants` by `subdomain` and return `{ exists: boolean }`.
* Test by visiting `foo.shop-copilot.com`: if `foo` is a valid subdomain, you see the tenant’s site; if invalid, you get redirected to a 404 page.
  ‣ (Req 3.4, 3.5)

---
