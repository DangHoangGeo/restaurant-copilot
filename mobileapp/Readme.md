**I. Code Analysis (Focus on Current Structure for Printing/Checkout)**

1.  **Overall Architecture:**
    *   **MVVM-like:** `AuthenticationViewModel`, `TenantViewModel`, and `OrderService` (as `@ObservableObject`) manage state and logic.
    *   **Supabase Integration:** `AuthService` handles login/logout. `OrderService` manages real-time order subscriptions and updates via Supabase.
    *   **SwiftUI Views:** `ContentView` orchestrates the main flow. `OnboardingLoginView` for tenant/user login. `OrderListView` and `OrderDetailView` for the core order management.
    *   **Configuration:** `Config.swift` stores Supabase keys, printer IP/commands.
    *   **Focus:** Clearly on order display, status updates, and printing. Checkout logic isn't explicitly detailed in the views yet but implied by `OrderStatus.completed`.

2.  **Models:**
    *   **`Order`, `OrderItem`:** Structs with custom initializers `init?(from dict: [String: Any])` for parsing Supabase data. This is a common pattern but can be made safer with `Decodable`. Using `ISO8601DateFormatter` for dates is good.
    *   **`OrderStatus`:** Simple enum.
    *   **`Tenant`:** Basic tenant info.
    *   **`UserRole`:** Limited to `ownerAdmin` and `customer`.

3.  **Services:**
    *   **`AuthService`:** Handles Supabase email/password login and logout. Error handling for invalid credentials.
    *   **`OrderService`:**
        *   **Real-time Subscription:** Uses Supabase real-time for `orders` table, filtered by `restaurant_id`. Handles `INSERT`, `UPDATE`, `DELETE` events.
        *   **Retry Logic:** Implements retry attempts for subscription connection.
        *   **Debouncer:** Good for handling rapid updates.
        *   **Initial Fetch:** Fetches active orders upon successful subscription.
        *   **Status Update:** `updateOrderStatus` sends updates to Supabase.
    *   **`PrinterService`:** Same as before, handles network printing.
    *   **`TenantService`:** Mock service for fetching tenant data. For a real app, this would hit your backend or Supabase.

4.  **ViewModels:**
    *   **`AuthenticationViewModel`:** Manages `isAuthenticated`, JWT parsing (for `restaurantId`, `userRole`), and stores them in `@AppStorage`. Initializes `OrderService` subscription upon successful login.
    *   **`TenantViewModel`:** Manages `currentTenant`.
    *   **`OrderService` (as ViewModel):** This service is also acting as a view model by being an `@ObservableObject` and publishing `activeOrders`. This is a common and acceptable pattern for simpler cases.

5.  **Views:**
    *   **`ContentView`:** Switches between `OnboardingLoginView` and `mainAppView` based on `authViewModel.isAuthenticated`.
    *   **`OnboardingLoginView`:** Collects subdomain (restaurant ID for Supabase filter), email, password.
    *   **`OrderListView`:** Displays `orderService.activeOrders`. Navigates to `OrderDetailView`.
    *   **`OrderDetailView`:**
        *   Displays order details and items.
        *   Allows status updates (New -> Preparing -> Ready -> Completed).
        *   Has a "Print" button.
        *   Uses `.onReceive(service.$activeOrders)` to try and keep its local `@State var order` in sync.
    *   **`PrintFormatter`:** Basic formatting for kitchen slips, using ASCII encoding.

6.  **Configuration:**
    *   `Config.swift`: Holds Supabase URL/key, printer details, and printer commands.

**Addressing Your Specific Issues:**

1.  **"I cannot see the order item even if that order contain some items."**
    *   **`Order.init?(from dict: [String: Any])`:**
        *   It parses `itemsArray = dict["items"] as? [[String: Any]]`.
        *   Then, `self.items = itemsArray.compactMap { OrderItem(from: $0) }`.
        *   **Check 1 (Supabase Data):** In your Supabase table for `orders`, how are the `items` stored?
            *   Are they in a JSONB column named `items` that contains an array of item objects?
            *   Or, are `order_items` in a separate table linked by `order_id` (a more relational approach)? Your current `OrderService.fetchInitialActiveOrders` query:
                ```sql
                items:order_items (id, menu_item_id, menu_item_name, quantity, notes)
                ```
                This Supabase syntax suggests `order_items` is a *separate table* related to `orders`, and you're trying to embed them. This is correct.
        *   **Check 2 (Parsing in `Order.init`):** The `itemsArray.compactMap { OrderItem(from: $0) }` should work if `itemsArray` is correctly populated by the Supabase query.
        *   **Debugging Step:** Inside `Order.init?(from dict: [String: Any])`, right after `let itemsArray = dict["items"] as? [[String: Any]]`, print `itemsArray`.
            ```swift
            // In Order.init?
            let itemsArray = dict["items"] as? [[String: Any]]
            print("Order \(id) itemsArray from Supabase: \(String(describing: itemsArray))") // DEBUG
            guard /* ... other guards ... */,
                  let itemsArray = itemsArray else { // Ensure itemsArray is not nil here
                // If itemsArray is nil, it means Supabase isn't returning the "items" key
                // as expected by your select query.
                print("Order \(id): 'items' key not found or not an array in Supabase response.")
                // You might decide to initialize with empty items if an order can exist without them initially
                // self.items = [] // if an order can be valid without items
                // return nil // if items are mandatory
                // For now, let's assume items are mandatory for an order to be valid.
                return nil
            }
            self.items = itemsArray.compactMap { OrderItem(from: $0) }
            if itemsArray.count > 0 && self.items.count != itemsArray.count {
                print("Warning: For order \(id), received \(itemsArray.count) item dictionaries, but parsed \(self.items.count) OrderItem objects.")
            } else if itemsArray.isEmpty {
                print("Order \(id) has no items from Supabase.")
            }
            ```
        *   **Check 3 (`OrderItem.init?`):** Ensure the keys inside `OrderItem.init?(from dict: [String: Any])` (e.g., `menu_item_id`, `menu_item_name`) exactly match the column names in your `order_items` table in Supabase. Case sensitivity matters.
    *   **Display in `OrderDetailView`:** The `ForEach(order.items)` loop should then work if `order.items` is populated.

2.  **"Each order item must have their own status."**
    *   **Current Model:** `OrderItem` struct *does not* have a `status` field.
    *   **Action:** Add a `status: OrderStatus` (or `String`) field to your `OrderItem` struct.
        ```swift
        // In Models/Order.swift -> OrderItem
        struct OrderItem: Identifiable, Codable, Equatable {
            let id: String
            let menuItemId: String
            let menuItemName: String
            var quantity: Int
            var notes: String?
            var status: OrderStatus = .new // Default to 'new' for an item

            init?(from dict: [String: Any]) {
                guard let id = dict["id"] as? String,
                      let menuItemId = dict["menu_item_id"] as? String,
                      let menuItemName = dict["menu_item_name"] as? String,
                      let quantity = dict["quantity"] as? Int else {
                    return nil
                }
                self.id = id
                self.menuItemId = menuItemId
                self.menuItemName = menuItemName
                self.quantity = quantity
                self.notes = dict["notes"] as? String
                
                // Parse item status if present, otherwise default
                if let itemStatusString = dict["status"] as? String,
                   let itemStatus = OrderStatus(rawValue: itemStatusString) {
                    self.status = itemStatus
                } else {
                    self.status = .new // Default status
                }
            }

            // Add an init for creating new items programmatically if needed
            init(id: String, menuItemId: String, menuItemName: String, quantity: Int, notes: String? = nil, status: OrderStatus = .new) {
                self.id = id
                self.menuItemId = menuItemId
                self.menuItemName = menuItemName
                self.quantity = quantity
                self.notes = notes
                self.status = status
            }
        }
        ```
    *   **Supabase Table:** Your `order_items` table in Supabase must also have a `status` column (e.g., text type storing "new", "preparing", etc.).
    *   **Supabase Query in `OrderService.fetchInitialActiveOrders`:** Update the select query for items:
        ```swift
        items:order_items (id, menu_item_id, menu_item_name, quantity, notes, status) // Add status
        ```
    *   **Updating Item Status:** You'll need a new function in `OrderService` to update the status of a specific `order_item` in Supabase.
        ```swift
        // In OrderService.swift
        func updateOrderItemStatus(orderId: String, itemId: String, newStatus: OrderStatus) async throws {
            guard let client = client else { throw OrderServiceError.clientNotInitialized }
            struct ItemStatusUpdate: Encodable { let status: String }
            _ = try await client.database
                .from("order_items") // Assuming your table is 'order_items'
                .update(ItemStatusUpdate(status: newStatus.rawValue))
                .eq("id", value: itemId) // Assuming 'id' is the PK of order_items
                // .eq("order_id", value: orderId) // Add if 'id' isn't globally unique for items
                .execute()
            print("OrderService: Requested status update for item \(itemId) to \(newStatus.rawValue).")
        }
        ```
    *   **UI in `OrderDetailView`:**
        *   The `ForEach(order.items)` loop will iterate through items.
        *   Inside the loop, display `item.status`.
        *   Add controls (e.g., a `Picker` or buttons) to change `item.status`, which would then call the new `OrderService.updateOrderItemStatus` method (likely via the ViewModel).

3.  **"When manual add order item, now it only allow to chose item from menu... I want to let the user able to create new item by just pass the name, price and quality too."**
    *   **Current State:** `AddItemsSheet.swift` (and its variants like `AddItemsToOrderSheet` / `ItemSelectionSheetView` from your previous code) is focused on selecting `MenuItem` objects.
    *   **Goal:** Allow adding "custom" or "off-menu" items directly to an order.
    *   **Plan:**
        1.  **Modify `AddItemsSheet.swift` (or create a dedicated sheet for adding to an *existing* order if preferred):**
            *   Add a `Toggle` or `Picker` to switch between "Select from Menu" and "Add Custom Item".
            *   When "Add Custom Item" is selected:
                *   Show `TextFields` for "Item Name", "Price", and "Quantity".
                *   Optionally, a `TextField` for "Notes".
        2.  **Logic for Adding Custom Item:**
            *   When the user confirms a custom item, you'll create an `OrderItem` instance.
            *   Since it's custom, `menuItemId` might be `nil` or a special value like "CUSTOM".
            *   `menuItemName` will be the entered name.
            *   `unitPrice` will be the entered price.
            *   This new `OrderItem` needs to be added to the `order.items` array.
            *   The `order` (with the new custom item) then needs to be saved back to Supabase. This means your `OrderService.updateOrder` (or a similar function) should handle saving the entire `order` object including its `items` array.
                *   **Important for Supabase:** If `items` are in a separate `order_items` table, adding a custom item means:
                    1.  Creating a new row in `order_items` linked to the `order_id`.
                    2.  Then, potentially re-fetching or updating the main `order` object if its `totalAmount` needs recalculation on the client or if Supabase functions/triggers don't handle it. Your `Order` model currently calculates `totalAmount` on the client, so this is fine.

---

**II. UI/UX Improvement Plan & Detailed Instructions (Focus on Simplicity)**

**Sprint 1: Core Order Display & Item Management**

**Task 1.1: Fix and Enhance Item Display in `OrderDetailView`**

*   **Goal:** Clearly list all items in an order, show their individual statuses, and allow status updates.
*   **Instructions:**
    1.  **Solve Item Visibility:** Complete **Task 0 (Debugging)** above. This is paramount.
    2.  **Add Item Status Model:** Ensure `OrderItem` has a `status: OrderStatus` field (as detailed in point 2 above).
    3.  **Display Item Status:**
        *   In `OrderDetailView`, within the `ForEach(order.items)` loop:
            ```swift
            // Inside ForEach(order.items) in OrderDetailView
            VStack(alignment: .leading) {
                HStack {
                    Text(item.menuItemName)
                        .font(.headline)
                        // Apply strikethrough if item status is cancelled/removed
                        .strikethrough(item.status == .completed || item.status == .unknown, color: .gray) // Example for completed
                    Spacer()
                    Text("x\(item.quantity)")
                }
                if let notes = item.notes, !notes.isEmpty {
                    Text("Notes: \(notes)")
                        .font(.caption).foregroundColor(.gray)
                }
                
                // --- Item Status Display & Picker ---
                HStack {
                    Text("Item Status: \(item.status.localizedString())") // Display current status
                        .font(.callout)
                        .foregroundColor(statusColor(item.status)) // Use your statusColor helper

                    Spacer()
                    
                    // Only show Picker if order itself is not completed
                    if order.status != .completed {
                        Picker("Set Item Status", selection: itemStatusBinding(for: item.id)) {
                            ForEach(OrderStatus.allCases.filter { $0 != .unknown }) { statusOption in
                                Text(statusOption.localizedString()).tag(statusOption)
                            }
                        }
                        .pickerStyle(.menu) // Or .segmented if few options
                        .labelsHidden()
                    }
                }
                // --- End Item Status ---
            }
            Divider()
            ```
    4.  **Create `itemStatusBinding` helper in `OrderDetailView`:** This is needed because `item` in the `ForEach` is a constant copy.
        ```swift
        // In OrderDetailView
        private func itemStatusBinding(for itemId: String) -> Binding<OrderStatus> {
            Binding<OrderStatus>(
                get: {
                    // Find the item in the @State order.items and return its status
                    if let currentItem = order.items.first(where: { $0.id == itemId }) {
                        return currentItem.status
                    }
                    return .unknown // Default or error case
                },
                set: { newStatus in
                    // Find the index, update the @State order.items, then call ViewModel/Service
                    if let index = order.items.firstIndex(where: { $0.id == itemId }) {
                        order.items[index].status = newStatus // Update local @State for immediate UI
                        Task {
                            do {
                                // Call Supabase to update item status
                                try await service.updateOrderItemStatus(orderId: order.id, itemId: itemId, newStatus: newStatus)
                                // Optional: refresh order from service if backend might have made other changes
                                // Or rely on the Realtime listener to update the main order object.
                            } catch {
                                // Handle error (e.g., show an alert)
                                print("Failed to update item \(itemId) status to \(newStatus): \(error)")
                                // Revert local change if backend update failed
                                // self.order.items[index].status = originalStatus (need to store original)
                            }
                        }
                    }
                }
            )
        }
        ```
    5.  **Modify `OrderService.handleOrderChange` and `Order.init`:**
        *   When an order update comes via Realtime, `OrderService` needs to parse the `items` array. Each item dictionary within that array should now also include its `status`.
        *   `Order.init(from dict: [String: Any])` needs to parse this `status` for each `OrderItem`.
        *   The `updateOrderStatus` in `OrderService` (for the whole order) should *not* override individual item statuses unless that's the intended logic (e.g., completing an order might complete all pending items). Generally, overall order status might be derived from item statuses or be independent.

**Task 1.2: Implement Custom Item Addition**

*   **Goal:** Allow adding off-menu items with name, price, quantity to an existing order.
*   **Instructions:**
    1.  **Adapt `AddItemsSheet.swift` (or create `AddCustomItemSheet.swift`):**
        *   Your existing `AddItemsSheet` is for menu selection. You'll need a way to input custom items.
        *   **Recommendation:** Instead of modifying `AddItemsSheet` heavily, it might be cleaner to have:
            *   `OrderDetailView` presents a *new* sheet, let's call it `OrderModificationSheet.swift`.
            *   This `OrderModificationSheet` has a `Picker` to toggle between "Select From Menu" and "Add Custom Item".
            *   If "Select FromMenu" -> embed `AddItemsSheet` (passing necessary bindings/callbacks).
            *   If "Add Custom Item" -> show simple `TextFields` for name, price, quantity.
    2.  **Sheet for Adding Custom Item (`AddCustomItemView.swift` - presented by `OrderModificationSheet`):**
        ```swift
        // Views/Main/Orders/AddCustomItemView.swift (Simplified)
        struct AddCustomItemView: View {
            @Binding var orderItems: [OrderItem] // Bind to the items array of the Order in OrderDetailView
            @Environment(\.dismiss) var dismiss

            @State private var itemName: String = ""
            @State private var itemPriceStr: String = ""
            @State private var itemQuantityStr: String = "1"
            @State private var itemNotes: String = ""

            var body: some View {
                NavigationView {
                    Form {
                        TextField("Item Name", text: $itemName)
                        TextField("Price (e.g., 10.50)", text: $itemPriceStr).keyboardType(.decimalPad)
                        TextField("Quantity", text: $itemQuantityStr).keyboardType(.numberPad)
                        TextField("Notes (Optional)", text: $itemNotes, axis: .vertical).lineLimit(3)
                        
                        Button("Add Custom Item") {
                            guard !itemName.isEmpty,
                                  let price = Double(itemPriceStr), price >= 0,
                                  let quantity = Int(itemQuantityStr), quantity > 0 else {
                                // Show alert for invalid input
                                return
                            }
                            
                            let newItem = OrderItem(
                                id: UUID().uuidString, // Generate new ID
                                menuItemId: "CUSTOM-\(UUID().uuidString.prefix(6))", // Special ID for custom
                                menuItemName: itemName,
                                quantity: quantity,
                                notes: itemNotes.isEmpty ? nil : itemNotes,
                                status: .new // Default status
                                // unitPrice needs to be added to OrderItem if not directly using menu item price
                            )
                            // Important: OrderItem needs a way to store its own price if it's custom
                            // Modify OrderItem to have unitPrice, and calculate totalPrice
                            // For now, let's assume OrderItem will be adapted
                            // This logic also assumes totalAmount of Order will be recalculated
                            orderItems.append(newItem)
                            dismiss()
                        }
                        .disabled(itemName.isEmpty || Double(itemPriceStr) == nil || Int(itemQuantityStr) == nil || Int(itemQuantityStr)! <= 0)
                    }
                    .navigationTitle("Add Custom Item")
                    .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { dismiss() } } }
                }
            }
        }
        ```
    3.  **Modify `OrderItem` and `Order` Models:**
        *   `OrderItem` needs a `unitPrice: Double` field.
        *   `OrderItem` needs a computed property `totalPrice: Double { Double(quantity) * unitPrice }`.
        *   `Order.totalAmount` should be recalculated based on `order.items.reduce(0) { $0 + $1.totalPrice }`.
        *   **Update `OrderItem.init(from dict: [String: Any])` to parse `unit_price`.**
        *   **Update `Order.init(from dict: [String: Any])` to parse `unit_price` for each item OR to expect `total_amount` to be correct from Supabase.**
            *   If Supabase calculates `total_amount` with a trigger/function, then client-side `totalAmount` can just use that.
            *   If client calculates `totalAmount`, then ensure `OrderItem` has `unitPrice` and `totalPrice`. Your current `Order` model directly uses `total_amount` from Supabase, which is fine if Supabase keeps it up-to-date. When adding custom items on the client, you'll need to decide if the client recalculates `totalAmount` and sends it, or if a Supabase function updates it after items are inserted/updated.
            *   **For simplicity now: Assume `Order.totalAmount` will be client-recalculated when items change and then saved.** So, `Order.totalAmount` will need to become `var` and the `init` should calculate it if `items` are present.
                ```swift
                // In Order.swift
                var totalAmount: Double // Make it var
                // ...
                init?(from dict: [String: Any]) {
                    // ...
                    self.items = itemsArray.compactMap { OrderItem(from: $0) }
                    // If items exist, recalculate totalAmount based on them,
                    // otherwise use the value from dict (which might be 0 for a new order)
                    if !self.items.isEmpty {
                        self.totalAmount = self.items.reduce(0) { $0 + ($1.totalPrice ?? 0.0) } // Assuming OrderItem gets totalPrice
                    } else {
                         guard let totalAmountFromDict = dict["total_amount"] as? Double else { return nil }
                         self.totalAmount = totalAmountFromDict
                    }
                    // ...
                }

                // In OrderItem.swift
                var unitPrice: Double // Add this
                var totalPrice: Double { Double(quantity) * unitPrice } // Computed

                init?(from dict: [String: Any]) {
                    // ...
                    guard let unitPriceVal = dict["unit_price"] as? Double else { return nil } // Parse unit_price
                    self.unitPrice = unitPriceVal
                    // ...
                }
                // Add an init for custom items
                init(id: String, menuItemId: String, menuItemName: String, quantity: Int, unitPrice: Double, notes: String? = nil, status: OrderStatus = .new) {
                    self.id = id; self.menuItemId = menuItemId; self.menuItemName = menuItemName; self.quantity = quantity; self.unitPrice = unitPrice; self.notes = notes; self.status = status;
                }
                ```
    4.  **Presenting the Sheet from `OrderDetailView`:**
        *   Add a new button "Add Item" in `OrderDetailView`.
        *   This button presents a sheet that allows choosing "Menu" or "Custom".
        *   **Example action for "Add Item" button in `OrderDetailView`:**
            ```swift
            @State private var showingItemAdditionChoiceSheet = false
            // ...
            Button("Add Item") { showingItemAdditionChoiceSheet = true }
            .sheet(isPresented: $showingItemAdditionChoiceSheet) {
                ItemAdditionChoiceView(order: $order) // New view to choose Menu/Custom
            }

            // ItemAdditionChoiceView.swift (New File)
            struct ItemAdditionChoiceView: View {
                @Binding var order: Order
                @Environment(\.dismiss) var dismissSheet
                @State private var showingMenuSelection = false
                @State private var showingCustomItemEntry = false

                var body: some View {
                    NavigationView {
                        List {
                            Button("Select from Menu") { showingMenuSelection = true }
                            Button("Add Custom Item") { showingCustomItemEntry = true }
                        }
                        .navigationTitle("Add Item To Order")
                        .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { dismissSheet() }}}
                        .sheet(isPresented: $showingMenuSelection) {
                            // Your existing AddItemsSheet (which selects from menu)
                            // It needs to append to order.items and then this choice sheet should dismiss.
                            AddItemsSheet(restaurantId: order.restaurantId) { selectedMenuItemsWithQuantities in
                                // Convert [MenuItem: Int] to [OrderItem] and append to order.items
                                for (menuItem, quantity) in selectedMenuItemsWithQuantities {
                                    // You need to ensure MenuItem has a price for OrderItem
                                    let newOrderItem = OrderItem(
                                        id: UUID().uuidString, // Or generate based on menuItem.id if unique
                                        menuItemId: menuItem.id ?? "UNKNOWN_MENU_ID", // menuItem.id needs to exist
                                        menuItemName: menuItem.name,
                                        quantity: quantity,
                                        unitPrice: 0.0, // <<<<<<< YOU NEED TO GET PRICE FROM MenuItem
                                        notes: nil, // Or allow notes during menu selection
                                        status: .new
                                    )
                                    // Modify your AddItemsSheet to allow selection of menu item with notes
                                    // And ensure MenuItem has price property accessible
                                    // order.items.append(newOrderItem) // This modifies the @Binding order
                                }
                                // After appending, dismiss this choice sheet AND the menu selection sheet
                                dismissSheet()
                            }
                        }
                        .sheet(isPresented: $showingCustomItemEntry) {
                             AddCustomItemView(orderItems: $order.items) // This appends to order.items
                             // When AddCustomItemView dismisses, the order @Binding has changed.
                             // This ItemAdditionChoiceView also needs to dismiss.
                             .onDisappear {
                                 dismissSheet() // Dismiss this choice sheet when custom item sheet is gone
                             }
                        }
                    }
                }
            }
            ```
            *This `ItemAdditionChoiceView` is a bit complex due to nested sheets. A simpler way might be to integrate the "Menu/Custom" choice directly into a single sheet if `AddItemsSheet` can be adapted.*
            *A more direct adaptation of your existing `ItemSelectionSheetView` (which has the menu/custom toggle) would be to ensure its `performAction()` correctly handles adding to an *existing* order (passed via its `context`).*

    5.  **Saving Order after Item Additions:**
        *   After items are added (either custom or from menu) to `order.items` in `OrderDetailView` (because `order` is `@State` and the sheet binds to its `items`), you need a "Save Changes" button in `OrderDetailView` or an automatic save.
        *   This save action would call an `OrderService` method to update the entire order (including its new/modified `items` array and recalculated `totalAmount`) in Supabase.
            ```swift
            // In OrderDetailView
            // Add a "Save Order Changes" button if items can be modified
            // This button would call:
            // Task {
            //    // Recalculate order.totalAmount if client-side
            //    order.totalAmount = order.items.reduce(0) { $0 + ($1.totalPrice ?? 0.0) }
            //    try await service.updateOrder(order: order) // New function in OrderService
            // }

            // In OrderService.swift
            func updateOrder(order: Order) async throws { // New function
                guard let client = client, let orderId = order.id else { throw OrderServiceError.clientNotInitialized }
                
                // You need to encode the Order struct (including its items) to what Supabase expects.
                // If 'items' are embedded JSONB, this is direct.
                // If 'items' are in a related table, this is more complex:
                //  1. Update the main order table (e.g., for total_amount, status).
                //  2. Delete existing items for this order_id from 'order_items'.
                //  3. Insert all current order.items into 'order_items'.
                // This is best done in a Supabase transaction or stored procedure if possible.
                // For simplicity here, assuming items are part of the 'orders' table row (e.g. JSONB).
                
                // Convert Order back to a dictionary or use Encodable.
                // Assuming your Order is Encodable and items are part of it.
                // Supabase Swift client might handle Encodable directly.
                // If not, convert to [String: Any].
                struct OrderUpdate: Encodable { // Define what you want to update
                    let items: [OrderItem]
                    let total_amount: Double
                    // add other fields you might change like status, notes etc.
                }
                let updatePayload = OrderUpdate(items: order.items, total_amount: order.totalAmount)

                _ = try await client.database
                    .from("orders")
                    .update(updatePayload) // Send the OrderItem array
                    .eq("id", value: orderId)
                    .execute()
                print("OrderService: Order \(orderId) and its items updated.")
            }
            ```

**Sprint 2: UI/UX Refinements**

**Task 2.1: Order List (`OrderListView`) Polish**

*   **Goal:** Clearer visual distinction for order status, better information density.
*   **Instructions:**
    1.  **Status Visualization:** The `statusColor` and `statusText` are good. Consider adding an icon next to the status text for quicker recognition.
        *   Example: `Label(statusText(for: order.status), systemImage: iconForStatus(order.status)).foregroundColor(statusColor(order.status))`
    2.  **Item Summary:** In `OrderRow`, show a brief summary of items if possible (e.g., "Pho Bo, Coke, +2 more").
    3.  **Time Since Ordered:** Display how long ago the order was placed (e.g., "5m ago", "1h ago").
        ```swift
        // In OrderRow or OrderListView
        Text(order.createdAt, style: .relative) // Shows "5 minutes ago", etc.
            .font(.caption2)
            .foregroundColor(.gray)
        ```

**Task 2.2: `OrderDetailView` Layout and Actions**

*   **Goal:** Intuitive layout, especially for actions.
*   **Instructions:**
    1.  **Action Buttons (`actionButtons` view):**
        *   Ensure primary actions (like "Mark Preparing" or "Complete") are prominent. The current `.buttonStyle(.borderedProminent)` is good.
        *   The "Print" button might be secondary (`.bordered`) unless it's a primary step.
    2.  **Item List Scrolling:** Ensure the list of items within `OrderDetailView` scrolls independently if it's long, without scrolling the entire detail view's header. (A `List` or `ScrollView` for items is needed).
    3.  **Loading/Error States:** The `updateError` text is good. For `isPrinting`, consider an overlay `ProgressView` on the print button itself.

**Task 2.3: Print Formatting (`PrintFormatter`)**

*   **Goal:** Extremely clear kitchen slips.
*   **Instructions:**
    1.  **Encoding:** **Crucially, change `.data(using: .ascii)!` to `.data(using: .shiftJIS)!` or another appropriate encoding if your printer supports Japanese/Vietnamese characters.** ASCII will strip them. Test this thoroughly. If your printer supports UTF-8, that's even better: `.data(using: .utf8)!`.
    2.  **Item Details on Slip:**
        *   **Bold Item Name:** `command.append(Data(printerCmd.boldOn))` before name, `boldOff` after.
        *   **Notes:** Make notes distinct. Indent them and perhaps print "NOTES:" before them.
            ```swift
            // In PrintFormatter.formatOrderForKitchen, item loop:
            command.append(Data(printerCmd.boldOn))
            command.append((item.menuItemName + "\n").data(using: .shiftJIS)!) // Or chosen encoding
            command.append(Data(printerCmd.boldOff))
            command.append("  Qty: \(item.quantity)\n".data(using: .shiftJIS)!)
            if let notes = item.notes, !notes.isEmpty {
                command.append("    NOTES: \(notes)\n".data(using: .shiftJIS)!) // Indented
            }
            command.append("-\n".data(using: .shiftJIS)!) // Item separator
            ```
    3.  **Header:** Table ID should be very large. Order timestamp can be useful.
    4.  **Character Widths:** Thermal printers have fixed character widths per line (e.g., 32, 42, 48). Be mindful of this for alignment.

**Task 2.4: Improve Error Handling and User Feedback**

*   **Goal:** Informative and non-intrusive error/success messages.
*   **Instructions:**
    1.  **Toast Messages:** Implement a consistent toast message system (as discussed in previous responses) for short success/error feedback.
    2.  **Alerts:** Use `Alert`s for critical errors that require user acknowledgment or decision.
    3.  **Loading Indicators:** Show `ProgressView` during network operations (fetching orders, updating status, printing). Disable interactive elements during these operations to prevent multiple submissions.

**Task 2.5: Checkout Flow (Conceptual - Not much code yet)**

*   **Goal:** A simple way to mark an order as `completed` and potentially print a final bill.
*   **Considerations:**
    1.  **Trigger:** From `OrderDetailView`, the "Complete" button (which sets status to `.completed`).
    2.  **Payment Details (Optional for this phase):** If you need to record payment type (cash, card) or amount tendered, this would be a separate screen/modal before marking as completed. For now, just completing the status is the focus.
    3.  **Final Bill Print:** After marking as completed, offer to print a customer receipt. `PrintFormatter` would need a `formatOrderForCustomerReceipt` method similar to `formatOrderForKitchen` but with prices, total, restaurant info, etc.

**Implementation Details & Priorities:**

1.  **Fix Item Display (Task 0, 1.1):** This is P0. The app is unusable without it.
    *   Focus on `Order.init` and `OrderItem.init` parsing.
    *   Verify Supabase query and data structure.
    *   Add `status` to `OrderItem` and ensure it's displayed.
2.  **Enable Custom Item Addition (Task 1.2):** This is a core functional requirement.
    *   Decide on the sheet strategy (adapt `ItemSelectionSheetView` or use a new `OrderModificationSheet` that can present `AddCustomItemView`).
    *   Modify `OrderItem` and `Order` for `unitPrice` and `totalAmount` recalculation if needed.
    *   Implement `OrderService.updateOrder` for saving orders with modified/new items.
3.  **Improve Print Formatting (Task 2.3):** Essential for the kitchen. Correct encoding is key.
4.  **UI/UX Polish (Sprint 2 tasks):** Tackle these iteratively once core functions are stable.

Start by thoroughly debugging the item parsing. Use `print()` statements liberally in your `init` methods and service calls to see the data at each step.