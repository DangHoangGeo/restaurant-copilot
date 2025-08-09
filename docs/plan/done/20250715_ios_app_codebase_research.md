# iOS App Codebase Research

**Date:** July 15, 2025

## 1. N+1 Network Calls in `OrderManager.fetchActiveOrders()`
- Location: `mobile/SOder/SOder/services/OrderManager.swift` (lines ~486–500)
- Observation: Uses optimized RPC `get_active_orders_with_details` but still loops over each order with `.from("orders").select(...).eq("id", value: order.id)` to fetch nested data.  
- Impact: Multiple network requests (one per order) increases latency and bandwidth.

## 2. Heavy Computation on Main Thread
- Location: `mobile/SOder/SOder/views/kitchen/KitchenBoardView.swift` in `computeCategoryGrouping()` method (lines ~180–240)
- Observation: Grouping logic iterates through all orders and order items on every data update or timer fire, executing on the main thread.
- Impact: Potential UI jank or freezes on large datasets.

## 3. Printing Service on `@MainActor`
- Location: `mobile/SOder/SOder/services/printer/PrintQueueManager.swift` (class marked `@MainActor`) and `PrinterService.shared.executePrintJob` likely also on main actor.
- Observation: Heavy I/O (Bluetooth, network) occurs on main actor during `processQueue()` and `processJob(_:)`.
- Impact: UI responsiveness could degrade during printing.

## 4. Duplicate Manager Instances
- Observation: Tests (`SOderTests/AutoPrintingTests.swift`) instantiate `OrderManager()` directly, bypassing `OrderManager.shared`. Some views use `.environmentObject(OrderManager.shared)`, others may inadvertently create new instances (e.g., in previews or sample code).
- Impact: Multiple subscriptions to realtime updates, inconsistent state, wasted resources.

## 5. Force-Unwrapped Optionals
- Location: `mobile/SOder/SOder/views/ConnectionStatusBar.swift` (line ~44) uses `restaurant.name!`.
- Observation: No safe fallback or optional binding.
- Impact: Crash risk if `currentRestaurant.name` is nil.

## 6. Hard-Coded Tax Rate
- Location: 
  - `mobile/SOder/SOder/views/orders/CheckoutView.swift` (line 47) sets `private let taxRate: Double = 0.10`.  
  - `mobile/SOder/SOder/views/orders/OrderDetailView.swift` (line 295) multiplies by `0.10` directly.
- Impact: Inflexible for different regions or per-restaurant configuration.

## 7. Partial Accessibility Coverage
- Location: `mobile/SOder/SOder/views/pos/DraftOrderView.swift`, `AddItemDetailView.swift`, and some printer views lack `.accessibilityLabel` and hints on interactive buttons.
- Observation: Some controls missing labels, especially "Add Items" button in `DraftOrderView`.
- Impact: Incomplete VoiceOver support and poor accessibility.

## 8. Adaptive Layouts on iPad
- Location: Multiple views (`AddItemDetailView`, printer setup views) always use `NavigationView` for modal presentation without adaptive detents.
- Observation: Forms appear narrow on iPad, not leveraging `sheetDetents` or `NavigationSplitView`.
- Impact: Suboptimal user experience on large devices.

## 9. Error Handling and Edge Cases
- Observation: Force unwraps in date parsing fallback (`dateFromString` returns `Date()`), no catch for malformed JSON, no handling for missing optional `order_items`.
- Impact: Potential crashes or silent failures in edge cases.

## 10. Auto-Printing Race Conditions
- Location: `OrderManager.autoPrintNewOrders` / `autoPrintReadyItems` methods coordinate via `@Published` flags and realtime listeners.
- Observation: No explicit serialization or locks; tasks could overlap, causing double prints or missed jobs.
- Impact: Inconsistent print state.

---

*This research will inform the detailed improvement plan.*
