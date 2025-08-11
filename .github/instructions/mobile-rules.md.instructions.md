---
applyTo: 'mobile/**'
---
## **SOder iOS App: Simple Development Rules**

Follow these simple rules when writing or changing code. This keeps our app high-quality and easy to maintain.

### **1. How We Build Features (Our App's Structure)**

-   **Model**: Simple `Codable` structs for our data (like `Order` or `MenuItem`). Find them in the `models/` folder.
-   **View**: SwiftUI files that show the UI. Views should only be for showing things and getting user taps. **No business logic in Views.** Break big views into smaller ones.
-   **Manager (The "Brain")**: These are the brains for each feature (like `OrderManager`, `PrinterManager`). They hold the data and do the work.
    -   **Rule**: Always use shared managers with `@EnvironmentObject`. Do not create new ones like `OrderManager()`.

### **2. How to Style the UI (Our Design Rules)**

We must have a consistent UI. All new code **must** use our design system.

-   **Colors**:
    -   **Rule**: **NEVER** use hardcoded colors like `Color.blue` or `Color.red`.
    -   **Rule**: Always use our app's color palette from `DesignSystem.swift`. For example: `Color.appPrimary`, `Color.appSurface`.
-   **Fonts**:
    -   **Rule**: **NEVER** use custom font sizes like `.font(.system(size: 15))`.
    -   **Rule**: Always use a font from `DesignSystem.swift`. For example: `.font(.cardTitle)`, `.font(.bodyMedium)`.
-   **Spacing**:
    -   **Rule**: Use multiples of 8 for all padding and spacing (e.g., `.padding(16)`). This keeps the layout clean.
-   **Layout**:
    -   **Rule**: Make sure the layout works well on both iPhone and iPad. Use `@Environment(\.horizontalSizeClass)` to make different layouts if needed.
    -   **Rule**: For long lists of items, always use `LazyVStack` or `LazyVGrid` for good performance.

### **3. State and Data Handling**

-   **Property Wrappers**:
    -   `@State`: For simple state inside **one** View (like showing an alert).
    -   `@EnvironmentObject`: To use a **shared manager** for the whole app (like `OrderManager`).
-   **Async Code (Networking)**:
    -   **Rule**: Use `async/await` for all network requests or slow tasks.
    -   **Rule**: All UI updates **must** happen on the main thread. Use `@MainActor` on your functions to ensure this.

### **4. Code Quality**

-   **Previews**: Every View **must** have a `#Preview` block so we can see how it looks without running the whole app.
-   **Accessibility**: Make the app easy for everyone to use.
    -   **Rule**: All buttons and controls must have an `.accessibilityLabel("a_clear_description_key".localized)`.

### **5. Localization (The Most Important Rule)**

This is the most important rule for our UI.

-   **Golden Rule**: **NO** user-facing text is allowed to be hardcoded in the Views. You cannot write `Text("Hello World")`.

-   **The Correct Process**:
    1.  Open the file: `mobile/SOder/SOder/localization/en.lproj/Localizable.strings`.
    2.  Find a key that matches what you need.
    3.  If a key does not exist, **add a new one**. For example:
        ```
        "my_new_button_title" = "My New Button";
        ```
    4.  In your Swift code, use the key with the `.localized` extension.
        ```swift
        // Correct way
        Text("my_new_button_title".localized)
        
        // WRONG WAY
        // Text("My New Button") 
        ```

-   **Final Check**: Before you finish, search your changed files for any plain text in `Text("...")` to make sure you have followed this rule.
