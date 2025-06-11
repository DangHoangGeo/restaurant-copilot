# CODEX - KITCHEN & ORDERS LOCALIZATION TASK

## OBJECTIVE
Localize all Kitchen and Orders related views in the SOder iOS app to support English, Japanese, and Vietnamese languages.

## ASSIGNED FILES & COMPONENTS
Your responsibility includes these specific files and their related components:

### PRIMARY FILES TO LOCALIZE:
1. `views/kitchen/KitchenBoardView.swift`
2. `views/kitchen/KitchenBoardComponents.swift` 
3. `views/kitchen/KitchenItemsListView.swift`
4. `views/kitchen/DebugKitchenCard.swift`
5. `views/orders/OrdersView.swift`
6. `views/orders/OrderDetailView.swift`
7. `views/OrderItemDetailView.swift`
8. `views/ItemDetailView.swift`
9. `views/components/StatusComponents.swift`
10. `views/components/AutoPrintStatusView.swift`

### SUPPORTING FILES:
- `views/kitchen/KitchenBoardModels.swift` (for any display strings)
- `MainTabView.swift` (for tab navigation titles)

## DETAILED STEPS

### STEP 1: ANALYZE CURRENT STRINGS
1. Read each assigned Swift file completely
2. Identify ALL hardcoded strings that are user-facing including:
   - Button labels
   - Status messages  
   - Error messages
   - Navigation titles
   - Alert titles and messages
   - Placeholder text
   - Tab bar items
   - Table headers
   - Any display text

### STEP 2: ADD NEW LOCALIZATION KEYS
For each new string you find, add it to ALL THREE localization files:

**File paths:**
- `mobile/SOder/SOder/localization/en.lproj/Localizable.strings`
- `mobile/SOder/SOder/localization/ja.lproj/Localizable.strings` 
- `mobile/SOder/SOder/localization/vi.lproj/Localizable.strings`

**Naming Convention:**
- Use descriptive keys with underscores: `kitchen_order_ready`, `order_status_completed`
- Group related strings with prefixes: `kitchen_`, `order_`, `status_`
- Keep keys lowercase with underscores

**Example format:**
```
// Kitchen specific
"kitchen_order_ready" = "Order Ready";
"kitchen_prepare_item" = "Prepare Item";
"kitchen_mark_complete" = "Mark Complete";

// Order specific  
"order_new" = "New";
"order_in_progress" = "In Progress";
"order_completed" = "Completed";
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
Text("Order Ready")

// After:  
Text("kitchen_order_ready".localized)
```

3. **Handle string interpolation**:
```swift
// Before:
Text("Table \(tableNumber)")

// After:
Text("table_number".localized(with: tableNumber))
```

### STEP 4: TRANSLATIONS

**Japanese translations** - Use these guidelines:
- Kitchen terms: キッチン (kitchen), 調理 (cooking), 完了 (complete)
- Order terms: オーダー (order), 注文 (order), テーブル (table)
- Status terms: 新規 (new), 進行中 (in progress), 完了 (completed)

**Vietnamese translations** - Use these guidelines:
- Kitchen terms: bếp (kitchen), nấu ăn (cooking), hoàn thành (complete)  
- Order terms: đơn hàng (order), bàn (table)
- Status terms: mới (new), đang thực hiện (in progress), hoàn thành (completed)

### STEP 5: TESTING CHECKLIST
After completing localization:

1. Ensure all user-visible text uses `.localized`
2. No hardcoded English strings remain
3. All new keys exist in all three language files
4. Translations are contextually appropriate
5. String interpolation works correctly
6. UI layout accommodates longer text (especially Vietnamese)

## IMPORTANT CONSTRAINTS

### DO NOT MODIFY:
- Any files assigned to Agent B (printer views, checkout, connection status)
- Core localization infrastructure (LocalizationManager, LanguageSelectorView)
- Any authentication or login related files

### COMMIT STRATEGY:
- Make atomic commits per view file
- Use commit messages like: "Localize KitchenBoardView for EN/JA/VI"
- Always commit localization strings first, then Swift file changes

## QUALITY REQUIREMENTS

1. **Zero Hardcoded Strings**: Every user-facing string must use localization
2. **Consistent Key Naming**: Follow the established naming convention  
3. **Complete Coverage**: All three languages must have every key
4. **Contextual Accuracy**: Translations must be appropriate for restaurant context
5. **UI Compatibility**: Ensure longer text doesn't break layouts

## EXAMPLE IMPLEMENTATION

Here's how to localize a typical view:

```swift
// Before localization:
struct KitchenOrderCard: View {
    var body: some View {
        VStack {
            Text("Order #\(orderNumber)")
            Text("Table 5")
            Button("Mark Ready") { }
        }
    }
}

// After localization:
struct KitchenOrderCard: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    var body: some View {
        VStack {
            Text("order_number".localized(with: orderNumber))
            Text("table_number".localized(with: 5))
            Button("kitchen_mark_ready".localized) { }
        }
    }
}
```

## DELIVERABLES
1. All assigned Swift files fully localized
2. New localization keys added to all three .strings files  
3. Verification that no hardcoded strings remain in your assigned files
4. Clean commit history with descriptive messages

Start with `KitchenBoardView.swift` as it's likely the most complex, then work through the other files systematically.
