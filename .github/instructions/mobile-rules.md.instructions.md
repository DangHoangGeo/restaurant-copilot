---
applyTo: 'mobile/**'
---
## Mobile Application (Swift, SwiftUI) Development Rules

When generating code for the mobile application, adhere to the following standards to ensure code quality, consistency, and maintainability.

### 1. Architecture and Code Organization
- **Architecture**: Use the MVVM (Model-View-ViewModel) architecture for all new features.
  - **Model**: Represents the data and business logic. Should be simple structs or classes.
  - **View**: The UI of the application, built with SwiftUI. Views should be as dumb as possible, reacting to state changes from the ViewModel.
  - **ViewModel**: Acts as a bridge between the Model and the View. It contains the presentation logic and state for the view.
- **File Structure**:
  - Organize files by feature. Each feature should have its own folder containing its Model, View, and ViewModel files.
  - Place reusable views in a `Shared/Views` directory.
  - Place utility functions and extensions in a `Shared/Utils` directory.

### 2. Coding Style and Conventions
- **Swift**:
  - Follow the Swift API Design Guidelines.
  - Use `let` for constants and `var` for variables. Prefer `let` over `var` where possible.
  - Use optional types (`?` and `!`) appropriately. Avoid force unwrapping (`!`) unless you are certain the value is not nil.
  - Use clear and descriptive names for variables, functions, and types.
- **SwiftUI**:
  - Keep views small and focused on a single responsibility.
  - Use `@State` for transient view-specific state.
  - Use `@StateObject` and `@ObservedObject` to manage the lifecycle of ViewModels.
  - Use `@EnvironmentObject` for data that needs to be shared across many views in the hierarchy.

### 3. UI/UX and Styling
- **Styling**: Define colors, fonts, and other style constants in a central place (e.g., an extension on `Color` or a dedicated `Theme` struct) to ensure a consistent look and feel.
- **Layout**: Use SwiftUI layout containers like `VStack`, `HStack`, `ZStack`, and `Grid` to build responsive layouts that adapt to different screen sizes and orientations.
- **Accessibility**: Ensure all UI elements are accessible. Provide labels for controls, and support Dynamic Type.

### 4. Asynchronous Operations
- **Concurrency**: Use Swift's modern concurrency features (`async/await`) for all asynchronous operations, such as network requests.
- **Main Thread**: Ensure all UI updates are performed on the main thread by using `@MainActor`.

### 5. Error Handling
- Use Swift's error handling model (`do-catch`, `try?`, `try!`).
- Provide meaningful error messages to the user when an operation fails.

### 6. Testing
- Write unit tests for ViewModels and business logic.
- Write UI tests for critical user flows.
- Use XCTest for both unit and UI testing.

### 7. Dependencies
- Manage dependencies using Swift Package Manager.
- Add new dependencies only when necessary and with explicit approval.
