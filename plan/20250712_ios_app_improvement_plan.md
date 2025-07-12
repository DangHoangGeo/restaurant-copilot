# iOS App Improvement Plan - 2025-07-12

This document outlines a plan to address the findings from the recent iOS codebase review. The tasks are prioritized to tackle the most critical issues first, focusing on performance, user experience, and stability.

## 1. High Priority

### 1.1. Refactor OrderManager to a Shared Instance
-   **Problem**: `OrdersView` and `KitchenBoardView` create separate `OrderManager` instances, causing duplicate data, redundant network calls, and increased memory usage.
-   **Solution**: Implement `OrderManager` as a shared instance (singleton) and provide it to the relevant views using SwiftUI's `EnvironmentObject`. This ensures a single source of truth for order data and a single realtime subscription.
-   **Affected Files**:
    -   `OrderManager.swift`: Modify to support a shared instance.
    -   Main App file (e.g., `YourAppNameApp.swift`): Instantiate the shared `OrderManager` and inject it into the environment.
    -   `OrdersView.swift`, `KitchenBoardView.swift`: Refactor to consume the `OrderManager` from the environment instead of creating a new instance.

### 1.2. Optimize Data Fetching with Supabase RPC
-   **Problem**: Client-side queries like `fetchActiveOrders()` are inefficient, joining large tables and fetching nested objects, which slows down the app.
-   **Solution**: Create and use a Supabase RPC (Remote Procedure Call) function named `get_active_orders_with_details`. This moves the heavy data joining logic to the database, reducing network payload and improving response times.
-   **Tasks**:
    1.  Define the `get_active_orders_with_details` SQL function in a new Supabase migration file.
    2.  Update the data-fetching logic in the app to call this new RPC function instead of performing a client-side join.
-   **Affected Files**:
    -   `infra/migrations/`: Add a new migration file for the RPC function.
    -   `OrderManager.swift` (or relevant data service): Replace the existing `fetchActiveOrders` implementation with a call to the Supabase RPC.

### 1.3. Improve Auto-Print Logic
-   **Problem**: The `autoPrintNewOrders` function creates a new `PrinterManager` instance for every print job, which is inefficient.
-   **Solution**: Reuse a shared `PrinterManager` instance for all auto-print jobs to reduce object creation overhead.
-   **Affected Files**:
    -   The file containing `autoPrintNewOrders`: Modify the function to use a shared or cached `PrinterManager`.

## 2. Medium Priority

### 2.1. Accessibility Audit and Remediation
-   **Problem**: Many views, especially in printer settings, lack accessibility labels and hints, making the app difficult to use with assistive technologies.
-   **Solution**: Perform a full accessibility audit and add `.accessibilityLabel` and `.accessibilityHint` modifiers to all interactive UI elements that are missing them.
-   **Affected Files**:
    -   All views related to printer settings.
    -   Other views identified in the audit.

### 2.2. Enhance Error Handling
-   **Problem**: Error handling for printing and network failures is inconsistent and lacks user-friendly recovery options. Failed prints are only logged and not retried.
-   **Solution**:
    1.  Standardize error messages presented to the user in alerts.
    2.  Implement a user-visible print queue that shows pending and failed print jobs.
    3.  Add a "Retry" button for failed jobs in the queue.
-   **Affected Files**:
    -   `PrinterService.swift`: Add more robust error handling and integrate with the print queue.
    -   Create new views for the print queue UI.

### 2.3. Improve Receipt Formatting
-   **Problem**: Receipt formatting is rigid, with hardcoded ESC/POS commands and a simple fallback to ASCII that can cause character loss.
-   **Solution**:
    1.  Introduce customizable receipt templates (e.g., using a simple template language or configurable sections).
    2.  Add explicit character encoding options in the printer settings to match the printer's capabilities.
-   **Affected Files**:
    -   `PrintFormatter.swift`: Refactor to support templates and different encodings.
    -   Printer settings views: Add UI for template and encoding selection.

## 3. Low Priority

### 3.1. Implement Printer Plugin Architecture
-   **Problem**: The current architecture has printer logic tightly coupled with `PrinterService` and `BluetoothPrinterService`, making it hard to add support for new printer models or SDKs.
-   **Solution**: Abstract the printer implementation details behind a `Printer` protocol. Each supported printer model (or SDK) would have its own class conforming to this protocol.
-   **Affected Files**:
    -   `PrinterService.swift`, `BluetoothPrinterService.swift`: Refactor to use the `Printer` protocol.
    -   Create a new `Printer.swift` file for the protocol definition.
    -   Create new files for each concrete printer implementation.

### 3.2. Adopt Dynamic Type and Enhance VoiceOver
-   **Problem**: The app uses fixed text sizes and does not announce realtime updates via VoiceOver.
-   **Solution**:
    1.  Adopt `Dynamic Type` by using scalable font APIs (e.g., `.font(.headline)`) instead of fixed-size fonts.
    2.  Verify that VoiceOver correctly announces important realtime updates, such as new orders arriving.
-   **Affected Files**:
    -   All views containing text.

### 3.3. Introduce Unit and UI Testing
-   **Problem**: The codebase lacks test coverage, increasing the risk of regressions.
-   **Solution**:
    1.  Write unit tests for critical business logic, including data managers (`OrderManager`) and utility classes (`PrintFormatter`).
    2.  Introduce UI tests for key user flows like placing an order and setting up a printer.
-   **Tasks**:
    -   Set up a test target in Xcode if it doesn't exist.
    -   Add new test files for unit and UI tests.
