# JULES - PRINTER & SETTINGS LOCALIZATION TASK

## OBJECTIVE
Localize all Printer, Settings, and remaining UI components in the SOder iOS app to support English, Japanese, and Vietnamese languages.

## ASSIGNED FILES & COMPONENTS
Your responsibility includes these specific files and their related components:

### PRIMARY FILES TO LOCALIZE:
1. `views/printer/PrinterManager.swift`
2. `views/printer/PrinterSettingsView.swift`
3. `views/printer/AddEditPrinterViews.swift`
4. `views/printer/PrinterModeSelectionView.swift`
5. `views/printer/PrinterConfigurationView.swift`
6. `views/ConnectionStatusBar.swift`
7. `ContentView.swift`
8. `MainTabView.swift` (Settings/Profile related parts only)
9. Complete remaining parts of `views/orders/CheckoutView.swift` (Agent A won't touch this)

### SUPPORTING FILES:
- `services/printer/PrinterService.swift` (for any user-facing error messages)
- `services/printer/BluetoothPrinterService.swift` (for any user-facing messages)
- `services/printer/PrintFormatter.swift` (for any user-facing messages)
- Any other printer-related service files with user-facing strings

## DETAILED STEPS

### STEP 1: ANALYZE CURRENT STRINGS
1. Read each assigned Swift file completely
2. Identify ALL hardcoded strings that are user-facing including:
   - Printer configuration labels
   - Connection status messages
   - Error messages and alerts
   - Settings screen text
   - Bluetooth pairing messages
   - Print job status messages
   - Configuration options
   - Tab bar titles (Settings/Profile related)
   - Any display text in assigned components

### STEP 2: ADD NEW LOCALIZATION KEYS
For each new string you find, add it to ALL THREE localization files:

**File paths:**
- `mobile/SOder/SOder/localization/en.lproj/Localizable.strings`
- `mobile/SOder/SOder/localization/ja.lproj/Localizable.strings` 
- `mobile/SOder/SOder/localization/vi.lproj/Localizable.strings`

**Naming Convention:**
- Use descriptive keys with underscores: `printer_connected`, `bluetooth_pairing_failed`
- Group related strings with prefixes: `printer_`, `bluetooth_`, `settings_`, `connection_`
- Keep keys lowercase with underscores

**Example format:**
```
// Printer specific
"printer_connected" = "Printer Connected";
"printer_disconnected" = "Printer Disconnected";
"printer_add_new" = "Add New Printer";
"printer_configuration" = "Printer Configuration";

// Connection specific
"connection_status_online" = "Online";
"connection_status_offline" = "Offline";
"connection_reconnecting" = "Reconnecting...";

// Settings specific
"settings_title" = "Settings";
"settings_language" = "Language";
"settings_printers" = "Printers";
```

### STEP 3: UPDATE SWIFT FILES
For each Swift file:

1. **Add LocalizationManager import** (if not present):
```swift
@EnvironmentObject private var localizationManager: LocalizationManager
```

2. **Replace ALL hardcoded strings** with localized versions:
```swift
// Before:
Text("Printer Connected")

// After:  
Text("printer_connected".localized)
```

3. **Handle error messages and alerts**:
```swift
// Before:
.alert("Bluetooth Error", isPresented: $showError) {
    Button("OK") { }
} message: {
    Text("Failed to connect to printer")
}

// After:
.alert("bluetooth_error".localized, isPresented: $showError) {
    Button("ok".localized) { }
} message: {
    Text("printer_connection_failed".localized)
}
```

### STEP 4: COMPLETE CHECKOUT VIEW
Finish localizing `CheckoutView.swift` where Agent A left off:

1. Localize remaining hardcoded strings in checkout flow
2. Focus on discount section, price breakdown, and action buttons
3. Ensure all payment-related terminology is properly localized
4. Add any missing localization keys to all three language files

### STEP 5: TRANSLATIONS

**Japanese translations** - Use these guidelines:
- Printer terms: プリンター (printer), 印刷 (print), 接続 (connection)
- Bluetooth terms: Bluetooth, ペアリング (pairing), 接続中 (connecting)
- Settings terms: 設定 (settings), 言語 (language), プロフィール (profile)
- Status terms: オンライン (online), オフライン (offline), 接続中 (connecting)

**Vietnamese translations** - Use these guidelines:
- Printer terms: máy in (printer), in (print), kết nối (connection)
- Bluetooth terms: Bluetooth, ghép nối (pairing), đang kết nối (connecting)
- Settings terms: cài đặt (settings), ngôn ngữ (language), hồ sơ (profile)
- Status terms: trực tuyến (online), ngoại tuyến (offline), đang kết nối (connecting)

### STEP 6: TESTING CHECKLIST
After completing localization:

1. All printer-related UI text is localized
2. Connection status messages work in all languages
3. Error messages and alerts are properly translated
4. Settings screens are fully localized
5. CheckoutView is completely localized
6. No hardcoded strings remain in assigned files

## IMPORTANT CONSTRAINTS

### DO NOT MODIFY:
- Any files assigned to Agent A (kitchen views, orders views, status components)
- Core localization infrastructure (LocalizationManager, LanguageSelectorView) 
- LoginView.swift (already completed)
- Any kitchen or order management related files

### COORDINATION WITH AGENT A:
- Both agents will add keys to the same .strings files
- Use different key prefixes to avoid conflicts
- Agent A uses: `kitchen_`, `order_`, `status_`
- You use: `printer_`, `bluetooth_`, `connection_`, `settings_`, `checkout_`

### COMMIT STRATEGY:
- Make atomic commits per view file
- Use commit messages like: "Localize PrinterSettingsView for EN/JA/VI"
- Always commit localization strings first, then Swift file changes
- Pull latest changes before committing to avoid merge conflicts

## QUALITY REQUIREMENTS

1. **Zero Hardcoded Strings**: Every user-facing string must use localization
2. **Consistent Key Naming**: Follow the established naming convention with your prefixes
3. **Complete Coverage**: All three languages must have every key
4. **Technical Accuracy**: Printer/Bluetooth terminology must be correct
5. **Error Handling**: All error messages must be localized

## EXAMPLE IMPLEMENTATION

Here's how to localize a printer configuration view:

```swift
// Before localization:
struct PrinterConfigView: View {
    @State private var showError = false
    
    var body: some View {
        VStack {
            Text("Printer Configuration")
            Button("Connect Printer") { }
            if showError {
                Text("Failed to connect")
                    .foregroundColor(.red)
            }
        }
        .alert("Connection Error", isPresented: $showError) {
            Button("Retry") { }
            Button("Cancel") { }
        }
    }
}

// After localization:
struct PrinterConfigView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @State private var showError = false
    
    var body: some View {
        VStack {
            Text("printer_configuration".localized)
            Button("printer_connect".localized) { }
            if showError {
                Text("printer_connection_failed".localized)
                    .foregroundColor(.red)
            }
        }
        .alert("connection_error".localized, isPresented: $showError) {
            Button("retry".localized) { }
            Button("cancel".localized) { }
        }
    }
}
```

## SPECIAL FOCUS: CHECKOUT VIEW COMPLETION

Complete the CheckoutView localization by focusing on:

1. **Discount Section**:
   - "Enter discount code" → "discount_code_placeholder"
   - "Percentage" / "Fixed Amount" → "discount_percentage" / "discount_fixed_amount"
   - All discount-related labels and buttons

2. **Price Breakdown**:
   - "After Discount" → "after_discount"
   - Tax percentage display
   - Total amount formatting

3. **Action Buttons**:
   - "Complete Checkout" → "complete_checkout" 
   - "Print Receipt Only" → "print_receipt_only"
   - "Processing..." → "processing"

## DELIVERABLES
1. All assigned Swift files fully localized
2. CheckoutView completely localized
3. New localization keys added to all three .strings files using proper prefixes
4. Verification that no hardcoded strings remain in assigned files
5. Clean commit history with descriptive messages

Start with `PrinterManager.swift` and `PrinterSettingsView.swift` as they likely contain the most user-facing strings, then complete the CheckoutView, and finish with the remaining files.
