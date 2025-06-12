# Improvement Plan

Based on the review, the following actions are recommended to harden security, fix bugs and polish the UX.

## 1. Consolidate `OrderManager`
- Provide a shared instance via `EnvironmentObject` so both order and kitchen views use the same data source. This removes duplicate realtime subscriptions and saves memory.
- Update initializers in `OrdersView` and `KitchenBoardView` accordingly and pass the manager from `SOderApp` or `ContentView`.

## 2. Fix Credential Persistence
- Unify the UserDefaults keys in `LoginView` (`lastSubdomain`/`lastEmail`). Remove the `lastUsed*` variants to ensure saved credentials load on launch.

## 3. Adopt Supabase RPC Functions
- Replace complex table joins in `OrderManager.fetchActiveOrders()` and `fetchAllOrders()` with calls to the SQL functions defined in `infra/migrations`, e.g. `get_active_orders_with_details`. This will reduce payload size and leverage RLS rules.

## 4. Persist Print History (Optional)
- If repeated auto‑printing on app restart is problematic, persist `printedNewOrders` and `printedReadyItems` to disk (Keychain or local file).

## 5. Accessibility and HIG Compliance
- Audit custom views (`FilterChip`, `EnhancedOrderItemView`, printing dialogs) with the Accessibility Inspector. Add `.accessibilityLabel` and `.accessibilityHint` where necessary.
- Test on different Dynamic Type sizes and on VoiceOver.

## 6. Printer UX Enhancements
- Show clearer connection status when the printer disconnects.
- Offer retry prompts when printing fails.
- Verify the app includes required usage descriptions in Info.plist for network and Bluetooth access.

## 7. Keychain Usage (Future)
- If tokens need to be stored across launches, save them securely in the iOS Keychain. Ensure sign‑out wipes the entry.

## 8. Performance Polish
- Consider caching menu data to avoid repeated downloads.
- Investigate indexing frequently queried columns according to database schema.

Implementing these steps will improve stability, efficiency and the user experience for restaurant staff.
