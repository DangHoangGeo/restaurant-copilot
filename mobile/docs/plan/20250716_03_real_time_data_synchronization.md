
### **Task 3: Optimize Real-time Data Synchronization**

*   **Scope:**
    This is a performance and architecture task focused on the data layer. It involves refactoring `OrderManager.swift` to handle real-time updates from Supabase more efficiently.

*   **Problem:**
    The current implementation re-fetches the entire list of active orders from the database in response to any real-time event (insert, update). This is highly inefficient, does not scale, and causes unnecessary network traffic and UI refreshes.

*   **Solution:**
    Refactor the real-time subscription handlers in `OrderManager` to process incremental changes from the Supabase broadcast payload. Instead of a full refresh, the app will apply specific changes (inserting a single new order, updating one, or deleting one) to the local `@Published var orders` array.

*   **Implement guide:**
    1.  **Target `OrderManager.swift`:**
        *   Open the file `mobile/SOder/SOder/services/OrderManager.swift`.
        *   Locate the `setupRealtimeSubscription()` function and the `handleOrderChange()` and `handleOrderItemChange()` functions.

    2.  **Refactor Subscription Handlers:**
        *   Modify the `postgresChange` listeners to extract the payload.
        *   **Handle Inserts:** In the `InsertAction` listener for the `orders` table, access the new record from the broadcast payload: `for await change in ordersInsertion { let newRecord = try change.decode(as: OrderWithTableResponse.self) ... }`.
        *   Convert the `newRecord` DTO to an `Order` model.
        *   Insert this single new `Order` into the `orders` array: `self.orders.insert(newOrderModel, at: 0)`.
        *   **Handle Updates:** In the `UpdateAction` listener, decode the `newRecord`, find the index of the existing order in the `orders` array using its `id`, and replace it at that index: `if let index = self.orders.firstIndex(where: { $0.id == updatedOrderModel.id }) { self.orders[index] = updatedOrderModel }`.
        *   **Handle Deletes (Optional but Recommended):** Add a listener for `DeleteAction`. Get the `id` from `change.oldRecord` and remove the corresponding order from the `orders` array: `self.orders.removeAll(where: { $0.id == deletedOrderId })`.

    3.  **Remove Inefficient Code:**
        *   Delete the calls to `await fetchActiveOrders()` from within `handleOrderChange()` and `handleOrderItemChange()`. The handlers will now perform the changes directly on the local array.

*   **Expected Goal:**
    The application's UI will update instantly and efficiently in response to database changes. Network requests will be drastically reduced, as the app will no longer perform a full data fetch on every minor update. The overall performance and responsiveness of the `OrdersView` and `KitchenBoardView` will be significantly improved, especially in a high-volume environment.