# iOS Codebase Review

## Overview
This review covers the `SOder` iOS application located in `mobile/SOder`. The project uses SwiftUI and manages restaurant orders via Supabase. Real‑time updates, printing flows and localization are implemented.

## Potential Bugs and Issues

### Duplicate `OrderManager` Instances
Both `OrdersView` and `KitchenBoardView` create their own `@StateObject` of `OrderManager` which triggers duplicate network calls and realtime subscriptions on app launch:
```
@StateObject private var orderManager = OrderManager()
```
from `OrdersView.swift`【F:mobile/SOder/SOder/views/orders/OrdersView.swift†L4-L4】 and
`KitchenBoardView.swift`【F:mobile/SOder/SOder/views/kitchen/KitchenBoardView.swift†L7-L9】. A shared instance via `EnvironmentObject` would reduce overhead.

### Credentials Storage Keys
`LoginView` stores the last successful credentials under `lastSubdomain` / `lastEmail` but attempts to load `lastUsedSubdomain` / `lastUsedEmail`:
```
subdomain = UserDefaults.standard.string(forKey: "lastSubdomain") ?? ""
...
if let savedSubdomain = defaults.string(forKey: "lastUsedSubdomain") {
    self.subdomain = savedSubdomain
}
```
【F:mobile/SOder/SOder/views/auth/LoginView.swift†L128-L142】
As a result, stored credentials are never restored. Using consistent keys fixes the issue.

### Unneeded Optional Handling
`KitchenBoardView.computeCategoryGrouping()` treats `orderItem.quantity` as optional even though it is defined as `Int`. This is benign but unnecessary and indicates potential model inconsistencies【F:mobile/SOder/SOder/views/kitchen/KitchenBoardView.swift†L182-L205】.

### Auto-print Persistence
`OrderManager` only keeps `printedNewOrders` and `printedReadyItems` in memory. Upon app restart, previously printed orders may print again. Consider persisting this history if repeated printing is a problem.

## Security Evaluation

* **JWT Parsing and Session Handling** – `SupabaseManager` parses JWT claims for the restaurant and role and clears state on failure【F:mobile/SOder/SOder/services/SupabaseManager.swift†L43-L69】. Tokens are not persisted, which is safer. If persistence is required, Keychain storage is recommended.
* **Network Calls** – All database calls use the Supabase client over HTTPS. Use Supabase RPC functions (`get_active_orders_with_details` etc.) to enforce RLS on the server and limit payload size.
* **User Defaults** – Only non‑sensitive values (language choice, auto-print flag) are stored. No plain text passwords are kept.

## UI/UX Observations

* **Split‑View vs NavigationStack** – `OrdersView` adapts for iPad using `NavigationSplitView` while iPhone uses `NavigationStack`【F:mobile/SOder/SOder/views/orders/OrdersView.swift†L32-L48】. Layouts generally follow HIG but some custom components may lack accessibility modifiers.
* **Real‑time Updates** – Realtime channels reconnect on authentication and provide order change events【F:mobile/SOder/SOder/services/OrderManager.swift†L84-L111】【F:mobile/SOder/SOder/services/OrderManager.swift†L482-L506】. Ensure channels are cleaned up on logout to prevent leaks.
* **Printing Flow** – `PrinterManager` discovers printers and prints receipts, kitchen slips, and summaries. Error states are surfaced via `errorMessage` and logs【F:mobile/SOder/SOder/services/PrinterManager.swift†L28-L60】【F:mobile/SOder/SOder/services/PrinterManager.swift†L169-L220】. Consider more robust bluetooth handling and user feedback when a printer disconnects.
* **Accessibility** – Localization is well structured but custom badges and buttons should include `.accessibilityLabel` / `.accessibilityHint`. Run Xcode’s Accessibility Inspector to verify.
* **Checkout Smoothness** – Checkout flows rely on asynchronous printing and status updates. Provide haptic feedback and progress indicators to reassure the user.

## App Store Risks

* Hardcoded tokens or insecure storage were not found. Ensure Info.plist does not contain secret keys.
* Ensure external accessory usage descriptions are provided for Bluetooth and Wi‑Fi printers.

## Maintainability

* Component hierarchy is organized (`views/auth`, `views/orders`, `views/kitchen`). Consider extracting shared managers such as `OrderManager` into a singleton with dependency injection to ease testing.
* SQL functions in `infra/migrations` suggest using RPC endpoints; adopting them will keep network code concise.

---

Overall the codebase is clean and modular but has a few inconsistencies and potential optimizations. Addressing these will improve reliability and performance.
