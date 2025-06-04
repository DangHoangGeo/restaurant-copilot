### 4. Admin Dashboard (Web)

4.1. **Protected Layout & Session Context**

* Create `/web/components/ProtectedLayout.tsx`: wraps children in a check for Supabase session; if no session, redirect to `/{locale}/login`.
  (Req 4.1)
* Create `/web/hooks/useRestaurantContext.ts` that reads `restaurant` and `locale` from `searchParams`. All data-fetching functions use this `restaurant` (subdomain) to look up the corresponding `restaurant_id` (via an Edge Function or a helper that queries Supabase).
* Update `/web/app/[locale]/dashboard/layout.tsx` to wrap content in:

  ```tsx
  <SessionContextProvider supabaseClient={supabase}>
    <ProtectedLayout>{children}</ProtectedLayout>
  </SessionContextProvider>
  ```
* Verify that accessing `/ja/dashboard` without logging in sends you to `/ja/login`; after login, you land in `/ja/dashboard`.
  ‣ (Req 4.1)

4.2. **Restaurant Profile & Settings**

* Create `/web/app/[locale]/dashboard/settings/page.tsx` (Server Component) that:

  1. Uses a helper `getCurrentRestaurantId(searchParams)` to fetch the tenant’s `restaurant_id`.
  2. Calls `supabaseAdmin.from("restaurants").select("*").eq("id", restaurantId).single()`.
  3. Passes `restaurant` data to a client component `<SettingsForm restaurant={restaurant} locale={locale} />`.
* In `/web/components/SettingsForm.tsx` (Client Component):

  * Use `zod` to validate fields:

    ```ts
    const settingsSchema = z.object({
      name: z.string().min(1).max(100),
      defaultLanguage: z.enum(["ja","en","vi"]),
      brandColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
      contactInfo: z.string().optional(),
      logoFile: z.any().optional(),
    });
    ```

    (Req 4.2)
  * On submit:

    1. `supabase.from("restaurants").update({ … }).eq("id", restaurant.id)`
    2. If `logoFile` exists: upload to `restaurant-uploads/restaurants/{restaurant.id}/logos/logo.png` with `upsert: true`; then fetch and store the public URL as `logo_url`.
  * Show success/error toasts.
* Validate that updating data writes correctly to Supabase and that RLS policies permit updating only that tenant.
  ‣ (Req 4.2)

4.3. **Menu Management**
4.3.1. **Category List & Reorder**
\- `/web/app/[locale]/dashboard/menu/page.tsx` (Server Component):
1\. Use `getCurrentRestaurantId(searchParams)`.
2\. `supabaseAdmin.from("categories").select("id,name,position,menu_items(id,name_ja,name_en,name_vi,available,position)").eq("restaurant_id", restaurantId).order("position", { ascending: true }).order("menu_items.position", { ascending: true })`.
3\. Pass `categories` to `<CategoryList categories={categories} locale={locale} />`.
\- In `/web/components/CategoryList.tsx` (Client Component):
\- Use `react-beautiful-dnd` to drag/reorder categories. On drag end, call `POST /api/v1/menu/reorder` with an array of `{ id, position }`.
\- Each category card shows its name and a link to “Edit” or “Delete,” plus a nested list of menu items (showing localized name and “Available”/“Unavailable”).
\- “New Category” button links to `/dashboard/menu/new`.
(Req 4.3.1, 4.3.3)
\- Create Edge Function `/web/app/api/v1/menu/reorder.ts` that accepts `[{ id: uuid, position: int }, …]`, updates `categories.position` accordingly (validating `restaurant_id` via RLS).
(Req 4.3.1)

4.3.2. **Category CRUD Forms**
\- `/web/app/[locale]/dashboard/menu/new/page.tsx` and `/web/app/[locale]/dashboard/menu/[categoryId]/edit/page.tsx`:
\- Use a Zod schema:
`ts
         const categorySchema = z.object({
           name: z.string().min(1).max(50),
           position: z.number().optional(),
         });
         `
(Req 4.3.2)
\- On submit: if `categoryId` exists, call `supabase.from("categories").update({ name, position }).eq("id", categoryId).eq("restaurant_id", restaurantId)`; otherwise, insert with `{ restaurant_id, name, position }`.
\- After success, redirect to `/dashboard/menu`.
\- RLS ensures only tenant can modify its own categories.
‣ (Req 4.3.2)

4.3.3. **Menu Item CRUD Forms**
\- `/web/app/[locale]/dashboard/menu/[categoryId]/items/new/page.tsx` and `/web/app/[locale]/dashboard/menu/[categoryId]/items/[itemId]/edit/page.tsx` (Server Components) fetch either no item (for new) or the existing item (for edit) via `supabaseAdmin.from("menu_items").select("*").eq("id", itemId).single()`. Pass to `<MenuItemForm restaurantId={restaurantId} categoryId={categoryId} item={item} locale={locale} />`.
\- In `/web/components/MenuItemForm.tsx`:
\- Zod schema:
`ts
         const menuItemSchema = z.object({
           categoryId: z.string().uuid(),
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
           imageFile: z.any().optional(),
         });
         `
(Req 4.3.3)
\- On submit:
1\. If editing, `supabase.from("menu_items").update({ … }).eq("id", item.id).eq("restaurant_id", restaurantId)`.
2\. If new, `const { data: newItem } = await supabase.from("menu_items").insert([{ restaurant_id: restaurantId, ... }]).select("id").single();`
Then call `uploadImage(newItem.id, file, restaurantId)`.
3\. `uploadImage(itemId, file, restaurantId)` uploads to `restaurant-uploads/restaurants/{restaurantId}/menu_items/{itemId}.jpg`, then fetches `publicURL` and updates `menu_items.image_url`.
\- After insert/update, redirect to `/dashboard/menu`.
\- Verify that only items belonging to that tenant can be fetched/modified (RLS).
‣ (Req 4.3.3)

4.4. **Table Management & QR Codes**
4.4.1. **Table List Page**
\- `/web/app/[locale]/dashboard/tables/page.tsx` (Server Component):
1\. `const { data: tables } = await supabaseAdmin.from("tables").select("id,name").eq("restaurant_id", restaurantId).order("name")`.
2\. Pass to `<TableList tables={tables} locale={locale} />`.
\- In `/web/components/TableList.tsx`:
\- Render a `<table>` with rows showing `table.name` and actions:
• “Edit” → `/dashboard/tables/{tableId}/edit`
• “Delete” → calls `DELETE /api/v1/tables/{tableId}` (Edge Function with RLS checks)
• “QR Code” → link to `/dashboard/tables/{tableId}/qr` (new page)
\- “New Table” button → `/dashboard/tables/new`.
(Req 4.4.1, 4.4.4)

4.4.2. **New/Edit Table Form**
\- `/web/app/[locale]/dashboard/tables/new/page.tsx` and `/web/app/[locale]/dashboard/tables/[tableId]/edit/page.tsx`:
\- Zod schema:
`ts
         const tableSchema = z.object({
           name: z.string().min(1).max(50),
           positionX: z.number().optional(),
           positionY: z.number().optional(),
         });
         `
(Req 4.4.2)
\- On submit:
• If editing: `supabase.from("tables").update({ name, position_x, position_y }).eq("id", tableId).eq("restaurant_id", restaurantId)`
• If new: `supabase.from("tables").insert([{ restaurant_id: restaurantId, name, position_x, position_y, qr_code: "" }])`.
\- Redirect back to `/dashboard/tables`.
\- RLS ensures only that tenant’s tables can be created/edited.
‣ (Req 4.4.2)

4.4.3. **QR Code Generation Page**
\- `/web/app/[locale]/dashboard/tables/[tableId]/qr/page.tsx`:
\- Use a client component that reads `restaurantSubdomain` from `useRestaurantContext()` and `locale` from params.
\- Compute URL:
`          https://${restaurantSubdomain}.shop-copilot.com/${locale}/customer/order?tableId=${tableId}
         `
\- Render `<QRCode value={url} size={256} />` from `react-qr-code`.
\- Implement a “Download PNG” button that:
1\. Serializes the `<svg>` to base64.
2\. Draws it onto a hidden HTML `<canvas>` sized 256×256.
3\. Converts to `toDataURL("image/png")`.
4\. Triggers a download via an `<a download>` link.
(Req 4.4.3)
\- Verify that downloading yields a valid 256×256 PNG that, when scanned by any QR app, routes to the correct order page.
‣ (Req 4.4.3)

4.5. **Employee & Schedule Management**
4.5.1. **Employee Directory & CRUD**
\- `/web/app/[locale]/dashboard/employees/page.tsx` (Server Component):
1\. `const { data: employees } = await supabaseAdmin.from("employees").select("id,role,users(name,email)").eq("restaurant_id", restaurantId)` (using a JOIN on `users`).
2\. Pass to `<EmployeeList employees={employees} locale={locale} />`.
\- In `/web/components/EmployeeList.tsx`:
\- Display a table: Name (`users.name`), Email (`users.email`), Role (localized), and actions:
• “Edit” → `/dashboard/employees/{employeeId}/edit`
• “Delete” → `DELETE /api/v1/employees/{employeeId}` (Edge Function checks RLS)
• “Schedule” → `/dashboard/employees/{employeeId}/schedule`
\- “Add Employee” button → `/dashboard/employees/new`.
(Req 4.5.1)

````
 - New/Edit Employee forms (`/web/app/[locale]/dashboard/employees/new/page.tsx` and `/edit/{employeeId}/page.tsx`):  
   - Zod schema:  
     ```ts
     const employeeSchema = z.object({
       userEmail: z.string().email(),
       role: z.enum(["chef","server","cashier","manager"]),
     });
     ```  
     (Req 4.5.1)  
   - On submit:  
     1. Query `users` table: `supabase.from("users").select("id").eq("email", userEmail).eq("restaurant_id", restaurantId).single()`. If not found, show “User not found.”  
     2. If editing: `supabase.from("employees").update({ role }).eq("id", employeeId).eq("restaurant_id", restaurantId)`.  
     3. If new: `supabase.from("employees").insert([{ restaurant_id: restaurantId, user_id: user.id, role }])`.  
   - Redirect to `/dashboard/employees`.  
 - Verify RLS prohibits adding an employee whose `users.restaurant_id` differs.  
 ‣ (Req 4.5.1)
````

4.5.2. **Weekly Schedule Calendar**
\- `/web/app/[locale]/dashboard/employees/[employeeId]/schedule/page.tsx`:
\- Use a client component with a calendar UI library (e.g., `react-day-picker` or custom) to display a weekly grid (Mon–Sun, 06:00–23:00).
\- Fetch existing shifts: `supabase.from("schedules").select("id,weekday,start_time,end_time").eq("employee_id", employeeId)`.
\- Render shifts visually (e.g., colored blocks on their weekday/time).
\- Provide a form or drag interface to add new shifts (weekday 1–7, start\_time < end\_time). On save, call `POST /api/v1/schedules` to insert into `schedules`.
\- For edits/deletions, call `PATCH /api/v1/schedules/{id}` or `DELETE /api/v1/schedules/{id}`. All API routes must check `(restaurant_id = auth.jwt()->>'restaurant_id')`.
(Req 4.5.3)
\- Implement corresponding Edge Functions under `/api/v1/schedules/*` that apply RLS and Zod validation.
\- Test by assigning overlapping shifts to the same employee; optionally enforce a business rule to prevent overlaps or allow but highlight conflicts.
‣ (Req 4.5.3)

4.6. **Reports & Analytics**
4.6.1. **Dashboard Cards (Server-Side Data)**
\- In `/web/app/[locale]/dashboard/reports/page.tsx`, fetch in the Server Component:
1\. **Today’s Total Sales**:
`ts
          const today = new Date().toISOString().split("T")[0];
          const { data: todaySnapshot } = await supabaseAdmin
            .from("analytics_snapshots")
            .select("total_sales")
            .eq("restaurant_id", restaurantId)
            .eq("date", today)
            .single();
          `
2\. **Active Orders Count**:
`ts
          const { count: activeOrdersCount } = await supabaseAdmin
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("restaurant_id", restaurantId)
            .neq("status", "completed");
          `
3\. **Top-Selling Item Today**:
`ts
          const { data: topSeller } = await supabaseAdmin
            .from("order_items")
            .select("menu_item_id, SUM(quantity) as total_sold")
            .join("orders", "order_items.order_id", "orders.id")
            .eq("orders.restaurant_id", restaurantId)
            .eq("date(orders.created_at)", today)
            .group("menu_item_id")
            .order("total_sold", { ascending: false })
            .limit(1)
            .single();
          `
4\. **Low-Stock Alerts**:
`ts
          const { data: lowStockItems } = await supabaseAdmin
            .from("inventory_items")
            .select("menu_item_id, stock_level")
            .eq("restaurant_id", restaurantId)
            .lte("stock_level", "threshold");
          `
\- Pass these to a `<DashboardCards>` client component that displays four cards with icons and values.
(Req 4.6.1)

4.6.2. **Sales Report Tab**
\- In the same Server Component, also fetch:
`ts
       const { data: salesData } = await supabaseAdmin
         .from("analytics_snapshots")
         .select("date, total_sales")
         .eq("restaurant_id", restaurantId)
         .gte("date", dateFrom) // dateFrom depends on selected range (7 days, 30 days)
         .order("date", { ascending: true });
       `
(Req 4.6.2)
\- Fetch category breakdown via an RPC: `supabaseAdmin.rpc("get_category_sales", { p_restaurant: restaurantId, p_range })`. That returns `{ category_name, total_sales }`.
\- Pass data to a `<SalesReport>` client component that renders:
\- A bar chart (recharts) for `salesData` (date on X, total on Y).
\- A pie chart for category breakdown.
\- Buttons to switch between “Last 7 Days” and “Last 30 Days,” updating `dateFrom` accordingly.
\- Allow “Export CSV” by converting `salesData` to a CSV and triggering a download.
‣ (Req 4.6.2)

4.6.3. **Items Report Tab**
\- In the Server Component, call an RPC `get_items_report(restaurantId)` that aggregates:
`sql
       SELECT 
         mi.id AS item_id,
         mi.name_ja, mi.name_en, mi.name_vi,
         SUM(oi.quantity) AS total_sold,
         SUM(oi.quantity * mi.price) AS total_revenue,
         AVG(r.rating) AS avg_rating
       FROM menu_items mi
       LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
       LEFT JOIN reviews r ON mi.id = r.menu_item_id
       WHERE mi.restaurant_id = p_restaurant
       GROUP BY mi.id;
       `
(Req 4.6.3)
\- Pass the returned rows (including localized `name_{locale}`) to `<ItemsReport>` which renders a `<DataTable>` (or HTML `<table>`) with columns: Item Name, Total Sold, Revenue, Avg Rating. Make it sortable and provide a CSV export button.
‣ (Req 4.6.3)

4.6.4. **Feedback Report Tab**
\- Server Component fetches latest 50 reviews:
`ts
       const { data: reviews } = await supabaseAdmin
         .from("reviews")
         .select("id, rating, comment, resolved, created_at, menu_items(name_ja,name_en,name_vi)")
         .eq("restaurant_id", restaurantId)
         .order("created_at", { ascending: false })
         .limit(50);
       `
(Req 4.6.4)
\- Pass to `<FeedbackReport>` which displays each row as:
‣ Localized item name (e.g., `menu_items.name_{locale}`)
‣ Rating (stars)
‣ Comment text
‣ Formatted `created_at` (based on locale)
‣ Resolved (“Yes” or “No”)
‣ A “Resolve” button that calls `POST /api/v1/reviews/resolve` with `{ reviewId }`. On success, refresh the table.
(Req 4.6.4)
\- Verify that the API’s RLS only allows resolving reviews for that tenant.
‣ (Req 4.6.4)

4.6.5. **Recommendations Widget**
\- In the Server Component, also call RPC `get_top_sellers_7days(restaurantId, 3)` to get `{ menu_item_id, total_sold }`. Join with `menu_items` to fetch localized names.
\- Pass `topSellers` to `<RecommendationWidget>`, which lists:
`        1. Ramen — 42 sold        2. Gyoza — 35 sold        3. Karaage — 28 sold
       `
\- A button “Apply to Next Week” triggers `POST /api/v1/recommendations/apply` with `{ restaurantId }`. That Edge Function calls `public.apply_recommendations(restaurantId)`.
(Req 4.6.5)
\- Confirm that after applying, the “Featured” category in the menu contains those three items with `weekday_visibility = [1..7]`.
‣ (Req 4.6.5)

---
