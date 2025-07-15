# Phase 1 Testing: Manual Order Taking (POS Flow)

This document outlines the test plan for verifying the functionality of the new Point of Sale (POS) / Manual Order Taking feature in the SOder iOS application. All tests should be performed with live data connections to Supabase.

## I. Prerequisites

1.  **Clean Build:** Ensure the application compiles successfully.
2.  **Supabase Connection:** Valid Supabase URL and anon key must be configured. The backend database should be populated with:
    *   At least one restaurant.
    *   Several tables for that restaurant with varying statuses (e.g., 'available', 'occupied').
    *   Several menu categories.
    *   Several menu items within each category, including:
        *   Items with no sizes or toppings.
        *   Items with multiple sizes (e.g., Small, Medium, Large) with different price modifiers.
        *   Items with multiple toppings (e.g., Extra Cheese, Avocado) with different additional prices.
3.  **User Account:** A staff user account associated with the test restaurant.
4.  **Printer Setup (Optional but Recommended):** At least one printer configured (or ensure app handles no printer gracefully if printing is triggered).

## II. Test Areas & Cases

### A. Table Selection (`SelectTableView.swift`)

| Test Case ID | Description                                                                 | Expected Result                                                                                                | Actual Result | Status (Pass/Fail) | Notes                                       |
| :----------- | :-------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :------------ | :----------------- | :------------------------------------------ |
| POS-TS-001   | Launch app and navigate to the "New Order" tab.                             | `SelectTableView` loads and displays a list/grid of tables.                                                  |               |                    |                                             |
| POS-TS-002   | Verify tables are fetched from Supabase and match backend data.               | Table names, statuses, and capacities displayed should be accurate.                                            |               |                    | Requires backend data verification.         |
| POS-TS-003   | Verify UI for different table statuses.                                     | 'Available' tables are clearly selectable. 'Occupied'/'Reserved' tables are visually distinct and non-selectable for new orders. |               |                    |                                             |
| POS-TS-004   | Test loading state.                                                         | A `ProgressView` is shown while tables are being fetched.                                                      |               |                    | May need to simulate network latency.       |
| POS-TS-005   | Test empty state.                                                           | If no tables are configured for the restaurant, an appropriate "No tables found" message is shown.             |               |                    | Requires specific backend data setup.     |
| POS-TS-006   | Test error state (e.g., disconnect network before fetching).                | A user-friendly error message is displayed. Tables list is empty or shows the last known state with an error.  |               |                    |                                             |
| POS-TS-007   | Tap an 'Available' table.                                                   | Navigates to `MenuCategoryView`, passing the selected `Table` object and a new draft `orderId`.                |               |                    | Verify `orderId` is new/unique for draft. |
| POS-TS-008   | Tap an 'Occupied' or 'Reserved' table.                                      | No navigation for starting a *new* order occurs. (Further functionality for viewing existing order is out of scope for this test). |               |                    |                                             |
| POS-TS-009   | Test "Refresh" button.                                                      | Table list updates to reflect any backend changes.                                                             |               |                    |                                             |
| POS-TS-010   | Test UI on both iPhone and iPad.                                            | Layout adapts correctly. Table cells are readable and interactive on both form factors.                          |               |                    |                                             |

### B. Menu Category Selection (`MenuCategoryView.swift`)

| Test Case ID | Description                                                                 | Expected Result                                                                                                   | Actual Result | Status (Pass/Fail) | Notes                                           |
| :----------- | :-------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- | :------------ | :----------------- | :---------------------------------------------- |
| POS-MC-001   | After selecting a table, `MenuCategoryView` loads.                          | View displays the selected table name in the title. A list of menu categories is shown.                           |               |                    |                                                 |
| POS-MC-002   | Verify categories are fetched from Supabase.                                | Categories displayed match backend data for the restaurant, ordered by position.                                |               |                    | Requires backend data verification.             |
| POS-MC-003   | Test loading state.                                                         | A `ProgressView` is shown while categories are fetched.                                                           |               |                    |                                                 |
| POS-MC-004   | Test empty state.                                                           | If no categories exist, "No menu categories found" is shown.                                                      |               |                    | Requires specific backend data setup.         |
| POS-MC-005   | Test error state (e.g., simulate network error).                            | A user-friendly error message is displayed.                                                                       |               |                    |                                                 |
| POS-MC-006   | Tap a category.                                                             | Navigates to `MenuItemView`, passing the selected `Category`, `orderId`, and `table`.                               |               |                    |                                                 |
| POS-MC-007   | Verify "Draft Order Indicator" (cart icon in toolbar).                      | Initially shows "0" items. Updates correctly as items are added in subsequent steps.                              |               |                    |                                                 |
| POS-MC-008   | Tap "Draft Order Indicator".                                                | Navigates to `DraftOrderView` (or shows placeholder if not fully wired yet).                                       |               |                    |                                                 |
| POS-MC-009   | Test UI on both iPhone and iPad.                                            | Layout is clear and usable on both form factors.                                                                  |               |                    |                                                 |

### C. Menu Item Selection (`MenuItemView.swift`)

| Test Case ID | Description                                                                  | Expected Result                                                                                                  | Actual Result | Status (Pass/Fail) | Notes                                         |
| :----------- | :--------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :------------ | :----------------- | :-------------------------------------------- |
| POS-MI-001   | After selecting a category, `MenuItemView` loads.                            | View displays the selected category name in the title. A list of menu items for that category is shown.        |               |                    |                                               |
| POS-MI-002   | Verify menu items are fetched from Supabase for the selected category.       | Items displayed match backend data, ordered by position. Name, price, description are accurate.                  |               |                    | Requires backend data verification.           |
| POS-MI-003   | Test loading state.                                                          | A `ProgressView` is shown while items are fetched.                                                               |               |                    |                                               |
| POS-MI-004   | Test empty state for a category with no items.                               | "No items in this category" message is shown.                                                                  |               |                    | Requires specific backend data setup.       |
| POS-MI-005   | Test error state.                                                            | A user-friendly error message is displayed.                                                                      |               |                    |                                               |
| POS-MI-006   | Tap "Add" (or "Customize") button for an item.                                 | Navigates to `AddItemDetailView`, passing the selected `MenuItem`, `orderId`, and `table`.                       |               |                    |                                               |
| POS-MI-007   | Verify "Draft Order Indicator" updates/behavior.                             | Remains visible and functional as in `MenuCategoryView`.                                                         |               |                    |                                               |
| POS-MI-008   | Test UI on both iPhone and iPad.                                             | Item rows are clear. "Add" button is easily tappable.                                                          |               |                    |                                               |

### D. Add/Customize Item (`AddItemDetailView.swift`)

| Test Case ID | Description                                                                    | Expected Result                                                                                                                                  | Actual Result | Status (Pass/Fail) | Notes                                                              |
| :----------- | :----------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :------------ | :----------------- | :----------------------------------------------------------------- |
| POS-AI-001   | After selecting an item, `AddItemDetailView` loads.                              | View displays item name, description. Quantity defaults to 1. Size/topping pickers appear if item has options. Correct base price shown.        |               |                    |                                                                    |
| POS-AI-002   | Verify item details (sizes, toppings, prices) are from live data.              | `menuItem.availableSizes` and `menuItem.availableToppings` are used. Price modifiers for sizes/toppings are accurate.                            |               |                    | Requires `fetchMenuItemDetails` to be fully functional.            |
| POS-AI-003   | Adjust quantity using stepper.                                                 | Quantity changes. `currentLineItemTotalPrice` updates correctly.                                                                                 |               |                    |                                                                    |
| POS-AI-004   | Select a size (for item with sizes).                                           | `selectedSize` updates. `currentLineItemTotalPrice` updates based on size's price modifier.                                                      |               |                    |                                                                    |
| POS-AI-005   | Select one or more toppings (for item with toppings).                          | `selectedToppings` updates. `currentLineItemTotalPrice` updates based on sum of selected toppings' prices.                                       |               |                    |                                                                    |
| POS-AI-006   | Enter notes in the notes field.                                                | `notes` state variable updates.                                                                                                                  |               |                    |                                                                    |
| POS-AI-007   | Tap "Add to Order" button.                                                     | `OrderManager.addItemToDraftOrder` is called with correct parameters (item ID, quantity, notes, size ID, topping IDs, calculated `priceAtOrder`). View dismisses. |               |                    | Verify `priceAtOrder` calculation.                                 |
| POS-AI-008   | Test "Add to Order" with an item having no sizes/toppings.                       | Process completes successfully. `priceAtOrder` is `menuItem.price * quantity`.                                                                     |               |                    |                                                                    |
| POS-AI-009   | Test error handling if `addItemToDraftOrder` fails (e.g., network error).      | An error alert is shown. View does not dismiss.                                                                                                |               |                    |                                                                    |
| POS-AI-010   | Tap "Cancel" button.                                                           | View dismisses without adding item to order.                                                                                                   |               |                    |                                                                    |
| POS-AI-011   | Verify "Draft Order Indicator" in parent views updates after adding an item.     | After `AddItemDetailView` dismisses, the cart icon badge in `MenuItemView` or `MenuCategoryView` should reflect the new total item count.         |               |                    | Requires `OrderManager.getDraftOrder` to be efficient.             |

### E. Draft Order Management (`DraftOrderView.swift`)

| Test Case ID | Description                                                                     | Expected Result                                                                                                                                   | Actual Result | Status (Pass/Fail) | Notes                                                           |
| :----------- | :------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------ | :------------ | :----------------- | :-------------------------------------------------------------- |
| POS-DO-001   | Navigate to `DraftOrderView` (e.g., via toolbar cart icon).                       | View displays items added to the current draft order. Table name in title.                                                                          |               |                    | `OrderManager.getDraftOrder` must return the correct draft order. |
| POS-DO-002   | Verify items list (name, quantity, price, notes, customizations).               | All details for each line item are accurately displayed. Line item price and total order price are correct.                                         |               |                    | Check that customizations (size/toppings) are shown.          |
| POS-DO-003   | Test with an empty draft order.                                                 | "No items added yet" message is shown. "Confirm" button might be disabled.                                                                          |               |                    |                                                                 |
| POS-DO-004   | Remove an item using swipe action.                                                | `OrderManager.removeDraftOrderItem` is called. Item is removed from UI. Total price updates.                                                       |               |                    |                                                                 |
| POS-DO-005   | Test "Back to Menu" / "Add More Items" button.                                    | Navigates back to `MenuCategoryView` (or `MenuItemView`) allowing more items to be added to the *same* draft order.                               |               |                    |                                                                 |
| POS-DO-006   | Tap "Confirm Order to Kitchen" with items in draft.                             | Confirmation alert (optional). `OrderManager.confirmOrderToKitchen` is called. Order status changes (e.g., to "new"). View dismisses. Success message shown. |               |                    | Verify order appears in `OrdersView` / `KitchenBoardView`.      |
| POS-DO-007   | Test "Confirm Order to Kitchen" with an empty draft.                            | Button should ideally be disabled or show a message. If enabled, should handle gracefully (e.g., error or no action).                               |               |                    |                                                                 |
| POS-DO-008   | Tap "Cancel Entire Order".                                                        | Confirmation alert appears. If "Yes" is tapped, `OrderManager.clearDraftOrder` is called. View dismisses. Draft order is deleted from backend.       |               |                    |                                                                 |
| POS-DO-009   | Test error handling for "Confirm" and "Cancel" actions (e.g., network error).   | Appropriate error alert is shown. State remains consistent.                                                                                         |               |                    |                                                                 |
| POS-DO-010   | Test UI on both iPhone and iPad.                                                | Clear layout, readable item details, easy interaction with buttons/swipe actions.                                                                 |               |                    |                                                                 |

### F. General & Edge Cases

| Test Case ID | Description                                                                  | Expected Result                                                                                           | Actual Result | Status (Pass/Fail) | Notes                                          |
| :----------- | :--------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :------------ | :----------------- | :--------------------------------------------- |
| POS-GEN-001  | Start a new order, add items, then background and foreground the app.        | Draft order state is preserved. User can continue where they left off.                                      |               |                    | Depends on `currentDraftOrder` in `OrderManager`. |
| POS-GEN-002  | Start a new order, but switch to another tab (e.g., "Orders") and then back. | Draft order state is preserved.                                                                           |               |                    |                                                |
| POS-GEN-003  | Rapidly add multiple items.                                                  | App remains responsive. All items are added correctly.                                                    |               |                    | Stress test.                                   |
| POS-GEN-004  | Test with menu items having very long names, descriptions, or many options.  | UI handles text overflow gracefully (truncation, wrapping). Layout remains usable.                        |               |                    |                                                |
| POS-GEN-005  | Test error handling if `SupabaseManager.currentRestaurantId` is nil.         | All POS views that rely on this should show an appropriate error or prevent actions.                      |               |                    |                                                |

## III. Test Environment Checklist

*   [ ] iOS Device/Simulator (specify versions): ______________
*   [ ] iPad Device/Simulator (specify versions): ______________
*   [ ] SOder App Version/Build: ______________
*   [ ] Supabase Project connected: ______________
*   [ ] Network conditions (WiFi, Cellular, simulated poor network): ______________

## IV. Notes & Observations

(Space for testers to add general notes, observations, or issues not covered by specific test cases.)

```
