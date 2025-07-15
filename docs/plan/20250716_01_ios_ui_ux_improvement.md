### **Task 1  Implement App-Wide UI/UX Consistency with a Design System**

*   **Scope:**
    This task covers the creation of a foundational design system and its systematic application across the *entire* application. This includes all screens: Onboarding, Orders, Kitchen Display System (KDS), Point of Sale (POS), Checkout, and all Settings/Printer configuration views.

*   **Problem:**
    The application's UI is inconsistent. It uses a mixture of default SwiftUI components, hardcoded colors, and disparate styles across different features. This creates a disjointed and unprofessional user experience that is also difficult to maintain or theme.

*   **Solution:**
    A centralized design system will be established with shared tokens for colors, fonts, and spacing. Reusable styles for core components (buttons, text fields, cards) will be created. This system will then be implemented progressively across all application screens, ensuring every view adheres to a single, professional visual identity.

*   **Implement guide:**

    **Phase 1: Create the Design System Foundation**
    1.  In the `mobile/SOder/SOder/util/` directory, create a new Swift file named `DesignSystem.swift`.
    2.  **Define Colors:** Inside the file, create a `Color` extension with a standardized application palette.
        ```swift
        // In mobile/SOder/SOder/util/DesignSystem.swift
        import SwiftUI

        public extension Color {
            static let appPrimary = Color("appPrimary") // Blue for actions
            static let appSecondaryText = Color("appSecondaryText") // Grey for subtitles
            static let appAccent = Color("appAccent") // Orange for highlights
            static let appBackground = Color("appBackground") // Light grey screen background
            static let appSurface = Color("appSurface") // White for cards
            static let appError = Color("appError")     // Red
            static let appSuccess = Color("appSuccess")   // Green
            static let appWarning = Color("appWarning")   // Orange
            static let appDisabled = Color("appDisabled") // Light grey
        }
        // In Assets.xcassets, create a new Color Set for each of these and add the hex values:
        // appPrimary: #007AFF, appSecondaryText: #8A8A8E, appAccent: #FF9500, etc.
        ```
    3.  **Define Typography:** In the same file, create a `Font` extension for a consistent type scale.
        ```swift
        public extension Font {
            static let displayTitle = Font.system(size: 34, weight: .bold)
            static let cardTitle = Font.system(size: 22, weight: .bold)
            static let sectionHeader = Font.system(size: 17, weight: .semibold)
            static let bodyMedium = Font.system(size: 17, weight: .medium)
            static let captionBold = Font.system(size: 12, weight: .bold)
        }
        ```
    4.  **Define Component Styles:** In the same file, create reusable styles for buttons and text fields.
        ```swift
        public struct PrimaryButtonStyle: ButtonStyle { /* ... implementation ... */ }
        public struct SecondaryButtonStyle: ButtonStyle { /* ... implementation ... */ }
        public struct AppTextFieldStyle: TextFieldStyle { /* ... implementation ... */ }
        ```

    **Phase 2: Refactor High-Traffic Screens (Login, Orders, KDS)**
    1.  **LoginView:**
        *   Open `LoginView.swift`.
        *   Replace all hardcoded colors with their `Color.app...` counterparts.
        *   Apply `.textFieldStyle(AppTextFieldStyle())` to all `TextField`s.
        *   Apply `.buttonStyle(PrimaryButtonStyle())` to the main "Sign In" button.
    2.  **OrdersView & Components:**
        *   Open `OrdersView.swift` and `StatusComponents.swift`.
        *   In `FilterChip`, replace hardcoded colors with design system tokens (e.g., `isSelected ? .appPrimary : .appPrimary.opacity(0.1)`).
        *   In `OrderRowView` and `SidebarOrderRowView`, apply the new `Font` styles (e.g., `.font(.cardTitle)`) to titles and other text elements. Ensure consistent padding.
    3.  **KitchenBoard Components:**
        *   Open `KitchenBoardComponents.swift`.
        *   Refactor `KitchenItemCard`, `CompactKitchenItemCard`, and other related views.
        *   Replace all hardcoded status colors (`.blue`, `.orange`, `.red`) with `.appPrimary`, `.appWarning`, and `.appError`.
        *   Apply the standardized `Font` styles to ensure text hierarchy is consistent with the rest of the app.

    **Phase 3: Refactor POS and Checkout Flow**
    1.  **SelectTableView, MenuSelectionView, AddItemDetailView:**
        *   Open the relevant files in `mobile/SOder/SOder/views/pos/`.
        *   Apply `AppTextFieldStyle` to search bars and note fields.
        *   Ensure all buttons use the `PrimaryButtonStyle` or `SecondaryButtonStyle`.
        *   Standardize the font styles for menu item names, descriptions, and prices.
    2.  **CheckoutView:**
        *   Open `CheckoutView.swift`.
        *   Refactor the payment method buttons to use a consistent selection style.
        *   Apply `PrimaryButtonStyle` to the "Complete Checkout" button.
        *   Apply `SecondaryButtonStyle` to the "Print Receipt Only" button.

    **Phase 4: Refactor All Settings Screens**
    1.  **PrinterConfigurationView, AddEditPrinterViews, etc.:**
        *   Go through all files in `mobile/SOder/SOder/views/printer/`.
        *   These views are mostly `Form`-based. While forms have standard styling, ensure any custom elements within them (buttons, status indicators) use the design system.
        *   Replace hardcoded colors in `PrinterConfigRowView` (e.g., `.green`) with `.appSuccess`.
        *   Ensure all buttons for actions like "Test Connection" or "Save" follow the application's button styles.

*   **Expected Goal:**
    The entire application will have a consistent, professional, and maintainable UI. All screens will share the same color palette, typographic scale, and component styles. Future design changes can be made efficiently by modifying the central `DesignSystem.swift` file.

---
