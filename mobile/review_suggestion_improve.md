# SOder iOS App Review

## 1. Security Assessment

- **Token Handling**: The app retrieves the Supabase authentication token and parses JWT claims in `SupabaseManager` for restaurant ID and user role. Tokens are not persisted beyond the Supabase session. Consider using the iOS Keychain for any sensitive tokens if persistence is required.
- **Data Storage**: User defaults are used for non‑sensitive values (last subdomain, email, auto‑printing flag). No passwords or tokens are stored in plain text, which is good. Ensure any future sensitive data is stored securely in the Keychain.
- **Session Management**: `SupabaseManager` checks existing sessions on launch. Ensure session invalidation is handled when signing out and that tokens are refreshed securely.
- **Network Calls**: All database interactions use the Supabase client, which communicates over HTTPS. Ensure SSL pinning if additional security is required.

## 2. UI Assessment

- **Consistency with HIG**: Views such as `LoginView` and tab navigation follow standard SwiftUI components, using consistent fonts and spacing. Navigation titles and buttons conform to HIG recommendations.
- **Visual Aesthetics**: Assets and icons are simple and rely on SF Symbols. Consider adding restaurant branding to enhance aesthetics.
- **Clarity & Accessibility**: Text uses `.localized` strings for multiple languages. Ensure Dynamic Type and VoiceOver labels are provided for all controls, especially in custom components like `ConnectionStatusBar` and printer views.

## 3. UX Assessment

- **Navigation & Controls**: `NavigationView` is used for screen transitions. Controls like language selector and login form fields are intuitive. Consider adding haptic feedback for actions like successful login or order updates (some are already implemented with `UINotificationFeedbackGenerator`).
- **Responsiveness**: Asynchronous tasks update state via `@MainActor`, keeping UI responsive. Real‑time subscriptions refresh order data automatically. Loading indicators are shown during network operations.
- **Usability**: Separate `OrderManager` instances for different views may lead to duplicated network calls (as noted in `mobile/readme.md`). Sharing a single instance via `.environmentObject` could improve efficiency and keep UI state in sync.

## 4. Performance and Database Interaction

- **Current Approach**: The app performs complex `.select` queries directly on tables (e.g., nested `orders`, `order_items`, `menu_items`, `categories`) in `OrderManager.fetchActiveOrders()`.
- **SQL Schema Reference**: The `infra/migrations` folder defines several optimized functions such as `get_active_orders_with_details`【F:infra/migrations/011_get_active_orders_function.sql†L1-L59】 and `apply_recommendations`【F:infra/migrations/008_create_apply_recommendations_function.sql†L1-L64】.
- **Recommendation**: Replace raw table queries with RPC calls to these functions via Supabase’s `rpc()` API. This moves heavy joins to the database, reduces data transferred over the network, and enforces RLS policies in one place. Example:
  ```swift
  let response: [ActiveOrder] = try await supabaseManager.client
      .rpc("get_active_orders_with_details", params: ["restaurant_uuid": restaurantId])
      .execute()
      .value
  ```
  This will utilize indexes and server‑side logic defined in the SQL migrations, improving performance and security.
- **Additional Suggestions**:
  - Review indexes on frequently queried columns (`orders.status`, `order_items.status`) to ensure they match app queries.
  - Consider caching menu data locally to minimize repeated downloads.

## 5. Improvement Suggestions

1. **Shared Data Managers** – Provide a single `OrderManager` instance via `EnvironmentObject` to avoid duplicate subscriptions and reduce memory usage.
2. **Keychain Storage** – If credentials or tokens need persistence beyond the Supabase client, store them securely in the Keychain.
3. **Accessibility Audits** – Run Xcode’s Accessibility Inspector to ensure VoiceOver labels and Dynamic Type sizes work across all views.
4. **Use Supabase RPCs** – Utilize database functions like `get_active_orders_with_details` instead of manual joins for better performance.
5. **UI Polish** – Incorporate restaurant branding and theming support in the asset catalog for a more polished appearance.

