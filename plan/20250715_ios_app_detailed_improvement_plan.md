# iOS App Improvement Plan

**Date:** July 15, 2025

## Overview
This document defines a comprehensive plan to enhance performance, stability, and usability of the iOS application under `mobile/SOder`. Tasks are prioritized by impact and complexity.

---

## Goals
1. Reduce latency and network overhead
2. Prevent UI stalls and crashes
3. Improve configurability and reliability
4. Ensure full accessibility compliance
5. Adapt layouts for varied screen sizes

---

## High Priority

### 1. Eliminate N+1 Network Calls
- **Issue:** `fetchActiveOrders()` issues one RPC then loops per order to `.select` details.  
- **Solution:** Modify backend RPC to return orders with nested order items and categories in one call or use a single `IN` query.  
- **Action Items:**  
  - Update Supabase function signature and client call.  
  - Update `OrderManager` to decode nested JSON into model structs.  
  - Write unit tests verifying orders include items and categories.  
  - Measure and benchmark before/after network traffic and latency.  

### 2. Safe Handling of Optional Data
- **Issue:** Force-unwrap `restaurant.name!` in `ConnectionStatusBar` can crash.  
- **Solution:** Use optional binding or fallback placeholder (e.g., "Unknown Restaurant").  
- **Action Items:**  
  - Replace force-unwrap with `if let` or `??`.  
  - Write a UI test for missing restaurant data case.  

### 3. Configurable Tax Rate
- **Issue:** Hard-coded `0.10` rate in checkout calculations reduces flexibility.  
- **Solution:** Load tax rate from `restaurant.settings.taxRate` or a configuration key.  
- **Action Items:**  
  - Update `Restaurant` model to include optional `taxRate` property.  
  - Update `CheckoutViewModel` to retrieve and apply dynamic rate (defaulting to 0 if unset).  
  - Add unit tests for checkout arithmetic with edge tax values.  

---

## Medium Priority

### 4. Offload Heavy Work from MainActor
- **Issue:** Printing and queue processing on `@MainActor` may block UI.  
- **Solution:** Remove `@MainActor` from long-running methods; dispatch to background queues, only updating UI on main.  
- **Action Items:**  
  - Refactor `PrinterService.connectAndSendData` and `PrintQueueManager` batch operations.  
  - Use `Task.detached` or dedicated DispatchQueues for I/O.  
  - Add integration tests simulating slow Bluetooth responses.  

### 5. Optimize Category Grouping
- **Issue:** `computeCategoryGrouping()` runs on main thread on every update/timer.  
- **Solution:** Run grouping on background queue; cache results and invalidate only on data change.  
- **Action Items:**  
  - Move grouping logic into an async actor or background queue.  
  - Invalidate and recompute only when order data changes.  
  - Add unit tests to verify grouping correctness and performance.  

### 6. Accessibility Audit & Improvements
- **Issue:** Incomplete `accessibilityLabel`/`Hint` on some buttons (e.g., "Add Items").  
- **Solution:** Review all interactive controls, add missing labels and hints; test with VoiceOver and Dynamic Type.  
- **Action Items:**  
  - Use Xcode’s Accessibility Inspector to find unlabeled elements.  
  - Add `.accessibilityLabel` and `.accessibilityHint` on missing controls.  
  - Verify color contrast and Dynamic Type scaling.  

---

## Low Priority

### 7. Concurrency Safety in Auto-Printing
- **Issue:** Race conditions in `autoPrintNewOrders` and `autoPrintReadyItems` can double-print or skip items.  
- **Solution:** Introduce locks or serial execution; track state to avoid overlapping tasks.  
- **Action Items:**  
  - Add a `DispatchSemaphore` or `Actor` to serialize print tasks.  
  - Write tests simulating rapid state changes and failure retries.  

### 8. Adaptive Layouts for iPad
- **Issue:** Some modals/forms remain narrow on larger screens.  
- **Solution:** Use `sheetDetents`, `NavigationSplitView`, or `.popover` for targeted views.  
- **Action Items:**  
  - Update `AddItemDetailView` and printer setup to use adaptive presentation.  
  - Test on iPad in both portrait/landscape, regular/compact width.  

---

## Tracking & Verification
- Use GitHub Issues for each action item.  
- Add Codeowners reviews for critical refactors.  
- Automate unit and UI tests in CI pipeline.  
- Collect performance metrics via Instruments and telemetry.  

---

*Prepared by: Mobile Team*
