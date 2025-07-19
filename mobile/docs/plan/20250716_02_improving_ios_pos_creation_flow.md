
### **Task 2: Streamline POS Order Creation Flow**

*   **Scope:**
    This task focuses on the user experience of creating a new order. It involves refactoring the views used in the POS flow, specifically `MenuSelectionView.swift`, to reduce navigation and keep the user in context.

*   **Problem:**
    The current flow for adding items to an order is inefficient. The user must navigate to `AddItemDetailView` for every item, then navigate to a separate `DraftOrderView` to see the cart. This back-and-forth movement is slow and makes it difficult to track the order's progress while adding items.

*   **Solution:**
    Redesign the menu screen to be a single, unified interface where the user can browse the menu and see the draft order simultaneously. On iPad, this will be a two-column layout (Menu | Draft Order). On iPhone, it will be a main menu view with a draggable, persistent "cart" panel at the bottom.

*   **Implement guide:**
    1.  **Modify `MenuSelectionView.swift`:**
        *   Open `mobile/SOder/SOder/views/pos/MenuSelectionView.swift`.
        *   Change the root view to be a `GeometryReader` containing an `HStack` (for iPad) or a `ZStack` (for iPhone), conditionally based on the horizontal size class.

    2.  **Implement the iPad Layout (`.regular` size class):**
        *   The `HStack` should contain two child views.
        *   **Left View:** The existing `List` of menu items, taking up about 60% of the width.
        *   **Right View:** An embedded instance of `DraftOrderView`, taking up the remaining 40%. Pass the `orderId` and `table` to it. `DraftOrderView` will need to be adapted to work as a component rather than a full-screen sheet.

    3.  **Implement the iPhone Layout (`.compact` size class):**
        *   The `ZStack` should contain the `List` of menu items as its base layer.
        *   Overlay `DraftOrderView` as a draggable bottom sheet. It should be partially visible at the bottom and can be swiped up to full screen.

    4.  **Update Interaction Logic:**
        *   In `MenuItemRowView` (inside `MenuSelectionView.swift`), change the `onTap` action for the `plus.circle.fill` button.
        *   Instead of setting `selectedMenuItem` to navigate, it should now directly call `orderManager.addItemToDraftOrder`. Use default values for size/toppings, or present a minimal popover for quick selection.
        *   The `DraftOrderView` (now visible on the same screen) will automatically update because it observes the `@EnvironmentObject var orderManager`.
        *   Keep a separate "Customize" button or a long-press gesture on the row to navigate to the full `AddItemDetailView` for more complex modifications.

*   **Expected Goal:**
    A user can now add multiple items to an order from a single screen, seeing the draft order update in real-time. This significantly speeds up the order-taking process and improves usability by keeping the user in context.

---
