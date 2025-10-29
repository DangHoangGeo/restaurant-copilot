# SOder iOS UI/UX Review — 2025-10-23

## Summary
- Reviewed the primary SwiftUI flows (`LoginView`, `MainTabView`, orders, kitchen board, printer settings, localization tooling).
- Focused on adherence to our design system, localization rules, and responsive behaviour on both compact and regular size classes.
- Highlighted defects and UX gaps that materially impact non-English operators and day-to-day staff usability.

## Critical issues (must fix)

1. **Kitchen board “All” filter breaks once the app is localized**  
   • File: `mobile/SOder/SOder/views/kitchen/KitchenItemsListView.swift` (`KitchenHeaderView`) and `KitchenBoardView`.  
   • `KitchenBoardView` stores `selectedCategoryFilter` using the localized string (`"kitchen_all".localized`). Inside `KitchenHeaderView` the chip compares against the hard-coded string `"All"` and calls `onCategoryFilterChange("All")`. As soon as the language is not English, tapping “All” writes `"All"` into `selectedCategoryFilter`. Downstream filtering in `KitchenItemsListView` still checks against `"kitchen_all".localized`, so the predicate never matches—chefs see an empty board even though orders exist.  
   • Fix: decouple display text from filter identity. For example, send a small model `{ id: KitchenFilter.all, title: "kitchen_all".localized }` or, minimally, pass through the same localized string: `let allLabel = "kitchen_all".localized; CategoryFilterChip(... isSelected: selectedCategoryFilter == allLabel) { onCategoryFilterChange(allLabel) }`. Ensure `KitchenBoardView` continues to compare against the same value.

2. **Printer settings screen bypasses localization and ships English strings**  
   • File: `mobile/SOder/SOder/views/printer/PrinterSettingsView.swift`.  
   • Section titles and labels such as `"Quick Setup"`, `"Printer Setup"`, `"Configure printers, receipts, and settings"`, `"View and manage print jobs"`, `"Setup Complete"`, etc. are raw literals. This violates the “golden rule” in `mobile/SOder/SOder/localization/*` and leaves the entire printer workflow untranslated.  
   • Fix: add localisation keys (e.g., `printer_quick_setup_title`) to every `Localizable.strings` file, then replace literals with `Text("printer_quick_setup_title".localized)` (same for buttons, status badges, and the log sheet trigger). Repeat for the `setupStatusIndicator` helper.

## Warnings (should fix)

- **Login form doesn’t adapt when the keyboard is shown on smaller devices**  
  File: `mobile/SOder/SOder/views/auth/LoginView.swift`. The credential stack sits inside a plain `VStack` within `NavigationView`. On iPhone SE/13 mini, raising the keyboard hides the password field and the sign-in CTA because there’s no scrollable container or safe-area inset. Wrap the content in a `ScrollView`, add `ignoresSafeArea(.keyboard, edges: .bottom)` (or use the new `scrollDismissesKeyboard` APIs), and swap `NavigationView` for `NavigationStack` to avoid the iOS 17 deprecation warning.

- **Design tokens are bypassed in printer & language screens**  
  Files: `PrinterSettingsView.swift`, `views/components/LanguageSelectorView.swift`. Multiple UI accents use `.blue`, `.green`, `.orange`, `.red` directly. That breaks theming consistency and dark-mode contrast. Replace them with palette entries (`Color.appPrimary`, `.appSuccess`, `.appWarning`, `.appError`, etc.) so marketing can adjust the palette in one place.

- **Kitchen category chips always show “0” because the counter is a stub**  
  File: `KitchenItemsListView.swift` (`KitchenHeaderView`). `countForCategory(_:)` still returns `0`, so chefs never see how many tickets are waiting per category. Pass the precomputed counts from `KitchenBoardView` (e.g., a `[String: Int]` map) or compute them from `groupedByCategory` before rendering.

- **Category filter chips lack accessibility metadata**  
  File: `views/kitchen/KitchenBoardComponents.swift`. The `CategoryFilterChip` button only exposes the label text; screen reader users do not hear the order count or selection state. Add `.accessibilityLabel`/`.accessibilityValue` announcing the title, count, and whether it’s selected, plus `.accessibilityAddTraits(isSelected ? .isSelected : [])`.

## Suggestions (consider)

- Modernise tab styling by swapping `.accentColor(Color.appAccent)` in `MainTabView` for `.tint(Color.appAccent)`. This gives you automatic support for the new tab bar appearance APIs introduced in iOS 15+.
- Promote the iPhone “New Order” action: surface the CTA as a floating `ToolbarItem(placement: .primaryAction)` in `OrdersView` so staff don’t need to scroll to the top. Pair it with `symbolEffect(.pulse)` when auto-printing queues a new ticket to guide attention.
- Add lightweight haptics (`UINotificationFeedbackGenerator`) when chefs advance an item’s status in `KitchenBoardView`. The tactile cue reduces double-taps during the lunch rush and improves perceived responsiveness.

---

Feel free to reach out if you want annotated screen captures or prototype tweaks after any fixes land.