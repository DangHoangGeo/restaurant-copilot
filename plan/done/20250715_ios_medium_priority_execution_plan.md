# iOS Medium Priority Execution Plan - 2025-07-15

This document provides a detailed step-by-step execution plan for implementing the Medium Priority tasks in the iOS improvement roadmap. Follow each section sequentially.  

## 1. Accessibility Audit and Remediation (Task 2.1)

**Research validation:** Verified that printer-related views and services live under `mobile/SOder/SOder/views/printer` and `mobile/SOder/SOder/services/printer`. The main printer settings UI is in `PrinterSettingsView.swift`, backed by `PrinterSettingsManager.swift`.

### 1.1. Prepare Audit Scope
- Use terminal in project root:
  ```zsh
  grep -R "struct .*View" mobile/SOder/SOder/views/printer
  grep -R "Button\|Toggle\|TextField\|Picker\|List" -n mobile/SOder/SOder/views
  ```
- Confirm list of views:
  - `PrinterSettingsView.swift`
  - Any custom dialogs or sheets under `views/printer/`.

### 1.2. Perform Accessibility Scan
1. Open the project in Xcode.  
2. Enable Accessibility Inspector: Debug > Accessibility > Accessibility Inspector.  
3. For each view identified, launch the app in the simulator or device and inspect:
   - Confirm labels read correctly.
   - Check element hints & traits.

### 1.3. Add Missing Modifiers
1. In code, for each interactive element missing voiceover data:
   - Add `.accessibilityLabel("...descriptive text...")`.
   - Add `.accessibilityHint("...guidance text...")` if additional context is needed.
2. For images or icons, add `.accessibilityHidden(true)` or proper labeling.
3. Validate dynamic text: ensure `Dynamic Type` compatibility.

### 1.4. Review and Verify
1. Run Accessibility Inspector again on all updated screens.  
2. Fix any remaining missing or incorrect labels/hints.  
3. Commit changes with clear commit messages per view.

## 2. Enhance Error Handling (Task 2.2)

**Research validation:** The file `mobile/SOder/SOder/services/printer/PrinterService.swift` contains an existing `PrinterError` enum. The current implementation does not queue print jobs; it attempts to connect, send, and disconnect for each print request individually.

### 2.1. Enhance Existing `PrinterError` Enum
1. Open `PrinterService.swift`.
2. Review the existing `PrinterError` enum.
3. Add new cases to cover more specific scenarios, such as `jobFailed`, `queueFull`, or `invalidJobData`.
4. Ensure all new and existing cases provide user-friendly `errorDescription` and `recoverySuggestion` strings for display in UI alerts.

### 2.2. Implement Print Queue
1. Create a new file `mobile/SOder/SOder/services/printer/PrintQueueManager.swift`.
2. Define a `PrintJob` struct within this file:
   ```swift
   struct PrintJob: Identifiable, Codable {
       let id: UUID
       var data: Data
       var status: Status
       var creationDate: Date
       var attempts: Int
       
       enum Status: String, Codable {
           case pending, printing, failed, completed
       }
   }
   ```
3. Create a `PrintQueueManager` class as an `ObservableObject` singleton.
   - It should have a `@Published var jobs: [PrintJob] = []`.
   - Implement methods: `enqueue(data: Data)`, `retryJob(withId: UUID)`, and a private `processNextJob()`.
   - Add logic to persist the queue to `UserDefaults` to survive app restarts.

### 2.3. Integrate Queue with `PrinterService`
1. Modify `PrinterService` to no longer be called directly by the UI for print tasks.
2. Instead of methods like `printKitchenOrder`, `PrinterService` should have a method like `executePrintJob(_ job: PrintJob) async throws`.
3. The `PrintQueueManager` will call this method. On success, it updates the job status to `.completed`. On failure, it updates it to `.failed`, increments the attempt count, and logs the error from the enhanced `PrinterError` enum.
4. Refactor all existing calls (e.g., in `OrdersView`, `CheckoutView`) from `PrinterService.shared.print...` to `PrintQueueManager.shared.enqueue(...)`.

### 2.4. Build Print Queue UI
1. Create a new SwiftUI view `mobile/SOder/SOder/views/printer/PrintQueueView.swift`.
2. The view should observe the `PrintQueueManager` and display the list of jobs.
3. For jobs with a `.failed` status, display the error message from the `PrintJob` and provide a "Retry" button that calls `PrintQueueManager.shared.retryJob(withId:)`.
4. Add a navigation link to this view from `PrinterSettingsView.swift`.

## 3. Improve Receipt Formatting (Task 2.3)

**Research validation:** The file `mobile/SOder/SOder/services/printer/PrintFormatter.swift` currently uses hardcoded ESC/POS commands and a complex, non-reusable structure for generating receipt content. It does not support templates or configurable encodings.

### 3.1. Introduce a Template Engine
1. Create a new file `mobile/SOder/SOder/services/printer/TemplateRenderer.swift`.
2. Implement a `TemplateRenderer` class. It will take a template string and a dictionary `[String: Any]` as input.
3. The renderer will replace placeholders like `{{order.id}}` or `{{items_loop}}...{{/items_loop}}` with actual data.
4. Create a default `receipt_template.txt` file in the project's resources. Example:
   ```
   [CENTER][BOLD]Receipt[/BOLD][/CENTER]
   Order: {{order.id}}
   Table: {{order.table_name}}
   
   [SEPARATOR]
   
   {{#items}}
   [ROW]
   [COL_LEFT]{{quantity}}x {{name}}[/COL_LEFT]
   [COL_RIGHT]¥{{price}}[/COL_RIGHT]
   [/ROW]
   {{/items}}
   
   [SEPARATOR]
   
   [RIGHT]Total: ¥{{total_price}}[/RIGHT]
   ```

### 3.2. Refactor `PrintFormatter`
1. Modify `PrintFormatter.swift` to use the new `TemplateRenderer`.
2. Remove the large, hardcoded `generate...Content` methods.
3. Create a single method, `format(template: String, data: [String: Any], encoding: String.Encoding) -> Data`.
4. This method will:
   - Use `TemplateRenderer` to produce the final string.
   - Convert the string to `Data` using the specified encoding.
   - Prepend and append the necessary ESC/POS commands for initialization and cutting, which can be mapped from the template's custom tags (e.g., `[CENTER]`).

### 3.3. Update Printer Settings UI
1. Open `mobile/SOder/SOder/views/printer/PrinterSettingsView.swift`.
2. Add a new section for "Receipt Customization".
3. Add a `Picker` for `String.Encoding` options (e.g., "UTF-8", "ShiftJIS").
4. Add a `TextField` or `TextEditor` to allow users to paste or edit their own receipt template.
5. Store both the selected encoding and the custom template string in `PrinterSettingsManager` and `UserDefaults`.

### 3.4. Update Print Calls
1. In the new `PrintQueueManager`, when creating a `PrintJob`, call the refactored `PrintFormatter.format(...)` method.
2. Pass the template and encoding from `PrinterSettingsManager` to the formatter.

---

**Next Steps**: Commit each section as a separate pull request. Include references to relevant markdown documentation. Assign reviewers for accessibility, error handling, and formatting respectively.
