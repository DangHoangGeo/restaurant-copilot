# Review and Plan: Toppings and Sizes - User Flow

This document outlines the review of the current system and the plan for implementing topping and size selection for menu items in the user (customer) flow.

## 1. UI/UX Review

### Current State:
*   **Topping/Size Selection:** Currently, the user interface does not provide any mechanism for selecting toppings or different sizes for menu items. Components like `FoodCard.tsx` and `CustomerMenuItemDetailScreen.tsx` display menu items with a single price and no customization options for toppings or sizes.
*   **Clarity and Intuitiveness:** While the existing UI for browsing and adding items to the cart is generally clear, the absence of customization options like toppings and sizes is a significant functional gap.
*   **Price Display:** Prices are displayed statically per menu item. There is no system to dynamically update prices based on user selections.

### Areas for Improvement:
*   Provide clear and intuitive controls for selecting available sizes for a menu item.
*   Allow users to select one or more available toppings for a menu item.
*   Dynamically update the total price of a menu item based on the selected size and toppings.
*   Ensure the cart accurately reflects these selections and their price implications.

## 2. Modification Plan

### A. UI Changes

*   **`CustomerMenuItemDetailScreen.tsx` (Main interaction point):**
    *   **Size Selection:**
        *   If sizes are available for an item, display a list of size options (e.g., "Small", "Medium", "Large") using radio buttons or a segmented control.
        *   Each size option should clearly display its name and the corresponding price for that size (e.g., "Small - $9.00", "Medium - $11.00").
        *   A default size might be pre-selected, or the user must choose one.
    *   **Topping Selection:**
        *   If toppings are available for an item, display a list of topping options.
        *   Each topping should show its name and additional price (e.g., "Extra Cheese +$1.50", "Avocado +$2.00").
        *   Use checkboxes to allow users to select multiple toppings.
    *   **Dynamic Price Display:**
        *   A prominent display of the item's total price that updates in real-time as the user selects/deselects sizes and toppings.
*   **`FoodCard.tsx` (Summary/Discovery view):**
    *   To keep the card view clean, it may not show full selection controls.
    *   If an item has multiple sizes, the price could be displayed as a range (e.g., "From $9.00") or indicate the price of the default/smallest size.
    *   An icon or small text (e.g., "+Toppings available", "+Sizes") could indicate that customization options are available, prompting the user to click for details (navigating to `CustomerMenuItemDetailScreen.tsx`).
*   **Cart Components (`FloatingCart.tsx`, `OrderSummary.tsx`, etc.):**
    *   Cart items must clearly display the selected size (e.g., "Pizza (Large)") and selected toppings (e.g., "Toppings: Extra Cheese, Mushrooms").
    *   The price for each cart item should reflect these customizations.

### B. Frontend Validation and Logic

*   **`CustomerMenuItemDetailScreen.tsx`:**
    *   **State Management:**
        *   Manage state for `selectedSize` (ID or object).
        *   Manage state for `selectedToppings` (array of IDs or objects).
    *   **Price Calculation Logic:**
        *   Implement a robust function to calculate the total item price: `basePrice (from selectedSize or item default) + sum(selectedToppingPrices)`.
        *   This calculation must run whenever selections change.
    *   **Availability Logic:**
        *   Ensure that unavailable toppings or sizes are not selectable or are clearly marked.
*   **`CartContext.tsx` (and related logic):**
    *   **Cart Item Structure:** Modify the cart item data structure to store `selectedSizeId` (or full size object) and `selectedToppings` (array of IDs or full topping objects), along with the final calculated price for that configuration.
    *   **Adding to Cart:** Ensure that when an item is added to the cart, its current size and topping selections are captured.
    *   **Uniqueness in Cart:** Items with different size/topping combinations should ideally be treated as distinct entries in the cart.

### C. Backend API Adjustments (User-Facing)

*   **Fetching Menu Items with Options:**
    *   The primary API endpoint used by clients to fetch menu data (likely through `fetchMenuAndTables` in `customer-data.ts`) must be enhanced.
    *   The response for each menu item should include:
        *   An array of available `menu_item_sizes` (with their `id`, `size_key`, multilingual names, `price`, `position`).
        *   An array of available `toppings` (with their `id`, multilingual names, `price`, `position`).
*   **Order Submission:**
    *   The API endpoint for creating an order (`/api/v1/orders/create` or similar) and adding items to an order must be updated.
    *   For each `order_item`, it needs to accept:
        *   `menu_item_size_id` (if a size was selected).
        *   An array of `topping_ids` (if toppings were selected). The schema `order_items.topping_id` might need to be changed to `topping_ids TEXT[]` or a join table `order_item_toppings` will be used as per the backend plan.
    *   The backend will be responsible for storing these selections and ensuring the price charged matches the selections.

## 3. Security Implications (RLS)

*   **Data Fetching:** Row Level Security (RLS) is already in place for `menu_items`, `toppings`, and `menu_item_sizes` tables, ensuring users only see data for the `restaurant_id` they are currently viewing. This will continue to function as expected when fetching items with their toppings/sizes.
*   **Order Submission:** When submitting an order with selected `menu_item_size_id` and `topping_ids`, the backend must validate that these IDs belong to the same `restaurant_id` as the menu item and the order itself. This prevents any attempts to mismatch data across restaurants. This validation should occur within the API logic before saving to the database.

This plan aims to provide a comprehensive and intuitive way for users to customize their orders with various toppings and sizes, enhancing their overall experience.
