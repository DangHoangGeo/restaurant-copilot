Data isolation and security in a multi-tenant SaaS like CoOrder are critical. The high-level principle is that every query, insert, update, or delete must be scoped to the current restaurant (tenant) so that no user—whether owner, manager, or staff—can ever “see” another shop’s data. Below are the key strategies to achieve that:

---

## 1. Enforce a Tenant Identifier on Every Table

1. **Add a `restaurant_id` Foreign Key**

   * In every table that stores tenant-specific data (e.g. `users`, `categories`, `menu_items`, `tables`, `orders`, etc.), include a column `restaurant_id UUID NOT NULL REFERENCES restaurants(id)`.
   * This means any record always “belongs” to exactly one restaurant.

2. **Populate `restaurant_id` at Write Time**

   * Whenever you create a new record—whether via the Admin Dashboard (web) or via API calls from the iOS app—always set `restaurant_id = CURRENT_TENANT_ID`.
   * On the backend, you can derive `CURRENT_TENANT_ID` from:

     * The subdomain (e.g. `demo-ramen.coorder`) via middleware, or
     * A custom claim inside the user’s JWT (more on that below).

3. **Never Expose a “Global” List Without a WHERE Clause**

   * Every `SELECT ... FROM menu_items` or `SELECT ... FROM orders` must include `WHERE restaurant_id = CURRENT_TENANT_ID`.
   * If you accidentally run a query without that filter, you may leak data from other restaurants.

---

## 2. Use Row-Level Security (RLS) Policies in Supabase

Instead of manually adding `WHERE restaurant_id = …` to every query, Supabase’s Row-Level Security (RLS) can enforce it at the database level. The steps are:

1. **Enable RLS on Each Table**
   In the Supabase SQL Editor (or via migration), run:

   ```sql
   ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
   ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   -- and so on for every tenant-scoped table
   ```

2. **Create a Policy that Restricts Reads/Writes to the Current Tenant**
   You’ll need to decide how you’ll pass the “current tenant” information into Postgres. Two common approaches:

   * **(A) Embed `restaurant_id` in the JWT claims**
     Whenever an owner logs in, your backend (or Supabase Edge Function) can include a custom JWT claim `restaurant_id` that matches their restaurant’s UUID. Every subsequent request from that user’s session automatically carries that claim.
     Then you write a policy like:

     ```sql
     CREATE POLICY "Tenant can SELECT their menu_items"
       ON menu_items
       FOR SELECT
       USING ( restaurant_id = auth.jwt() ->> 'restaurant_id' );

     CREATE POLICY "Tenant can INSERT their menu_items"
       ON menu_items
       FOR INSERT
       WITH CHECK ( restaurant_id = auth.jwt() ->> 'restaurant_id' );
     ```

     Repeat for `UPDATE`/`DELETE` and for every table that has `restaurant_id`.

   * **(B) Look up `restaurant_id` by subdomain in a middleware function**
     If you prefer not to embed it in the JWT, you can create a Supabase Edge Function (or Next.js API route) that:

     1. Reads the Host header (e.g. `demo-ramen.coorder`).
     2. Queries `restaurants` to find the matching `id`.
     3. Sets a Postgres session variable: `SET app.current_restaurant_id = '<UUID>'`.
     4. Inside your RLS policy, you refer to that session variable:

        ```sql
        CREATE POLICY "Tenant can SELECT menu_items"
          ON menu_items
          FOR SELECT
          USING ( restaurant_id = current_setting('app.current_restaurant_id')::uuid );
        ```
     5. Likewise, for `INSERT/UPDATE/DELETE`, use `WITH CHECK ( restaurant_id = current_setting('app.current_restaurant_id')::uuid )`.

   Both approaches achieve the same goal: the database itself refuses any row whose `restaurant_id` does not match the “current” one. If you inadvertently forget to include a filter, RLS will block it.

3. **Lock Down Public Access**

   * By default, Supabase gives the `authenticated` role permission to `SELECT` on all tables.
   * With RLS enabled, you revoke those generic grants and only allow access via your policies. For example:

     ```sql
     REVOKE ALL ON menu_items FROM authenticated;
     ```
   * Now, only your RLS policies (which check `restaurant_id`) permit access.

---

## 3. Subdomain-Based Tenant Context (Middleware)

On the web side (Next.js), you typically determine “which restaurant” by reading the incoming request’s Host header. For example:

1. **Middleware Code Sample**
   In `/web/middleware.ts`:

   ```ts
   import { NextResponse } from "next/server";
   import type { NextRequest } from "next/server";

   export function middleware(req: NextRequest) {
     const host = req.headers.get("host") || "";
     const subdomain = host.split(".")[0];           // e.g. "demo-ramen"
     if (!subdomain || subdomain === "coorder") {
       return NextResponse.next();                    // landing page or 404
     }

     // Attach subdomain to the URL so downstream code (and Edge Functions) can see it:
     req.nextUrl.searchParams.set("restaurant", subdomain);
     return NextResponse.next();
   }

   export const config = {
     matcher: ["/((?!api|_next|static|favicon.ico).*)"],
   };
   ```

2. **Lookup Restaurant ID in a Shared Utility**
   Whenever your server-side code (API route or page) needs the UUID, call a helper:

   ```ts
   import { supabaseAdmin } from "../lib/supabaseAdmin";

   export async function getCurrentRestaurantId(req) {
     const subdomain = req.nextUrl.searchParams.get("restaurant");
     const { data, error } = await supabaseAdmin
       .from("restaurants")
       .select("id")
       .eq("subdomain", subdomain)
       .single();
     if (error || !data) throw new Error("Invalid subdomain");
     return data.id;
   }
   ```

   Then you can set a Postgres session variable or embed that ID in a JWT.

3. **Propagate `restaurant_id` to Client-Side Queries**

   * In server components or API routes, fetch the restaurant’s UUID first.
   * Include it in any database query (via Unauthenticated or Admin client).
   * On the client (Next.js React components), your Supabase client may need to pass a header or cookie containing `restaurant_id` so that the RLS policy picks it up.

---

## 4. Storage Bucket Isolation

If your app allows restaurants to upload images (e.g. menu-item photos, logos), you want to prevent Store A from seeing Store B’s images:

1. **Use a Single Storage Bucket with “Folders”**

   * Create a bucket (e.g. `restaurant-uploads`).
   * When uploading an image for menu item X in restaurant Y, store it under a path like:

     ```
     restaurants/{restaurant_id}/menu_items/{item_id}.jpg
     ```
   * In your Supabase Storage RLS policy, ensure users can only list/read files under their own folder:

     ```sql
     CREATE POLICY "Allow read only own files"
       ON storage.objects
       FOR SELECT
       USING (
         bucket_id = 'restaurant-uploads'
         AND substring(path from 1 for length(current_setting('app.current_restaurant_id'))) 
             = current_setting('app.current_restaurant_id')
       );
     ```
   * Or—if you prefer—create one bucket per restaurant (e.g. `uploads_demo-ramen`, `uploads_tokyo-sushi`) and set RLS so only the service role or an authenticated user with the matching tenant can read/write.

2. **Never Expose a “Public” Link Without RLS**

   * If you generate signed URLs for images, ensure you generate them only for the correct `path` and valid `restaurant_id`.

---

## 5. Secure API Endpoints with Tenant Checks

Even with RLS on the database, you should:

1. **Authenticate Every Request**

   * Use Supabase Auth (JWT) or your own auth middleware to ensure every API route receives a valid token.
   * Do not allow unauthenticated access to “write” endpoints.

2. **Double-Check `restaurant_id` in Server Logic**

   * Even though RLS will block invalid rows, it’s good practice to fetch the `restaurant_id` early in your API route and bail if it doesn’t match the user’s token or the subdomain.
   * For example, in `/api/v1/menu/create-item`, do:

     ```ts
     const restaurantId = await getCurrentRestaurantId(req);
     // optional: verify that the JWT’s `restaurant_id` claim matches or that the user has role='owner' 
     const { data, error } = await supabaseAdmin
       .from("menu_items")
       .insert([
         {
           restaurant_id: restaurantId,
           name_ja: ...,
           price: ...,
           // …
         },
       ]);
     ```

3. **Never Trust Client-Sent `restaurant_id`**

   * Do not allow the client to send a raw `restaurant_id` in the request body and rely on it; always derive it from subdomain or token.
   * If you must accept a value, cross-check it against the authenticated user’s actual `restaurant_id`.

---

## 6. JWT Claims & Session Variables

### A. JWT Claim Approach (Simplest for RLS)

1. **Extend the Login Flow**

   * When a new owner registers, after inserting into `users`, call Supabase’s Admin API to set a custom claim on the Auth user:

     ```ts
     await supabaseAdmin.auth.admin.updateUserById(userId, {
       app_metadata: { restaurant_id: restaurantId, role: "owner" }
     });
     ```
   * Supabase will embed `restaurant_id` (and optionally `role`) into the JWT every time that user logs in.

2. **Write RLS Policies Based on JWT Claims**

   * For example, on `menu_items`:

     ```sql
     CREATE POLICY "Owner/Manager can SELECT menu_items"
       ON menu_items
       FOR SELECT
       USING (
         restaurant_id = auth.jwt() ->> 'restaurant_id'
       );
     CREATE POLICY "Owner/Manager can INSERT menu_items"
       ON menu_items
       FOR INSERT
       WITH CHECK (
         restaurant_id = auth.jwt() ->> 'restaurant_id'
       );
     ```
   * You can write similar policies for every table (`orders`, `tables`, `reviews`, etc.).

3. **No Need for Subdomain Lookups in RLS**

   * As soon as a user’s JWT carries `restaurant_id`, any Supabase client (web or mobile) can call `supabase.from("menu_items").select(...)` without explicitly filtering by `restaurant_id`—the RLS policy blocks rows that don’t match the JWT claim.

### B. Session-Variable Approach (Alternative)

1. **Set `app.current_restaurant_id` per Request**

   * In your Next.js Edge Function or API route’s middleware, call:

     ```sql
     SET app.current_restaurant_id = '<UUID>';
     ```
   * This does not require expanding the JWT, but it does require every trusted server-side call to run `SET` before making queries.

2. **RLS Policies Refer to `current_setting('app.current_restaurant_id')`**

   * Example:

     ```sql
     CREATE POLICY "Tenant can SELECT tables"
       ON tables
       FOR SELECT
       USING ( restaurant_id = current_setting('app.current_restaurant_id')::uuid );
     ```

---

## 7. Least Privilege for Supabase Clients

1. **Use Supabase’s “service\_role” Key Sparingly**

   * The service\_role key bypasses RLS entirely and should only be used in server-side code or Edge Functions.
   * On the client (Next.js browser, iOS app), use the anon/public key, which is subject to RLS.

2. **Lock Down Public Access to Protected Tables**

   * After enabling RLS, explicitly revoke the default SELECT/INSERT privileges from the `authenticated` role and grant them only via your RLS policies.

     ```sql
     REVOKE ALL ON menu_items FROM authenticated;
     REVOKE ALL ON orders FROM authenticated;
     -- etc.
     ```

---

## 8. Testing & Auditing

1. **Manual Sanity Checks**

   * Log in as one restaurant’s owner and try to fetch data from another restaurant’s tables or menu\_items. You should get an empty array (no results).
   * Attempt to insert a row with a different `restaurant_id`—the RLS policy or your server-side check should block it.

2. **Automated Integration Tests**

   * Write a test suite (Jest for Node / Supertest for your Next.js API routes) that:

     * Creates two restaurants (`A` and `B`) programmatically.
     * Creates a user for `A` (embedded JWT), logs in, and tries to fetch `B`’s `menu_items` → assert no rows.
     * Inserts a new menu item for `A` → assert success.
     * Inserts a new menu item for `B` using `A`’s JWT → assert “permission denied.”

3. **Periodic Policy Audit**

   * Periodically review your RLS policies to ensure every table that should be tenant-scoped has the correct `USING (…)` and `WITH CHECK (…)` clauses.

---

## Summary Checklist

1. **Database Schema**

   * [ ] Every tenant-scoped table has `restaurant_id UUID NOT NULL`.
   * [ ] Index on `restaurant_id` for performance.

2. **RLS Policies**

   * [ ] ENABLE RLS on each table.
   * [ ] Create `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies that check either `auth.jwt() ->> 'restaurant_id'` or `current_setting('app.current_restaurant_id')`.

3. **Authentication**

   * [ ] On signup, embed `restaurant_id` (and role) as a custom JWT claim.
   * [ ] Use the anon key on the client so RLS naturally applies.

4. **Subdomain Middleware**

   * [ ] Extract `subdomain` from `Host` header.
   * [ ] Either embed that subdomain’s `restaurant_id` into JWT or set a Postgres session variable.

5. **API & UI Guardrails**

   * [ ] Server routes always derive `restaurant_id` from subdomain or JWT—never trust a client-provided ID.
   * [ ] Do not expose a “superuser” key on the client side.

6. **Storage Buckets**

   * [ ] Use folder prefixes (`restaurants/{id}/…`) or separate buckets per tenant.
   * [ ] Apply RLS or signed URL logic so only the correct tenant can access their files.
