# Mobile Staff Order Management (iOS App)

## Summary

The iOS application (SOder) provides restaurant staff with tools to efficiently manage customer orders. Staff can view active and all orders, see detailed information for each order and its items, update the status of orders and individual items (e.g., from "new" to "serving", or "ordered" to "preparing"), and process customer payments at checkout. The app features real-time updates and integrates with receipt/kitchen printers.

## How it works technically

### Frontend (SwiftUI Views)

The mobile app's UI is built with SwiftUI. Key views involved in order management include:

-   **`MainTabView.swift`**: The root view after login, containing a `TabView`. The "Orders" tab is the first tab and hosts the `OrdersView`.
-   **`OrdersView.swift`**:
    -   The primary screen for staff to view and interact with orders.
    -   **Layouts**: Implements adaptive layouts:
        -   iPad: `NavigationSplitView` with a sidebar listing orders and a detail pane for the selected order.
        -   iPhone: `NavigationStack` for traditional drill-down navigation.
    -   **Data Management**: Uses `OrderManager` (as an `@StateObject`) to fetch and manage order data. Subscribes to real-time updates.
    -   **Filtering**: Allows filtering orders by status (`.active`, `.new`, `.serving`, `.completed`, `.canceled`) and toggling between viewing only currently active orders or all orders.
    -   **Actions**:
        -   Refresh order list.
        -   Auto-printing controls (enable/disable, clear history).
        -   Sign out (via `SupabaseManager`).
    -   **Navigation**: Selecting an order navigates to `OrderDetailView` (iPhone) or updates the detail pane (iPad). Initiates checkout by presenting `CheckoutView` as a sheet.
-   **`OrderDetailView.swift`**:
    -   Displays comprehensive details of a selected order, including table name, guest count, creation time, total amount, and a list of its items.
    -   Order items are displayed using `EnhancedOrderItemView` (details of this specific view were not read but its role is clear).
    -   **Actions**:
        -   Allows staff to update the overall order status (e.g., mark as "serving").
        -   Presents a "Checkout" button which triggers the display of `CheckoutView`.
        -   Allows printing a receipt for completed orders.
        -   Tapping an individual order item opens `OrderItemDetailView` in a sheet.
-   **`OrderItemDetailView.swift`**:
    -   Provides a detailed view of a single item within an order.
    -   Displays item name, quantity, price, and any special notes.
    -   **Status Management**: Allows staff to advance the status of an individual item (e.g., from "ordered" to "preparing", "preparing" to "ready", "ready" to "served").
    -   **Notes**: Allows editing/adding special notes for the item.
    -   **Cancel Item**: Allows canceling an individual item from an order.
    -   **Printing**: Can print a kitchen slip for the specific item.
-   **`CheckoutView.swift`**:
    -   Presented as a sheet when an order is ready for payment.
    -   Displays order summary, table name, guest count, and creation time.
    -   **Payment Method**: Allows selection from "cash", "card", "PayPay".
    -   **Discount**: Staff can apply discounts (percentage or fixed amount, with an optional discount code).
    -   **Price Calculation**: Shows subtotal, discount, tax (hardcoded at 10%), and final total. For cash payments, it calculates change if `receivedAmount` is entered.
    -   **Actions**:
        -   "Complete Checkout": Updates the order status to "completed" via `OrderManager`.
        -   "Print Receipt Only": Prints a receipt without marking the order as completed (if needed).
        -   Can print a receipt after successful checkout.
-   **`ItemDetailView.swift`**:
    -   Note: This view appears to be part of the **Kitchen Board** feature rather than general staff order management. It focuses on the lifecycle of a `GroupedItem` (kitchen term) and its preparation status. While it deals with item statuses, its context is more kitchen-production oriented.

### Backend Interaction (Services)

Interaction with the Supabase backend is managed by service classes:

-   **`OrderManager.swift`**:
    -   Responsible for all order-related data logic.
    -   Fetches active orders (`SELECT * FROM orders WHERE status IN ('new', 'serving')...`) and all orders, including nested table information and order items with their menu item details (joins).
    -   **Real-time Updates**: Subscribes to changes in the `orders` and `order_items` tables using Supabase Realtime. When changes occur, it refreshes the order list.
    -   Provides methods to update order status (`updateOrderStatus`), order item status (`updateOrderItemStatus`), cancel order items (`cancelOrderItem`), and update item notes (`updateOrderItemNotes`). These methods make calls to the Supabase database via `SupabaseManager.client`.
    -   **Auto-Printing**: Manages a feature for automatically printing new orders or items that become "ready" to configured kitchen printers. It tracks printed items and statistics. This uses `PrinterManager`.
-   **`SupabaseManager.swift`**:
    -   A shared singleton that provides the configured Supabase client (`SupabaseClient`).
    -   Handles user authentication (sign-in, sign-out) using Supabase Auth.
    -   **Restaurant Context**: After a staff member signs in, it parses the JWT (`accessToken`) to extract `app_metadata` which contains `restaurant_id` and `role`. This `restaurantIdFromToken` is stored and used as `currentRestaurantId` for all subsequent data operations, ensuring staff only access their assigned restaurant's data.
    -   Loads details of the `currentRestaurant` from the `restaurants` table.

### Data Models (`mobile/SOder/SOder/models/Models.swift`)

Swift structs define the application's data structures, mirroring the database schema.

-   **`Order`**: Represents an order with properties like `id`, `restaurant_id`, `table_id`, `session_id`, `guest_count`, `status` (enum `OrderStatus`), `total_amount`, `created_at`, `updated_at`, and optional linked `table` (type `Table`) and `order_items` (array of `OrderItem`).
-   **`OrderStatus`**: Enum (`new`, `serving`, `completed`, `canceled`) with display names and colors.
-   **`OrderItem`**: Represents an item within an order. Includes `id`, `menu_item_id`, `quantity`, `notes`, `menu_item_size_id`, `topping_ids`, `price_at_order`, `status` (enum `OrderItemStatus`), and optional linked `menu_item` (`MenuItem`), `menu_item_size` (`MenuItemSize`), `toppings` (array of `Topping`).
-   **`OrderItemStatus`**: Enum (`ordered`, `preparing`, `ready`, `served`, `cancelled`) with display names, colors, and `Comparable` conformance for status progression.
-   **`MenuItem`, `Category`, `Table`, `TableStatus`, `MenuItemSize`, `Topping`**: Structs for related entities.
-   **Response Models (e.g., `OrderWithTableResponse`, `OrderItemWithMenuResponse`)**: Structs used for decoding data from Supabase queries that involve joins, mapping directly to the structure returned by Supabase and then converted to the primary models (e.g., `Order`, `OrderItem`).

### Database Interaction

-   Direct queries to Supabase tables (`orders`, `order_items`, `menu_items`, `tables`, `categories`) for fetching data and performing updates.
-   Supabase Realtime for live updates on orders.
-   The application does not appear to call custom RPC functions like `get_active_orders_function` for the staff order management views; instead, it constructs detailed `SELECT` queries.

## Dependencies

-   `Supabase`: For database interactions, authentication, and real-time features.
-   `SwiftUI`: For building the user interface.
-   `PrinterManager`: A custom service for handling printing to receipt and kitchen printers (details of this manager were not read in this subtask but its usage is evident).

## File and Folder Paths

**SwiftUI Views:**
-   `mobile/SOder/SOder/views/orders/OrdersView.swift`
-   `mobile/SOder/SOder/views/orders/OrderDetailView.swift`
-   `mobile/SOder/SOder/views/orders/CheckoutView.swift`
-   `mobile/SOder/SOder/views/OrderItemDetailView.swift`
-   `mobile/SOder/SOder/MainTabView.swift`
-   (Potentially `mobile/SOder/SOder/views/ItemDetailView.swift` - though more kitchen-focused)

**Services:**
-   `mobile/SOder/SOder/services/OrderManager.swift`
-   `mobile/SOder/SOder/services/SupabaseManager.swift`
-   `mobile/SOder/SOder/services/PrinterManager.swift` (inferred)

**Data Models:**
-   `mobile/SOder/SOder/models/Models.swift`

## How to use or modify

### How staff use the app to manage orders

1.  **Login**: Staff log in using their credentials. `SupabaseManager` authenticates and establishes restaurant context.
2.  **View Orders (`OrdersView` via `MainTabView`):**
    -   The default view shows active orders. Staff can filter by status or view all orders.
    -   New orders or updates appear in real-time. New orders might be highlighted.
    -   iPad users see a list and detail view simultaneously; iPhone users tap an order to see details.
3.  **View Order Details (`OrderDetailView`):**
    -   Staff can see all items in an order, customer details (table, guest count), and total amount.
    -   They can update the overall order status (e.g., to "serving").
4.  **Manage Individual Items (`OrderItemDetailView`):**
    -   Accessed by tapping an item in `OrderDetailView`.
    -   Staff can update an item's status (ordered -> preparing -> ready -> served), add/edit notes, or cancel the item.
    -   They can print a kitchen slip for the item.
5.  **Process Checkout (`CheckoutView`):**
    -   Initiated from `OrderDetailView`.
    -   Staff select payment method, apply discounts if any, and enter received amount for cash payments.
    -   Upon completion, the order status is set to "completed", and a receipt can be printed.
6.  **Auto-Printing**: If enabled, new orders or items marked "ready" may be automatically printed to designated kitchen printers.

### How a developer might add a new order filter (e.g., by table number/name)

1.  **Modify `OrdersView.swift`**:
    -   **State**: Add a new state variable for the selected table filter, e.g., `@State private var selectedTableFilter: String? = nil`.
    -   **UI**: Add a new UI element (e.g., a `Picker` or a searchable `TextField`) to `orderSidebar` (iPad) and the filter bar area (iPhone) to allow staff to select or enter a table name/number.
    -   **Filtering Logic**: Update the `filteredOrders` computed property:
        ```swift
        private var filteredOrders: [Order] {
            var tempOrders = showAllOrders ? orderManager.allOrders : orderManager.orders

            // Apply status filter first
            switch selectedFilter {
                // ... existing status filter logic ...
            }

            // Apply table filter
            if let tableFilter = selectedTableFilter, !tableFilter.isEmpty {
                tempOrders = tempOrders.filter { $0.table?.name.localizedCaseInsensitiveContains(tableFilter) == true }
            }
            return tempOrders
        }
        ```
2.  **Update `OrderManager.swift` (Optional):**
    -   If filtering needs to be done server-side for performance with very large order volumes (unlikely for active orders), you would modify `fetchActiveOrders` and `fetchAllOrders` to accept a table filter parameter and adjust the Supabase query. For client-side filtering as shown above, no `OrderManager` changes are needed.
3.  **Localization**: Add any new UI string keys to localization files.

This approach keeps the filtering client-side for responsiveness, which is generally suitable for the number of orders a staff member would typically manage directly on the device.
