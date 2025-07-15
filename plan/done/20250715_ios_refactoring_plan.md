# iOS App Refactoring Execution Plan - 2025/07/15

This document provides a detailed, step-by-step guide for an AI agent to implement the planned refactoring of the iOS application.

## ✅ COMPLETED IMPLEMENTATION

---

### **Part 1: Refactor `OrderManager` to a Shared Instance** ✅

**Goal:** Ensure a single source of truth for order data by converting `OrderManager` into a singleton and injecting it as an `EnvironmentObject`.

**Step 1.1: Modify `OrderManager.swift` to be a Singleton** ✅
1.  ✅ Added a static shared instance: `static let shared = OrderManager()`.
2.  ✅ Made the initializer private: `private init()` (Note: `OrderManager` inherits from `ObservableObject`, not `NSObject`).

**Step 1.2: Inject the Shared `OrderManager` into the SwiftUI Environment** ✅
1.  ✅ Updated `mobile/SOder/SOder/SOderApp.swift` to inject `OrderManager.shared` and `PrinterManager.shared` into the environment.

**Step 1.3: Update Views to Consume the `OrderManager` from the Environment** ✅
1.  ✅ **`OrdersView.swift`**: Changed from `@StateObject private var orderManager = OrderManager()` to `@EnvironmentObject private var orderManager: OrderManager`.
2.  ✅ **`KitchenBoardView.swift`**: Changed from `@StateObject private var orderManager = OrderManager()` to `@EnvironmentObject private var orderManager: OrderManager`.
3.  ✅ **`SelectTableView.swift`**: Changed from `@StateObject private var orderManager = OrderManager()` to `@EnvironmentObject private var orderManager: OrderManager`.

---

### **Part 2: Optimize Data Fetching with Supabase RPC** ✅

**Goal:** Improve performance by moving data-intensive joins from the client to a Supabase RPC function.

**Step 2.1: Create the Supabase Migration for the RPC Function** ✅
1.  ✅ Created `infra/migrations/0022_rpc_get_active_orders.sql` with the `get_active_orders_with_details` function.
2.  ✅ The function filters orders by restaurant_id and excludes completed, canceled, and draft orders.

**Step 2.2: Update `OrderManager` to Use the RPC Function** ✅
1.  ✅ Modified the `fetchActiveOrders()` function to use the RPC function `get_active_orders_with_details`.
2.  ✅ The implementation now first gets the basic order data from the RPC, then fetches detailed relationship data for each order.

---

### **Part 3: Improve Auto-Print Logic** ✅

**Goal:** Reduce overhead in the auto-printing feature by reusing a single `PrinterManager` instance.

**Step 3.1: Ensure `PrinterManager` is a Singleton** ✅
1.  ✅ Added `static let shared = PrinterManager()` to `PrinterManager.swift`.
2.  ✅ Made the initializer private: `private init()`.

**Step 3.2: Modify `OrderManager` to Use the Shared `PrinterManager`** ✅
1.  ✅ Added a property reference to the shared `PrinterManager`: `private let printerManager = PrinterManager.shared`.
2.  ✅ Updated the `autoPrintNewOrders(previousOrders: [Order])` function to use `printerManager` instead of creating a new `PrinterManager()` instance.

---

## **Summary of Changes Made:**

1. **Singleton Pattern Implementation:**
   - Both `OrderManager` and `PrinterManager` now use the singleton pattern with shared instances
   - All initializers are private to enforce singleton usage

2. **Environment Object Injection:**
   - `SOderApp.swift` now injects both `OrderManager.shared` and `PrinterManager.shared` into the environment
   - All relevant views now consume these managers from the environment instead of creating new instances

3. **Database Optimization:**
   - Created a new Supabase RPC function `get_active_orders_with_details` to optimize data fetching
   - Updated `fetchActiveOrders()` to use the RPC function for better performance

4. **Auto-Print Optimization:**
   - `OrderManager` now reuses the shared `PrinterManager` instance for all auto-print operations
   - Eliminates redundant `PrinterManager` instance creation in printing functions

## **Files Modified:**
- `mobile/SOder/SOder/services/OrderManager.swift`
- `mobile/SOder/SOder/services/PrinterManager.swift`
- `mobile/SOder/SOder/SOderApp.swift`
- `mobile/SOder/SOder/ContentView.swift`
- `mobile/SOder/SOder/views/orders/OrdersView.swift`
- `mobile/SOder/SOder/views/kitchen/KitchenBoardView.swift`
- `mobile/SOder/SOder/views/pos/SelectTableView.swift`
- `mobile/SOder/SOder/views/pos/MenuItemView.swift` (preview fixes)
- `mobile/SOder/SOder/views/pos/MenuCategoryView.swift` (preview fixes)
- `mobile/SOder/SOder/views/pos/DraftOrderView.swift` (preview fixes)
- `mobile/SOder/SOder/views/pos/MenuSelectionView.swift` (preview fixes)
- `infra/migrations/0022_rpc_get_active_orders.sql` (new file)

## **Additional Fixes Applied:**
- Fixed all SwiftUI preview code to use `OrderManager.shared` instead of creating local instances
- Resolved compilation errors caused by private initializers in singleton classes
- Updated all mock instances in preview providers to use shared singletons

All implementations follow the mobile application development rules and maintain consistency with the existing codebase architecture.
