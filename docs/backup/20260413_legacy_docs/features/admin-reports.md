# Admin Reports & Analytics

## Summary

While a comprehensive "Reports & Analytics" dashboard is marked as "Coming Soon" in the main UI, a specific actionable analytics feature currently exists: the **Top Seller Recommendations**. This feature identifies the top-selling menu items over the past 7 days and allows an administrator to automatically populate a "Featured" category with these items, effectively promoting popular dishes.

## How it works technically

### Frontend

-   **Reports Page (`web/app/[locale]/dashboard/reports/page.tsx` & `reports-client-content.tsx`):**
    -   The main page for reports currently displays a "Coming Soon" message, indicating that broader analytics visualizations are not yet implemented here.
-   **Recommendations Widget (`web/components/features/admin/reports/recommendations-widget.tsx`):**
    -   This is a functional client-side React component.
    -   **Data Fetching**: On mount (or when `restaurantId` changes), it calls the PostgreSQL function `get_top_sellers_7days` via Supabase RPC. It requests the top 3 sellers for the current `restaurantId`.
    -   **Display**: Lists the names and total units sold for the fetched top-selling items.
    -   **Action**: Provides an "Apply Recommendations" button. Clicking this button triggers a `POST` request to the `/api/v1/recommendations/apply` backend API endpoint, sending the `restaurantId`.
    -   User feedback for these operations (loading, success, error) is provided, likely using `toast` notifications.

### Backend

The backend consists of API routes and PostgreSQL functions executed via Supabase RPC.

-   **API Endpoint - Apply Recommendations (`POST /api/v1/recommendations/apply`):**
    -   File: `web/app/api/v1/recommendations/apply/route.ts`
    -   Expects a JSON body containing `restaurantId`.
    -   Calls the PostgreSQL function `apply_recommendations` using `supabaseAdmin.rpc`, passing the `p_restaurant_id`.
    -   Returns a JSON response indicating success or failure.
-   **PostgreSQL Function - `get_top_sellers_7days(p_restaurant_id uuid, p_limit int)`:**
    -   File: `infra/migrations/007_create_get_top_sellers_7days_function.sql`
    -   Queries the `order_items`, `orders`, and `menu_items` tables.
    -   Calculates the sum of quantities for each menu item sold within the last 7 days for the specified `p_restaurant_id`.
    -   Returns a table with `menu_item_id`, multilingual names (`name_en`, `name_ja`, `name_vi`), and `total_sold`, ordered by `total_sold` DESC and limited by `p_limit`.
-   **PostgreSQL Function - `apply_recommendations(p_restaurant_id uuid)`:**
    -   File: `infra/migrations/008_create_apply_recommendations_function.sql`
    -   This function performs the following actions within a transaction:
        1.  **Find/Create "Featured" Category**: Looks for a category named "Featured" (English name) for the given `p_restaurant_id`. If not found, it creates one with default localized names ('おすすめ' for Japanese, 'Nổi bật' for Vietnamese).
        2.  **Clear Featured Category**: Deletes all existing `menu_items` currently in this "Featured" category for the restaurant.
        3.  **Fetch Top Sellers**: Calls `get_top_sellers_7days(p_restaurant_id, 3)` to get the top 3 selling items.
        4.  **Copy to Featured**: Inserts copies of these top-selling menu items into the "Featured" category, setting them as `available` and visible on all weekdays.
    -   Returns `{ success: true }` in JSON format upon successful completion.
-   **PostgreSQL Function - `get_active_orders_with_details(restaurant_uuid UUID)`:**
    -   File: `infra/migrations/011_get_active_orders_function.sql`
    -   Fetches comprehensive details for currently active orders (status 'new', 'preparing', 'ready').
    -   While present in the codebase, this function does not appear to be directly utilized by the existing "Recommendations Widget" or the "Coming Soon" reports page. It's likely intended for other operational dashboards (e.g., kitchen display).

### Data Structures & Types

-   **TopSeller (Frontend type in `recommendations-widget.tsx`):**
    -   `menu_item_id`: string (UUID)
    -   `name`: string (localized name or default from DB)
    -   `total_sold`: number
-   No specific shared types for reports (e.g., `report.types.ts`) were found. Data structures are implicitly defined by the return types of the SQL functions and the frontend component's needs.

### Database Tables Involved (for the Recommendations feature)

-   `orders`: Used to filter orders by `restaurant_id` and `created_at` (for the 7-day window).
-   `order_items`: Used to sum quantities of `menu_item_id` to find top sellers.
-   `menu_items`: Joined to get item details (names, and for copying to the "Featured" category).
-   `categories`: Queried to find/create the "Featured" category and to link featured items.

## Dependencies (for the Recommendations feature)

-   Supabase client libraries: For RPC calls and potentially other DB interactions.
-   `next-intl`: For internationalization in the widget.
-   `shadcn/ui` components (Button): For UI elements in the widget.
-   `sonner` (or similar): Implied for toast notifications.

## File and Folder Paths

**Frontend Components & Pages:**
-   `web/app/[locale]/dashboard/reports/page.tsx`
-   `web/app/[locale]/dashboard/reports/reports-client-content.tsx`
-   `web/components/features/admin/reports/recommendations-widget.tsx`

**API Routes:**
-   `web/app/api/v1/recommendations/apply/route.ts`

**SQL Function Definitions (in `infra/migrations/`):**
-   `007_create_get_top_sellers_7days_function.sql`
-   `008_create_apply_recommendations_function.sql`
-   `011_get_active_orders_function.sql` (exists but not directly used by current reports UI)

## How to use or modify

### How an admin views and interprets reports

1.  **Navigate to Reports**: Access the "Reports" section in the admin dashboard.
2.  **"Coming Soon"**: The main analytics dashboard is currently marked as "Coming Soon".
3.  **Recommendations Widget**:
    -   This widget (potentially displayed on the main dashboard or within the reports section if it were fully built out) automatically shows the top 3 selling items from the last 7 days.
    -   The admin can see the names of these items and how many units were sold.
    -   **Action**: The admin can click "Apply Recommendations". This will automatically update a "Featured" category in their menu to showcase these top sellers. This is a quick way to highlight popular dishes.

### How a developer might add a new report (e.g., "sales by employee")

This would involve several steps, assuming the main reports page (`reports-client-content.tsx`) is built out to display more than just the "Coming Soon" message.

1.  **Create PostgreSQL Function (if complex data aggregation is needed):**
    -   Define a new SQL function, e.g., `get_sales_by_employee(p_restaurant_id uuid, p_start_date date, p_end_date date)`.
    -   This function would query `orders`, `order_items`, and link to `employees` (or `users` if employee ID is on orders directly) to sum `total_amount` from `orders` grouped by employee.
    -   Create a new migration file in `infra/migrations/` for this function.
        ```sql
        -- Example: infra/migrations/01X_create_get_sales_by_employee_function.sql
        CREATE OR REPLACE FUNCTION get_sales_by_employee(p_restaurant_id uuid, p_start_date date, p_end_date date)
        RETURNS TABLE (employee_id UUID, employee_name TEXT, total_sales DECIMAL)
        LANGUAGE sql AS $$
            SELECT
                e.user_id as employee_id, -- Assuming employees table links to users table for name
                u.name as employee_name,
                SUM(o.total_amount) as total_sales
            FROM orders o
            JOIN employees e ON o.processed_by_employee_id = e.id -- Assuming such a field exists on orders
            JOIN users u ON e.user_id = u.id
            WHERE o.restaurant_id = p_restaurant_id
              AND o.created_at >= p_start_date
              AND o.created_at <= p_end_date
              AND o.status = 'completed' -- Only count completed sales
            GROUP BY e.user_id, u.name
            ORDER BY total_sales DESC;
        $$;
        ```
2.  **Create API Endpoint (Optional but Recommended):**
    -   Create a new API route, e.g., `web/app/api/v1/reports/sales-by-employee/route.ts`.
    -   This route would handle requests from the frontend, validate parameters (like date range), call the `get_sales_by_employee` RPC function, and return the data.
    -   Alternatively, the frontend could call the RPC function directly if security (RLS) and API consistency allow.
3.  **Develop Frontend Display:**
    -   Modify `web/app/[locale]/dashboard/reports/reports-client-content.tsx` to remove/replace the "Coming Soon" message.
    -   Add UI elements for selecting a date range.
    -   Fetch data from the new API endpoint (or directly via RPC).
    -   Display the data, perhaps in a table or using a charting library (e.g., Recharts, Chart.js) to visualize sales per employee.
        -   If using a charting library, it would need to be added as a dependency (`npm install recharts`).
    -   Define frontend types for the report data if not already available.

This process provides a structured way to add new, specific reports to the system.
