# Admin Order Management

## Summary

The Admin Order Management feature provides restaurant administrators with tools to view, track, and manage customer orders in real-time. It allows for creating new orders, adding items to existing orders, updating the status of individual items (e.g., ordered, preparing, ready, served) and overall orders (e.g., new, preparing, ready, completed, canceled), adding notes to items, and processing checkouts. The interface is designed to update dynamically as changes occur in the database.

## How it works technically

### Frontend

The frontend is built with Next.js and React. It uses client-side components to manage the interactive aspects of order management and server-side components for initial data fetching.

-   **Main Page (`web/app/[locale]/dashboard/orders/page.tsx`):**
    -   A server component that fetches initial data required for the order management dashboard. This includes current orders (typically for the day), available tables, and menu categories with items (for creating new orders).
    -   Defines key data interfaces like `Order`, `OrderItem`, `Table`, and `Category`.
    -   Passes this data to the `OrdersClientContent` component.
-   **Client Content (`web/app/[locale]/dashboard/orders/orders-client-content.tsx`):**
    -   The core client-side component for the order management interface.
    -   Manages real-time updates to orders and order items by subscribing to Supabase database changes.
    -   Provides views for "Order Items" (kitchen-focused, showing individual items and their statuses) and "Orders" (overall order status and management).
    -   Includes functionality for:
        -   Filtering orders/items (e.g., by status, for today).
        -   Searching orders/items.
        -   Opening modals to:
            -   Create a new order (select table, add multiple items with quantities and notes).
            -   Add items to an existing order.
            -   View order details.
            -   Process checkout for an order.
        -   Updating the status of individual order items (e.g., ordered -> preparing -> ready -> served).
        -   Editing notes for individual order items.
    -   Uses `useTranslations` from `next-intl` for localization.
    -   Interacts with various API endpoints for CRUD operations on orders and order items.
-   **Recent Orders Table (`web/components/features/admin/dashboard/RecentOrdersTable.tsx`):**
    -   A component likely used on a general admin dashboard to show a quick summary of recent orders.
    -   Defines a `RecentOrder` interface for its specific data needs.
    -   Displays order ID/customer name, item count, total amount, status, and creation date.

### Backend (API Routes)

The backend API is built with Next.js API routes and interacts with a Supabase database using `supabaseAdmin` for privileged access. Authentication and restaurant ownership are generally checked.

-   **Orders:**
    -   `POST /api/v1/orders` (`web/app/api/v1/orders/route.ts`): Creates a new order. Takes `table_id` and an array of `order_items` (menu_item_id, quantity, notes). Validates table and menu item ownership, calculates total amount, and inserts the order and its items.
    -   `GET /api/v1/orders/list?today={boolean}` (`web/app/api/v1/orders/list/route.ts`): Fetches a list of orders for the restaurant associated with the request's subdomain. Can be filtered to return only today's orders. Includes details like order items, menu items with categories, and table names.
    -   `POST /api/v1/orders/[orderId]/checkout` (`web/app/api/v1/orders/[orderId]/checkout/route.ts`): Processes the checkout for an order. Marks all its items as "served" and the order status as "completed".
    -   `POST /api/v1/orders/[orderId]/items` (`web/app/api/v1/orders/[orderId]/items/route.ts`): Adds new items to an existing order. Validates menu items and updates the order's total amount.
    -   `PATCH /api/v1/orders/[orderId]/status` (`web/app/api/v1/orders/[orderId]/status/route.ts`): Updates the status of an entire order (e.g., "new", "serving", "completed", "canceled").
    -   `POST /api/v1/orders/create` (`web/app/api/v1/orders/create/route.ts`): An alternative endpoint for creating/adding items to an order, seemingly based on a `sessionId`. It handles more complex item validation including sizes and toppings. This might be intended for customer-facing order creation rather than admin panel usage.
-   **Order Items:**
    -   `PATCH /api/v1/order-items/[itemId]/notes` (`web/app/api/v1/order-items/[itemId]/notes/route.ts`): Updates the notes for a specific order item.
    -   `PATCH /api/v1/order-items/[itemId]/status` (`web/app/api/v1/order-items/[itemId]/status/route.ts`): Updates the status of a specific order item (e.g., "ordered", "preparing", "ready", "served").

### Data Structures & Types

-   **Order (`web/app/[locale]/dashboard/orders/page.tsx`):**
    -   `id`: string (UUID)
    -   `table_id`: string (UUID)
    -   `status`: "new" | "preparing" | "ready" | "completed" | "canceled"
    -   `total_amount`: number | null
    -   `created_at`: string (timestamp)
    -   `order_items`: Array of `OrderItem`
    -   `tables`: Array of objects with table `name` and `id`.
-   **OrderItem (`web/app/[locale]/dashboard/orders/page.tsx`):**
    -   `id`: string (UUID)
    -   `quantity`: number
    -   `notes`: string | null
    -   `status`: "ordered" | "preparing" | "ready" | "served"
    -   `created_at`: string (timestamp)
    -   `menu_items`: Array of objects containing menu item details (id, multilingual names, category_id, price) and nested category details.
-   **Table (`web/app/[locale]/dashboard/orders/page.tsx`):**
    -   `id`: string (UUID)
    -   `name`: string
    -   `status?`: "available" | "occupied" | "reserved"
-   **Zod Schemas:** Used in API routes for input validation (e.g., `createOrderSchema`, `orderItemSchema` in `web/app/api/v1/orders/route.ts`).

### Database Tables (Deduced from API interactions and types)

-   `orders`: Stores order information (id, restaurant_id, table_id, status, total_amount, created_at, session_id potentially).
-   `order_items`: Stores individual items within an order (id, restaurant_id, order_id, menu_item_id, quantity, notes, status, price_at_order, menu_item_size_id, topping_ids).
-   `menu_items`: Stores menu item details. Referenced by `order_items`.
-   `tables`: Stores restaurant table information. Referenced by `orders`.
-   `categories`: Stores menu category information. Referenced by `menu_items`.
-   `menu_item_sizes`: Potentially referenced by `order_items` (as seen in `api/v1/orders/create/route.ts`).
-   `toppings`: Potentially referenced by `order_items` (as seen in `api/v1/orders/create/route.ts`).
-   `restaurants`: Referenced for restaurant-specific data like name and logo.

## Dependencies

-   `next-intl`: For internationalization.
-   `@supabase/supabase-js` (via `lib/supabase/client` and `lib/supabaseAdmin`): For Supabase database interactions.
-   `lucide-react`: For icons.
-   `shadcn/ui` components (Button, Card, Table, Badge, Dialog, Select, Input, ScrollArea, etc.): For UI elements.
-   `sonner`: For toast notifications.
-   `zod`: For schema validation in API routes.

## File and Folder Paths

**Frontend Components & Pages:**
-   `web/app/[locale]/dashboard/orders/page.tsx`
-   `web/app/[locale]/dashboard/orders/orders-client-content.tsx`
-   `web/components/features/admin/dashboard/RecentOrdersTable.tsx`

**API Routes:**
-   `web/app/api/v1/orders/route.ts`
-   `web/app/api/v1/orders/list/route.ts`
-   `web/app/api/v1/orders/create/route.ts` (Potentially for customer interface)
-   `web/app/api/v1/orders/[orderId]/checkout/route.ts`
-   `web/app/api/v1/orders/[orderId]/items/route.ts`
-   `web/app/api/v1/orders/[orderId]/status/route.ts`
-   `web/app/api/v1/order-items/[itemId]/notes/route.ts`
-   `web/app/api/v1/order-items/[itemId]/status/route.ts`

**Shared Types/Interfaces:**
-   Types are primarily defined within `web/app/[locale]/dashboard/orders/page.tsx`.

## How to use or modify

### How an admin uses the UI to manage orders

1.  **View Orders/Items**: Navigate to the Orders dashboard. Choose between "Items View" (kitchen-centric) or "Orders View".
2.  **Real-time Updates**: The list updates automatically as new orders come in or statuses change.
3.  **Filter and Search**: Use search bar to find specific orders/items or filter by status (e.g., "preparing") or date ("Today only").
4.  **Create New Order**:
    -   Click "New Order".
    -   Select a table.
    -   Search and add menu items, specify quantities, and add notes for items.
    -   Click "Create Order".
5.  **Update Item Status (Items View)**:
    -   For an item with status "ordered", click "Preparing".
    -   For an item with status "preparing", click "Ready".
    -   For an item with status "ready", click "Served".
6.  **Update Item Notes (Items View)**:
    -   Click the edit icon next to an item's notes.
    -   Modify notes in the input field and save.
7.  **Add Items to Existing Order (Orders View)**:
    -   Click the "+" icon on an order card.
    -   Search and add new menu items with quantities and notes.
8.  **Process Checkout (Orders View)**:
    -   Click the credit card icon on an order card.
    -   Confirm checkout in the modal. This marks the order as "completed".
9.  **View Order Details (Orders View)**:
    -   Click the eye icon on an order card to see a summary of items and total.

### How a developer might add a new filter to the order list (e.g., filter by payment status)

Assume a new field `payment_status` ("pending", "paid", "failed") is added to the `orders` table.

1.  **Update Database Schema**:
    -   Add `payment_status` column (e.g., `text` or an `enum`) to the `orders` table in Supabase. Default to "pending".
2.  **Update Frontend Types (`web/app/[locale]/dashboard/orders/page.tsx`):**
    -   Add `payment_status?: "pending" | "paid" | "failed";` to the `Order` interface.
3.  **Update Frontend UI (`web/app/[locale]/dashboard/orders/orders-client-content.tsx`):**
    -   **Filter Control**: Add a new `Select` component for `payment_status` similar to the existing `filterStatus` for order status.
        ```tsx
        const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all");
        // ...
        <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filter_by_payment_status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_payment_statuses")}</SelectItem>
            <SelectItem value="pending">{t("payment_pending")}</SelectItem>
            <SelectItem value="paid">{t("payment_paid")}</SelectItem>
            <SelectItem value="failed">{t("payment_failed")}</SelectItem>
          </SelectContent>
        </Select>
        ```
    -   **Filtering Logic**: Modify `filteredOrders` (and potentially `getAllOrderItems` if relevant) to include filtering by `payment_status`.
        ```javascript
        const matchesPaymentStatus = filterPaymentStatus === "all" || order.payment_status === filterPaymentStatus;
        // ... include matchesPaymentStatus in the return condition
        ```
    -   **Display**: If needed, display the payment status on the order card, perhaps using a `Badge`.
    -   **Localization**: Add new translation keys for payment status filter and display values.
4.  **Update Backend API (`web/app/api/v1/orders/list/route.ts`):**
    -   **Query Parameter**: Accept a new query parameter like `paymentStatus`.
        ```javascript
        const paymentStatus = req.nextUrl.searchParams.get("paymentStatus");
        ```
    -   **Database Query**: Modify the Supabase query to filter by `payment_status` if the parameter is provided.
        ```javascript
        if (paymentStatus && paymentStatus !== "all") {
          query.eq("payment_status", paymentStatus);
        }
        ```
    -   **Return Data**: Ensure `payment_status` is included in the `select` statement if it's not already (e.g., if not using `*`).
5.  **Update Client-Side Fetching (`web/app/[locale]/dashboard/orders/orders-client-content.tsx`):**
    -   Modify the `fetchOrders` function to include the `filterPaymentStatus` in the API request URL.
        ```javascript
        const res = await fetch(`/api/v1/orders/list?today=${filterToday}&paymentStatus=${filterPaymentStatus}`);
        ```
    -   Add `filterPaymentStatus` to the dependency array of the `useEffect` hook that calls `fetchOrders`.

This outlines the general steps. Specific implementation details would vary based on the exact UI/UX requirements for the new filter.
