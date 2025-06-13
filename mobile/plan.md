# SOder iOS App: Improvement Plan

This document outlines a plan for improvements to the SOder iOS application based on the findings in the `review.md` report. The plan prioritizes critical functional gaps, security enhancements, UI/UX refinements, and overall stability.

## 1. Critical & High Priority Improvements

### 1.1. Implement In-App Order Creation & Modification (Manual Table Orders)

*   **Issue:** The most significant gap identified is the lack of functionality for staff to create new orders or add/modify items for a table directly within the iOS app. This severely limits its utility as a primary staff tool.
*   **Plan:**
    1.  **Design Phase:**
        *   Define detailed user stories and workflows for:
            *   Starting a new order for a selected table.
            *   Browsing menu categories and items.
            *   Adding items to an order (with quantity, size, toppings, notes).
            *   Modifying items in an unconfirmed order (change quantity, remove, edit notes).
            *   Sending a confirmed order to the kitchen.
        *   Design intuitive UI/UX for these processes, considering both iPhone and iPad layouts. This might involve:
            *   A dedicated "POS" or "New Order" tab/section.
            *   Functionality within `OrdersView` to initiate an order for a table.
            *   Enhanced capabilities in `OrderDetailView` to add/modify items before kitchen confirmation.
    2.  **Backend Adjustments (if necessary):**
        *   Review if any Supabase database functions or RLS policies need adjustments to support staff-initiated order creation/item additions (e.g., ensuring correct `user_id` or `employee_id` is associated).
    3.  **iOS Implementation:**
        *   Develop new SwiftUI views for table selection, menu browsing, item customization, and order summary.
        *   Extend `OrderManager.swift` (or create a new service, e.g., `POSService.swift`) to include functions for:
            *   `createOrder(tableId: String, guestCount: Int) -> Order`
            *   `addItemToOrder(orderId: String, menuItemId: String, quantity: Int, notes: String?, sizeId: String?, toppingIds: [String]?)`
            *   `updateOrderItemInDraft(orderItemId: String, newQuantity: Int?, newNotes: String?)`
            *   `confirmOrderToKitchen(orderId: String)`
        *   Integrate these new views and logic into the existing navigation structure.
    4.  **Testing:** Rigorous testing of the entire order-taking flow.

### 1.2. Enhance Accessibility (A11y)

*   **Issue:** General lack of explicit accessibility modifiers, potentially hindering usability for staff relying on assistive technologies.
*   **Plan:**
    1.  **Full Audit:** Conduct a thorough accessibility audit of all views and user flows using VoiceOver and other iOS accessibility tools.
    2.  **Implement Modifiers:**
        *   Add `.accessibilityLabel(_:)` to all icon-only buttons, custom interactive controls, and unclear UI elements.
        *   Use `.accessibilityHint(_:)` to provide context for complex interactions.
        *   Ensure custom views (`SidebarOrderRowView`, `FilterChip`, `EnhancedStatusBadge`, etc.) correctly expose accessibility elements and information.
        *   Manage focus order logically, especially in forms and complex views.
    3.  **Dynamic Content:** Ensure real-time UI updates (e.g., in `OrdersView`, `KitchenBoardView`) are announced clearly by VoiceOver without being disruptive.
    4.  **Color Contrast:** Verify sufficient color contrast for text and important UI elements.
    5.  **Testing:** Include accessibility testing as a standard part of the development and QA process.

### 1.3. Comprehensive & User-Friendly Error Handling

*   **Issue:** Error handling is present but inconsistent. Users need clear, actionable feedback for failures.
*   **Plan:**
    1.  **Centralized Strategy:** Define a centralized error presentation strategy (e.g., a global error banner, standardized alert views).
    2.  **Review & Refine:**
        *   Audit all network calls (`SupabaseManager`, `PrinterService`), data processing (`OrderManager`), and critical operations (checkout, printing) for potential errors.
        *   Replace generic error messages with specific, localized, and user-understandable explanations.
        *   Provide actionable advice where possible (e.g., "Check network connection," "Ensure printer is online and has paper").
    3.  **User Feedback:** Implement clear visual feedback for operations like printing, status updates (success, failure, pending).

## 2. Medium Priority Improvements

### 2.1. Refine Printing Flows & UI

*   **Issue:** Printing is complex; UI clarity and error recovery can be improved.
*   **Plan:**
    1.  **Printer Status Visibility:** Ensure printer connection status (and selected printer name) is persistently visible in relevant views (e.g., a status bar or header in `OrdersView`, `CheckoutView`).
    2.  **Configuration UI:** Simplify the printer setup flow in `PrinterSettingsView`. Make selection of kitchen/checkout printers in dual mode more intuitive. Provide clearer validation feedback for printer IP/port.
    3.  **Print Job Management:** For auto-printing and manual prints, provide better feedback on print job status (queued, printing, success, failed). Consider a basic client-side print queue for retrying failed jobs or notifying users.
    4.  **Error Recovery:** When a print fails, offer clear options: retry, select a different printer, or cancel.

### 2.2. Strengthen Security Measures

*   **Issue:** Generally good, but some areas need tightening or further investigation.
*   **Plan:**
    1.  **Role-Based Access Control (RBAC):**
        *   Thoroughly investigate how `userRole` (from JWT) is currently used or if it's intended for future use.
        *   If roles should restrict access to features/data (e.g., only managers access settings), these checks should primarily be enforced server-side (Supabase RLS or database functions). Client-side UI changes based on role are for UX.
    2.  **Session Management:** Review `SupabaseManager` for robust handling of token expiration, especially during critical operations. Implement clear re-authentication flows if a session expires.
    3.  **Local Data Storage:** While no highly sensitive data (like passwords) was found in `UserDefaults`, re-evaluate if any of the printer configuration or restaurant settings data warrants Keychain storage if deemed sensitive in specific deployment contexts.
    4.  **Secure Input:** Ensure all text fields (especially in `LoginView` and any future forms) disable autocorrect and autocapitalization for sensitive fields like passwords or potentially emails/subdomains if desired. `LoginView` already does this for some fields.

### 2.3. UI/UX Polish & Consistency

*   **Issue:** While generally functional, some areas can be polished for better intuitiveness and consistency.
*   **Plan:**
    1.  **Adaptive Layouts:** Complete a full audit to ensure all views, including `CheckoutView` and settings panes, are optimized for both iPhone and iPad.
    2.  **Real-time Feedback:** Enhance visual cues for real-time data updates beyond "NEW" badges. Ensure `ConnectionStatusBar.swift` (if it exists for this purpose) is effectively used.
    3.  **Interaction Consistency:** Review navigation patterns, button styles, terminology, and placement of common actions across the app for uniformity.
    4.  **Empty States:** Ensure all lists and data-dependent views have informative empty states (e.g., `EmptyOrdersView` is a good example; ensure this pattern is widespread).
    5.  **Loading States:** Provide clear loading indicators (like those in `OrdersView`) during any data fetching or processing operation that might take noticeable time.

### 2.4. Testing Strategy Enhancement

*   **Issue:** No explicit test files (beyond basic project templates) were visible in the `ls` output for `SOderTests` or `SOderUITests`.
*   **Plan:**
    1.  **Unit Tests:** Implement unit tests for:
        *   Manager classes (`OrderManager`, `PrinterManager`, `SupabaseManager`, `PrinterSettingsManager`): Test business logic, state changes, data manipulation.
        *   `PrintFormatter`: Test ESC/POS command generation for various inputs.
        *   ViewModel logic (if any distinct ViewModels are introduced).
    2.  **Integration Tests:**
        *   Test interactions between managers (e.g., `OrderManager` triggering `PrinterManager`).
        *   Test Supabase interactions (mocking the Supabase client or using a test instance).
    3.  **UI Tests:**
        *   Create UI tests for critical user flows: login, navigating orders, checkout process, printer setup.
        *   Focus on testing UI state changes in response to data updates and user interactions.
    4.  **CI/CD:** Integrate testing into a CI/CD pipeline to ensure regressions are caught early.

## 3. Low Priority Improvements

### 3.1. Code Style & Linting

*   **Plan:** Introduce a Swift linter (like SwiftLint) and auto-formatter (like SwiftFormat) to enforce code style consistency across the project. Configure rules and integrate into the development workflow.

### 3.2. Model Centralization

*   **Plan:** Review and ensure all shared domain models (`Order`, `OrderItem`, etc.) are located in the `mobile/SOder/SOder/models/` directory for better organization.

### 3.3. Advanced Bluetooth Printer Features

*   **Plan:** The `BluetoothPrinterManager.swift` (from `docs/mobile/printer-related-code.md`, though not directly in the main project files read) provided a more complex Bluetooth implementation. If robust Bluetooth printing is a priority, this code could be integrated and enhanced, including UI for discovery and pairing if needed beyond system Bluetooth settings.

---
This plan provides a roadmap for addressing the identified issues and enhancing the SOder iOS app. Priorities can be adjusted based on business needs and development resources.
