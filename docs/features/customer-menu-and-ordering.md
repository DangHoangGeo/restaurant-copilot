# Customer Menu Viewing and Ordering

## Summary

This feature allows restaurant customers to browse the digital menu, customize items with sizes and toppings, add items to a shopping cart, and place an order for their table. The process is typically initiated by scanning a QR code at a table, which establishes a session for that table.

## How it works technically

### Frontend

The customer-facing menu and ordering system is a single-page application (SPA)-like experience managed primarily by `CustomerClientContent`. It dynamically renders different "screens" (components) based on the user's current action (browsing menu, viewing item details, reviewing order, etc.).

-   **Entry & Session Initialization (`web/app/[locale]/menu/page.tsx` - Server Component):**
    -   Handles initial page load. URL can contain `locale`, `code` (from QR scan), or `sessionId`.
    -   Determines `subdomain` from hostname and fetches `restaurantSettings` (ID, name, logo, brand color, default language) using `getRestaurantSettingsFromSubdomain`.
    -   **Session Handling**:
        -   If `sessionId` is present: Fetches the existing order session from the `orders` table.
        -   If `code` (from QR scan) is present: Calls `get_table_session_by_code` RPC to get `table_id` and potentially an `active_session_id`. If an active session exists for the table, it prepares to join it (may require passcode).
    -   Fetches menu data (categories with items) and all tables for the restaurant using `fetchMenuAndTables` (which likely calls `/api/v1/restaurant/data` or similar).
    -   Passes all initial data (`restaurantSettings`, `categories`, `tables`, resolved `tableId`, and `sessionData`) to `CustomerClientContent`.

-   **Main Client Orchestrator (`web/app/[locale]/menu/menu-client-content.tsx`):**
    -   Manages the overall UI flow using a `view` state (e.g., "menu", "menuitemdetail", "checkout").
    -   **Session Dialogs**:
        -   If a `tableId` is resolved (typically from QR code scan) and no active session ID is immediately available (or it's a new session context):
            -   Prompts for guest count (`showGuestDialog`).
            -   Calls `GET /api/v1/sessions/create` with `tableId` and guest count. This API creates a new order record (status: "new") and returns a `sessionId` and a short `passcode`.
            -   The first user creating the session is shown this `passcode` to share with others at the table.
        -   If joining an existing session (e.g., `sessionData.sessionStatus === 'join'`):
            -   Prompts for the `passcode` (`showJoinDialog`).
            -   Calls `GET /api/v1/sessions/join` with the pending session ID and passcode to validate and join.
    -   Stores/retrieves `sessionId`, `tableId`, `tableNumber` from `localStorage` to maintain session across page reloads/visits and attempts to sync/validate this with server data.
    -   Renders different screen components based on the current `view` state.
    -   Wraps screen components with `CartProvider` and `CustomerLayout`.

-   **Key Customer UI Components (`web/components/features/customer/`):**
    -   **`CustomerLayout.tsx`**: Provides the overall page structure (header, footer) and likely includes the `FloatingCart.tsx`.
    -   **`CartProvider.tsx` / `useCart()`**: Manages the shopping cart state (items, quantities, total price). `CartItem` interface supports `selectedSize` and `selectedToppings`.
    -   **`CustomerMenuScreen.tsx`**: Displays the menu, allowing users to browse categories and items. Can switch between `MenuList` and `SmartDiscoveryMenu`.
        -   **`MenuList.tsx`**: Shows items, typically by category. Includes search and filtering capabilities.
        -   **`FoodCard.tsx`**: Displays individual menu items. Shows price (or "From ¥X" if sizes exist). Clicking it navigates to the item detail screen. Handles simple add-to-cart or quantity updates for items without customization.
    -   **`CustomerMenuItemDetailScreen.tsx`**: Shown when a user clicks on a `FoodCard`. Allows selection of available `MenuItemSize` and multiple `Topping` options. Calculates the dynamic price based on these selections. Adds the configured item (with its unique ID based on selections) to the cart.
    -   **`CategoryTabs.tsx`**: Sticky or scrollable tabs for quick navigation between menu categories.
    -   **`FloatingCart.tsx`**: A persistent UI element showing cart item count and total. Can be expanded to show a summary and allow quick quantity adjustments or item removal. Navigates to the "checkout" (review order) screen.
    -   **`ReviewOrderScreen.tsx`**: Displays all items in the cart with their selected sizes/toppings and prices. Allows final quantity adjustments, adding item-specific notes, and overall special instructions for the order. Submits the order to `/api/v1/orders/create`.
    -   **`OrderPlacedScreen.tsx` & `ThankYouScreen.tsx`**: Confirmation screens shown after a successful order submission.

-   **Restaurant Context (`web/hooks/useRestaurantContext.ts`):**
    -   A hook to get `restaurant` (subdomain) and `locale` from URL parameters. Restaurant ID for API calls is often derived server-side from the subdomain or established via the session.

### Backend

Backend logic is handled by Next.js API routes and Supabase PostgreSQL functions.

-   **Fetch Menu & Restaurant Data (`GET /api/v1/restaurant/data`):**
    -   File: `web/app/api/v1/restaurant/data/route.ts`
    -   Input: `subdomain` (query parameter).
    -   Output: Full restaurant details (from `restaurants` table) and its complete menu, structured with categories containing their respective menu items (including sizes and toppings if these are nested in `menu_items` select).
-   **Session Creation (`GET /api/v1/sessions/create`):**
    -   File: `web/app/api/v1/sessions/create/route.ts`
    -   Input: `tableId`, `guests` (query parameters), `subdomain` (for restaurant ID).
    -   Logic: Verifies table belongs to restaurant. Checks for existing active order/session for the table. If none, creates a new `orders` record (status "new", total 0) with a new `sessionId` (UUID).
    -   Output: `sessionId`, `tableNumber`, `isNewSession` (boolean), `orderId`, `guestCount`, and a short `passcode` for new sessions.
-   **Get Session by Code (`GET /api/v1/orders/session-by-code`):**
    -   File: `web/app/api/v1/orders/session-by-code/route.ts`
    -   Input: `code`, `subdomain`.
    -   Logic: Calls RPC `get_table_session_by_code` with `input_code` and `input_restaurant_id`.
    -   Output: `tableId`, `restaurantId`, `activeSessionId` (if any), `requirePasscode`.
-   **Get Session Info (`GET /api/v1/orders/session-info`):**
    -   File: `web/app/api/v1/orders/session-info/route.ts`
    -   Input: `sessionId`, `restaurantId`.
    -   Logic: Calls RPC `get_order_session_info`.
    -   Output: Order session details.
-   **Order Creation (`POST /api/v1/orders/create`):**
    -   File: `web/app/api/v1/orders/create/route.ts`
    -   Input: `sessionId` and an array of `items`. Each item includes `menuItemId`, `quantity`, optional `notes`, `menu_item_size_id`, and `topping_ids` array.
    -   Logic:
        -   Validates `sessionId` and `restaurantId` (derived from subdomain).
        -   Retrieves the existing "new" or "serving" order associated with the `sessionId`.
        -   For each item:
            -   Verifies menu item availability (including weekday visibility) and restaurant ownership.
            -   Calculates price: starts with base `menu_items.price`, overrides with `menu_item_sizes.price` if `menu_item_size_id` is provided, then adds sum of `toppings.price` for all `topping_ids`.
            -   Stores this calculated `price_at_order` for the order item.
        -   Updates the main order's `total_amount` and sets status to "serving".
        -   Inserts items into `order_items` table, linking them to the order and storing selected size/toppings and calculated price.
    -   Output: `{ success: true, orderId: string }`.

### Data Structures & Types

-   **`MenuItem` (`web/shared/types/customer.ts`):** Defines structure for menu items, including multilingual names/descriptions, price, image URL, availability, weekday visibility, and crucially, optional `menu_item_sizes` (array of `MenuItemSize`) and `toppings` (array of `Topping`).
-   **`MenuItemSize` (`web/shared/types/customer.ts`):** Contains `id`, multilingual names, and its specific `price`.
-   **`Topping` (`web/shared/types/customer.ts`):** Contains `id`, multilingual names, and its additional `price`.
-   **`Category` (`web/shared/types/customer.ts`):** Defines menu categories with multilingual names and an array of `MenuItem`.
-   **`CartItem` (`web/components/features/customer/CartContext.tsx`):** Represents an item in the cart. Includes `uniqueId` (derived from item ID, selected size ID, and sorted topping IDs), `itemId`, multilingual names, final calculated `price`, `qty`, `selectedSize` (object), and `selectedToppings` (array of objects).
-   **Order Payload (to `/api/v1/orders/create`):** An array of items, each specifying `menuItemId`, `quantity`, `notes`, `menu_item_size_id`, and `topping_ids`.

### Database Tables (Deduced)

-   `restaurants`: Stores restaurant details, including `id`, `subdomain`, `name`, `default_language`, `brand_color`.
-   `categories`: Menu categories, linked to `restaurant_id`.
-   `menu_items`: Menu items, linked to `category_id` and `restaurant_id`. Stores base `price`, `available`, `weekday_visibility`.
-   `menu_item_sizes`: Stores available sizes for menu items, including their specific `price`. Linked to `menu_item_id`.
-   `toppings`: Stores available toppings for menu items, including their additional `price`. Linked to `menu_item_id`.
-   `tables`: Restaurant tables, including `id`, `name`, `qr_code` (stores the unique code, not full URL).
-   `orders`: Stores customer orders. Includes `id`, `restaurant_id`, `table_id`, `session_id` (UUID for the customer's session), `status` ("new", "serving", "completed", etc.), `total_amount`, `guest_count`.
-   `order_items`: Stores individual items within an order. Includes `id`, `order_id`, `menu_item_id`, `quantity`, `notes`, `price_at_order` (the calculated price for this specific configuration), `menu_item_size_id` (FK), and `topping_ids` (likely stored as JSONB array of UUIDs).

## Dependencies

-   `next-intl`: For internationalization.
-   Supabase client libraries: For database interactions and RPC calls.
-   `lucide-react`: For icons.
-   `shadcn/ui` components: For UI elements.
-   `framer-motion`: For animations (e.g., in `FloatingCart.tsx`).
-   `html-to-image` (seen in table management for QR codes, might be reused or a similar QR library for display).
-   State management for cart (`CartContext`).

## File and Folder Paths

**Core Customer Menu Pages & Logic:**
-   `web/app/[locale]/menu/page.tsx`
-   `web/app/[locale]/menu/menu-client-content.tsx`

**Customer UI Components (`web/components/features/customer/`):**
-   `CartContext.tsx`
-   `CategoryTabs.tsx`
-   `CustomerLayout.tsx`
-   `FloatingCart.tsx`
-   `FoodCard.tsx`
-   `MenuList.tsx`
-   `OrderSummary.tsx`
-   `screens/CustomerMenuScreen.tsx`
-   `screens/CustomerMenuItemDetailScreen.tsx`
-   `screens/ReviewOrderScreen.tsx`
-   `screens/OrderPlacedScreen.tsx`
-   `screens/ThankYouScreen.tsx`

**Relevant API Routes (`web/app/api/v1/`):**
-   `restaurant/data/route.ts`
-   `orders/create/route.ts`
-   `sessions/create/route.ts`
-   `orders/session-by-code/route.ts`
-   `orders/session-info/route.ts`

**Shared Types (`web/shared/types/`):**
-   `customer.ts` (defines `MenuItem`, `Category`, `TableInfo`, `MenuItemSize`, `Topping`, `RestaurantSettings`)
-   `menu-item.types.ts`
-   `menu-item-category.types.ts`

**Hooks (`web/hooks/`):**
-   `useRestaurantContext.ts`

## How to use or modify

### How a customer navigates the menu and places an order

1.  **Entry**: Typically scans a QR code at a table. The URL derived from the QR code includes a `code` parameter and `locale`.
2.  **Session Initialization**:
    -   The backend (`/api/v1/orders/session-by-code`) resolves the `code` to a `tableId` and checks for an active session.
    -   If no active session, or if it's the first user for a new session, `CustomerClientContent` calls `/api/v1/sessions/create`. This might prompt for guest count. A new order (status "new") and session are created. The first user gets a short `passcode` to share.
    -   If an active session exists, other users might be prompted for the `passcode` to join (handled by `CustomerClientContent` and `/api/v1/sessions/join`).
    -   The `sessionId` is stored in `localStorage` to maintain the session.
3.  **Menu Browsing (`CustomerMenuScreen.tsx`):**
    -   Displays categories and menu items (`MenuList.tsx`, `FoodCard.tsx`).
    -   Users can tap on categories (`CategoryTabs.tsx`) or search.
4.  **View Item Details & Customize (`CustomerMenuItemDetailScreen.tsx`):**
    -   Tapping a `FoodCard` navigates here.
    -   Customers can select available sizes (e.g., Small, Medium, Large) and toppings. The price updates dynamically.
    -   Add to cart with chosen customizations.
5.  **Cart Management (`FloatingCart.tsx`, `CartContext.tsx`):**
    -   A floating cart icon shows the number of items and total price.
    -   Expanding the cart shows item details, allows quantity changes, or removal.
6.  **Review Order (`ReviewOrderScreen.tsx`):**
    -   Accessed from the cart.
    -   Lists all items with their customizations, quantities, and prices.
    -   Allows adding overall "Special Instructions" for the order and item-specific notes.
    -   Customer confirms the order.
7.  **Place Order**:
    -   Clicking "Place Order" calls `POST /api/v1/orders/create`.
    -   The payload includes the `sessionId` and all cart items with their `menuItemId`, `quantity`, `notes`, selected `menu_item_size_id`, and `topping_ids`.
8.  **Order Confirmation (`OrderPlacedScreen.tsx`, `ThankYouScreen.tsx`):**
    -   Displays a confirmation message with the order ID.

### How a developer might add "item tags" (e.g., "Spicy", "Vegan") for filtering

Assume `menu_items` table gets a `tags TEXT[]` column.

1.  **Database**: Add `tags TEXT[]` to `menu_items` table. Admin panel (Menu Management) would need updating to manage these tags per item.
2.  **Update Types**:
    -   `web/shared/types/customer.ts` (`MenuItem` interface): Add `tags?: string[];`.
    -   `web/shared/types/menu-item.types.ts` (`MenuItem` interface): Add `tags?: string[];`.
3.  **API - Fetch Menu (`web/app/api/v1/restaurant/data/route.ts`):**
    -   Ensure the `tags` field is included in the `SELECT` query for `menu_items`.
4.  **Frontend - Display Tags (`web/components/features/customer/FoodCard.tsx`):**
    -   In `FoodCard.tsx`, display tags if they exist:
        ```tsx
        {item.tags && item.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
          </div>
        )}
        ```
5.  **Frontend - Filtering Logic (`web/components/features/customer/MenuList.tsx`):**
    -   **State**: Add state for selected tag filters: `const [selectedTags, setSelectedTags] = useState<string[]>([]);`
    -   **UI**: Add UI elements (e.g., a multi-select dropdown or a list of clickable badges for common tags) to allow users to select tag filters.
    -   **Filtering**: Modify `filteredAndSortedItems` memo:
        ```javascript
        if (selectedTags.length > 0) {
          items = items.filter(item =>
            item.tags && selectedTags.every(tag => item.tags.includes(tag))
          );
        }
        ```
    -   Update `hasActiveFilters` and `clearSearch` to include `selectedTags`.
6.  **Localization**: If tags themselves need to be localized, this would require a more complex setup (e.g., a `tag_translations` table or storing tags as objects with multilingual names).

This provides a basic filtering capability. More advanced tag filtering (e.g., "any of these tags") would adjust the `every` to `some` in the filter logic.
