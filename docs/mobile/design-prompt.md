You are a senior UX/UI designer specializing in native iOS (SwiftUI). Your task is to design a modern, professional iPad/iPhone interface for the CoOrder staff app. The app must be built in SwiftUI, support secure Supabase authentication, and satisfy all of these requirements:

1. **Localization & Branding**

   * Support Japanese (`ja`), English (`en`), and Vietnamese (`vi`) via `Localizable.strings`.
   * All text, labels, error messages, placeholders, and buttons must use `NSLocalizedString("KEY", comment: "")`.
   * Apply each restaurant’s brand color (fetched from Supabase) to tappable UI elements (buttons, status badges) and accent strokes.
   * Use a clean, minimal aesthetic with rounded-2xl corners, soft shadows, and adequate padding (`.padding(16)`) on cards and buttons.

2. **Authentication Flow**

   * **LoginView**:
     • Fields: Email (keyboard type `.emailAddress`), Password (secure entry), Subdomain (lowercased).
     • “Sign In” button disabled until all fields are non-empty and email is valid.
     • On tap: call `supabase.auth.signInWithPassword(...)`, decode JWT to get `restaurant_id` and `role`, store in `@AppStorage`.
     • Show localized error alerts for invalid credentials or network failures.
   * Persist JWT and auto-refresh; if a valid JWT exists at launch, skip directly to the main tab view.

3. **Main TabView Structure**

   * **Tab 1: Orders**
     • **OrderListView**:
     – List all active orders (status “new”, “preparing”, “ready”) sorted by `created_at DESC`.
     – Each row:
     · Table number (e.g. “Table 3”)
     · Item count (“3 items”)
     · Timestamp (localized short date/time)
     · Status badge (circle or capsule, colored: Blue=new, Orange=preparing, Green=ready).
     – Tapping a row pushes **OrderDetailView**.
     • **OrderDetailView**:
     – Show table number as title.
     – List each `OrderItem`: localized menu item name, quantity (e.g. “Ramen ×2”), notes (if any, in smaller gray text).
     – Display “Total: ¥X,XXX” at bottom.
     – If status == “new”: show a full-width Button “Mark Preparing” (brand color).
     – If status == “preparing”: Button “Mark Ready”.
     – If status == “ready”: Button “Complete & Print” which:
     · Updates status to “completed” via Supabase client
     · Triggers `PrinterManager.shared.printReceipt(order)`
     · Pops back to OrderListView.
     – All buttons use `.buttonStyle(.borderedProminent)` with the restaurant’s brand color.

   * **Tab 2: Kitchen Board** (iPad-optimized, but available on iPhone too)
     • **KitchenBoardView**:
     – On appear, call `computeGrouping()`:
     · Filter `orderService.activeOrders` to those with `createdAt ≥ now() − 600s` and status in {“new”, “preparing”}.
     · Group by `menuItemId`, sum quantities, collect set of table numbers.
     – Display a scrollable grid (e.g. `LazyVGrid(columns: [GridItem(.adaptive(minimum: 180))])`) of cards:
     · Dish name (large, bold)
     · “Qty: X” (medium font)
     · “Tables: T1, T3” (smaller font)
     · Button “Mark Done” (tappable capsule, brand color)
     – Tapping “Mark Done” calls `PrinterManager.printGroupedSummary(group)` and re-computes grouping.
     – If no groups, show a friendly placeholder (“No recent items to prepare”).

   * **Tab 3: Bookings** (if `FEATURE_FLAGS.tableBooking = true`)
     • **BookingListView**:
     – List `bookingService.bookings` sorted by `bookingDate`, `bookingTime`.
     – Each row:
     · Customer name (bold)
     · Date + time (localized)
     · “Party: N”
     · Status badge (Gray=pending, Green=confirmed, Red=canceled)
     – Tapping a row pushes **BookingDetailView**.
     • **BookingDetailView**:
     – Show:
     · Customer name and contact (phone/email)
     · Date and time in bigger font
     · Party size
     · If `preorderItems` not empty: a scrollable section listing each preordered dish: localized name, quantity, notes.
     – Buttons:
     · If status == “pending”: two side-by-side Buttons — “Confirm” (green) and “Cancel” (red).
     · If status == “confirmed”: single Button “Cancel” (red).
     – After status update, reflect change immediately in list.
     – All buttons `.buttonStyle(.borderedProminent)` with clear, localized labels.

   * **Tab 4: Printer Setup**
     • **PrinterSetupView**:
     – Show a “Scan for Printers” Button (blue).
     – While scanning, show a ProgressView and a “Cancel” option.
     – List discovered peripherals (their `name ?? "Unnamed"`), each in a row with a “Connect” button.
     – When connected, show “Connected to {printerName}” text.
     – Provide a “Test Print” Button (secondary style) that calls `PrinterManager.shared.printReceipt(dummyOrder)`; on success, show a brief toast/alert “Test print sent.”
     – Handle connection errors with a localized alert.

   * **Tab 5: Inventory Alerts** (if `FEATURE_FLAGS.lowStockAlerts = true`)
     • **InventoryAlertView**:
     – Automatically subscribe to Realtime updates on `inventory_items`.
     – When `stock_level ≤ threshold`, display a banner at top or an in-app push notification: “Low stock: {itemName} only {stockLevel} left.”
     – List all low-stock items in a scrollable list: localized item name, stock level, threshold.
     – Each row: “Reorder” Button that triggers an email link or opens a reorder form (optional).
     – If no low-stock items, show “All items sufficiently stocked.”

4. **PrinterManager (ESC/POS over Bluetooth)**

   * **PrinterManager.swift** (singleton `ObservableObject`):
     • Initialize `CBCentralManager(delegate: self)`.
     • `connectToPrinter()` scans for peripherals advertising the ESC/POS service UUID.
     • On discovery, stop scan, connect, discover services/characteristics, and store the write characteristic.
     • `printReceipt(order: Order)` builds an ESC/POS–formatted `Data` from a simple text template (order ID, table, items, total). Write to `writeCharacteristic`. Retry up to `maxRetryAttempts`.
     • `printGroupedSummary(group: GroupedItem)` similarly formats a summary string.
     • Handle Bluetooth state changes: if `central.state != .poweredOn`, notify user with an alert (“Bluetooth is off. Please enable to print.”).
     • Fail silently if no printer connected, but log errors internally.

5. **Shared Components & Reusables**

   * **OrderService.swift**: handles Realtime subscription to `orders` and exposes `@Published var activeOrders: [Order]`; provides `updateOrderStatus(...)`.
   * **BookingService.swift**: similar for `bookings`.
   * **Models**:

     ```swift
     struct Order: Identifiable {
       let id: String
       let tableId: String
       let totalAmount: Double
       let status: String
       let createdAt: Date
       let items: [OrderItem]
     }
     struct OrderItem: Identifiable {
       let id: String
       let menuItemId: String
       let menuItemName: String
       let quantity: Int
       let notes: String?
     }
     struct Booking: Identifiable {
       let id: String
       let tableId: String
       let customerName: String
       let customerContact: String
       let bookingDate: Date
       let bookingTime: String
       let partySize: Int
       let preorderItems: [[String: Any]]
       let status: String
     }
     struct GroupedItem: Identifiable {
       let id = UUID()
       let itemId: String
       let itemName: String
       var quantity: Int
       var tables: Set<String>
     }
     ```
   * **Utilities**:
     • `DateFormatter.shortDate` and `DateFormatter.shortTime` for locale-aware display.
     • `Color.brand` extension that reads the restaurant’s brand color hex and returns a `Color`.
     • `String.localized(_ key: String)` helper to wrap `NSLocalizedString`.

6. **Feature Flags & Conditional UI**

   * Read `FeatureFlags.enablePayments`, `enableAI`, `enableReviews`, `enableLowStockAlerts`, and `enableTableBooking` from a shared Swift file generated at build time (or passed via Info.plist).
   * Wherever a feature is disabled, hide that entire tab or show a disabled placeholder (e.g., for payments, show “Coming Soon” screen).
   * Example: if `!FeatureFlags.enableTableBooking`, do not include the “Bookings” tab in the `TabView`.

7. **Accessibility & ARIA Alternatives**

   * Use `.accessibilityLabel(...)` for all Buttons and interactive elements.
   * Ensure color-blind–friendly status badges: pair color with an icon or text label (“New”, “Preparing”, “Ready”).
   * Buttons must be at least 44×44 points tappable.
   * Support Dynamic Type (use `.font(.headline)`, `.font(.body)`, etc., so text scales).
   * For any non-text element (icons), provide `accessibilityHidden(true)` if decorative, or `accessibilityLabel` if conveying information.

8. **Performance & Best Practices**

   * Use `@AppStorage` for storing JWT and `restaurantId`; do not re-fetch on every launch.
   * Lazy-load large views: e.g., KitchenBoard only computes grouping on `onAppear`.
   * For Realtime subscriptions, unsubscribe when the view disappears or when logging out.
   * Minimize redraws: use `@Published` sparingly and only on necessary properties.
   * Avoid blocking the main thread: perform all Supabase network calls in `Task { }`.

9. **Deliverables**

   * For each tab/screen, provide high-fidelity SwiftUI mockups or wireframes showing:

     1. **LoginView** on iPhone.
     2. **OrderListView** and **OrderDetailView** on iPhone.
     3. **KitchenBoardView** on iPad (landscape) and iPhone (portrait).
     4. **BookingListView** and **BookingDetailView** (if enabled) on iPhone.
     5. **PrinterSetupView** on iPhone.
     6. **InventoryAlertView** on iPhone (if enabled).
   * Annotate each mockup with behavior notes: e.g., “When ‘Mark Preparing’ is tapped, call Supabase to update status and fade the order row to orange,” “If Bluetooth is disabled, show an alert before scanning.”

---

**Final Prompt to the AI:**

```
You are a senior SwiftUI UX/UI designer. Design CoOrder’s native iOS staff app with the following tabs and features, using SwiftUI and adhering to Supabase + RLS security and feature-flag rules:

1. LoginView: Email, Password, Subdomain fields; localized in ja/en/vi; validate inputs; call Supabase Auth; store JWT and role; navigate to main TabView.

2. TabView with up to five tabs (depending on feature flags):
   • Orders: OrderListView (list “new/preparing/ready” orders with status badges); tap → OrderDetailView (itemized list, total, status transition buttons, “Complete & Print” triggers ESC/POS printing).
   • Kitchen Board: KitchenBoardView groups recent (last 10 min) items by menuItemId, shows dish name, quantity, tables; “Mark Done” prints group summary; optimized grid on iPad.
   • Bookings (if enabled): BookingListView (pending/confirmed/canceled with badges); tap → BookingDetailView (customer info, date/time, party size, preorderItems list, Confirm/Cancel buttons).
   • Printer Setup: PrinterSetupView scans for ESC/POS printers via Bluetooth, shows list, connect button, “Test Print” functionality; handles Bluetooth-off errors.
   • Inventory Alerts (if enabled): InventoryAlertView shows banners when stock ≤ threshold and a list of low-stock items with “Reorder” buttons.

3. Localization: All text via `Localizable.strings` for ja/en/vi; use `NSLocalizedString`.

4. Branding: Fetch each restaurant’s brand color from Supabase; use as `Color.brand` for buttons and badges.

5. Models & Services:  
   • OrderService subscribes to Realtime `orders`; exposes `@Published activeOrders` and `updateOrderStatus`.  
   • BookingService subscribes to Realtime `bookings`; exposes `@Published bookings` and `updateBookingStatus`.  
   • PrinterManager as singleton for ESC/POS printing via CoreBluetooth; methods `connectToPrinter()`, `printReceipt(order)`, `printGroupedSummary(group)`.

6. Feature Flags: Read from a shared Swift file or Info.plist; conditionally include/exclude tabs and UI elements. If a feature is disabled, display a “Coming Soon” or omit that tab.

7. Accessibility: All buttons and icons have `.accessibilityLabel`; support Dynamic Type; ensure color-blind compatibility.

8. Performance: Lazy-load heavy views, unsubscribe Realtime on disappear, perform network calls in `Task { }`.

Design high-fidelity SwiftUI mockups for iPhone and iPad (for Kitchen Board) of each screen, annotated with interactive behavior notes.  
```
