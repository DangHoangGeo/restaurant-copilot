# Review and Plan: Toppings and Sizes - Owner Flow

This document outlines the review of the current system and the plan for implementing management of toppings and sizes for menu items in the owner (dashboard) flow.

## 1. UI/UX Review

### Current State:
*   **Topping/Size Management:** The current menu item management interface (`web/components/features/admin/menu/MenuItemForm.tsx`) does not provide any functionality for restaurant owners to define or manage toppings or different sizes for their menu items. Owners can only set a single price and basic details for each menu item.
*   **Clarity and Intuitiveness:** While the existing form for menu items is straightforward for basic item details, it lacks the capability to handle more complex product structures involving variations like size and add-ons like toppings.
*   **Efficiency:** Owners cannot efficiently create and manage these variations, potentially leading to workarounds like creating multiple separate menu items for different sizes, which is inefficient and clutters the menu.

### Areas for Improvement:
*   Provide a clear and intuitive interface within the `MenuItemForm.tsx` for adding, editing, and deleting toppings associated with a menu item.
*   Similarly, provide an interface for managing different sizes (e.g., Small, Medium, Large) for a menu item, including their specific prices.
*   Ensure the UI allows for setting multilingual names and prices for these toppings and sizes.
*   The system should be robust enough to handle items with no specific toppings/sizes, one or more toppings, and/or one or more sizes.

## 2. Modification Plan

### A. UI Changes (`web/components/features/admin/menu/MenuItemForm.tsx`)

*   **Toppings Management Section:**
    *   A new collapsible section titled "Toppings" will be added to the menu item form.
    *   Inside this section, an "Add Topping" button will allow owners to dynamically add topping entries.
    *   Each topping entry will have the following fields:
        *   `Name (EN)`: Text input (Required if no other language name is provided).
        *   `Name (JA)`: Text input.
        *   `Name (VI)`: Text input.
        *   `Price`: Number input (e.g., how much this topping adds to the base price). Required, non-negative.
        *   `Position`: Number input (for controlling display order, defaults to 0).
        *   A "Remove" button next to each topping entry.
*   **Sizes Management Section:**
    *   A new collapsible section titled "Sizes" will be added.
    *   An "Add Size" button will allow owners to dynamically add size entries.
    *   Each size entry will have the following fields:
        *   `Size Key`: Text input (e.g., "small", "medium", "large"). This is a system identifier, not necessarily for display. Required, simple string.
        *   `Display Name (EN)`: Text input (e.g., "Small", "Regular"). Required if no other language name is provided.
        *   `Display Name (JA)`: Text input.
        *   `Display Name (VI)`: Text input.
        *   `Price`: Number input (this will be the *total price* for this specific size of the item). Required, non-negative.
        *   `Position`: Number input (for controlling display order, defaults to 0).
        *   A "Remove" button next to each size entry.
*   **Interaction Notes:**
    *   If no sizes are defined, the main `Price` field on the `MenuItemForm` will be considered the default price for the item. If sizes *are* defined, the main price field might be disabled or hidden, as prices will be per-size. (This needs careful consideration during implementation - the schema `menu_item_sizes.price` suggests price-per-size is the way to go).
    *   The form should allow saving a menu item even if no toppings or no sizes are added.

### B. Frontend Validation and Logic

*   **Topping Fields Validation:**
    *   At least one language for the topping name must be provided. Max length constraints (e.g., 100 chars).
    *   `Price` must be a non-negative number and is required for each topping.
    *   `Position` must be a non-negative integer.
*   **Size Fields Validation:**
    *   `Size Key` is required, should be a simple string (e.g., alphanumeric, no spaces, max 20 chars).
    *   At least one language for the size display name must be provided. Max length constraints (e.g., 50 chars).
    *   `Price` must be a non-negative number and is required for each size.
    *   `Position` must be a non-negative integer.
*   **Form State Management:**
    *   The form's state (e.g., using `react-hook-form` or similar) needs to manage arrays of topping objects and size objects.
*   **API Interaction:**
    *   On form submission, after the main menu item is successfully created/updated (to obtain its ID):
        *   Iterate through the toppings data:
            *   If a topping has an ID, it's an existing topping to be updated (PUT request).
            *   If a topping has no ID, it's a new topping to be created (POST request).
            *   Toppings marked for removal will trigger a DELETE request.
        *   Similar logic for sizes: iterate and send POST, PUT, or DELETE requests as appropriate.
    *   Consider batching these requests or designing API endpoints that can handle multiple creates/updates/deletes for toppings/sizes in a single transaction for a given menu item, if feasible, to improve atomicity and reduce network chattiness.

### C. Backend API Adjustments (Admin-Facing)

*   **New Endpoints for Toppings (per menu item):**
    *   `POST /api/v1/menu-items/<itemId>/toppings`: Create a new topping.
    *   `PUT /api/v1/menu-items/<itemId>/toppings/<toppingId>`: Update a topping.
    *   `DELETE /api/v1/menu-items/<itemId>/toppings/<toppingId>`: Delete a topping.
    *   These endpoints will expect data like multilingual names, price, and position.
*   **New Endpoints for Sizes (per menu item):**
    *   `POST /api/v1/menu-items/<itemId>/sizes`: Create a new size.
    *   `PUT /api/v1/menu-items/<itemId>/sizes/<sizeId>`: Update a size.
    *   `DELETE /api/v1/menu-items/<itemId>/sizes/<sizeId>`: Delete a size.
    *   These endpoints will expect data like size key, multilingual names, price, and position.
*   **Existing Menu Item API:**
    *   The `GET` endpoint for a single menu item (if one exists for admin editing) should be updated to also return its associated toppings and sizes.
    *   The main `POST` (create) and `PUT` (update) for menu items might not directly handle toppings/sizes if they are managed by separate dedicated endpoints. The frontend will coordinate these calls.
*   **Security:** All these endpoints must be protected and ensure the authenticated user has ownership or management rights for the `restaurant_id` associated with the `menu_item_id`. This will be enforced by RLS policies on the database and checks in the API logic.

## 3. Database Query Efficiency & RLS

*   **RLS:** The `toppings` and `menu_item_sizes` tables already have RLS policies based on `restaurant_id`, which is appropriate for ensuring owners can only manage data for their own restaurant. These policies should be effective for the new API endpoints.
*   **Indexes:**
    *   The `toppings` table has indexes on `(restaurant_id, position)` and `(menu_item_id)`.
    *   The `menu_item_sizes` table has indexes on `(menu_item_id, size_key)` and `(restaurant_id, menu_item_id)`.
    *   These indexes are well-suited for the planned CRUD operations, as queries will typically filter by `menu_item_id` (for managing specific item's toppings/sizes) and `restaurant_id` (via RLS).
*   **Query Optimization / Stored Procedures:**
    *   **Fetching Data for Form:** When an owner edits a menu item, the system needs to fetch the item itself and its associated list of toppings and sizes. The recommendation is to enhance the Supabase query used to fetch the menu item for editing to also embed its related toppings and sizes in a single call. This is generally more efficient than multiple separate calls.
        ```javascript
        // Example structure for fetching for admin form:
        // supabaseAdmin
        //   .from('menu_items')
        //   .select(`
        //     *,
        //     toppings (*),
        //     menu_item_sizes (*)
        //   `)
        //   .eq('id', itemId)
        //   .eq('restaurant_id', userRestaurantId) // RLS handles this, but explicit can be good
        //   .single();
        ```
    *   **Batch Operations:** If performance becomes an issue with many individual POST/PUT/DELETE requests for toppings/sizes when a menu item is saved, consider creating database functions (stored procedures) that can accept an array of topping/size objects and perform batch upserts/deletes. This can reduce network overhead and ensure atomicity for changes to an item's toppings and sizes. However, for typical numbers of toppings/sizes per item, individual API calls coordinated by the frontend are often acceptable initially.
    *   **No immediate complex pure SQL queries are flagged for conversion** beyond the standard CRUD operations, which Supabase handles well. The main optimization is efficient fetching and potentially batching modifications if needed.

