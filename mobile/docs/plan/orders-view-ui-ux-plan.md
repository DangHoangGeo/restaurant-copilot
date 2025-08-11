# Orders View – Focused UI/UX Improvement Plan

Owner: Mobile (iOS, SwiftUI)
Scope: OrdersView and related components (iPad sidebar + iPhone list, order rows, filters, empty/loading/error states, add-item flows)
Goal: Make it fast and professional for staff; ensure full localization (EN/JA/VI)

## 1) Objectives
- One-glance understanding of current workload (New/Serving) and quick access to actions.
- Consistent components across iPhone/iPad.
- Correct localized item names everywhere (no fallback to English when app is VI/JA).
- Reduce taps to common actions (open order, mark serving, print, add items).

## 2) Key Issues Observed
- Menu item names default to English regardless of app language due to model helpers returning `name_en`.
- Add-item UIs differ between new vs existing order; descriptions shown where not needed.
- Mixed visual emphasis in sidebar rows (error color used for "new item" indicator).
- Some hardcoded styles/text in POS code; not using DesignSystem in places.

## 3) UX Improvements by Surface
### A) iPad – Sidebar + Detail
- SidebarOrderRowView
  - Title line: `Table Name` + short `ID` + `NEW` badge when first seen.
  - Secondary line: guests + time; keep subdued.
  - Right column: EnhancedStatusBadge and Total (localized price_format).
  - Items preview: show up to 3 lines of `CODE • Localized Name` (no description), then “and %d more…”.
  - Indicator dot: use neutral/info color for "has new items"; reserve error color for errors only.
  - Selection: keep outline and background tint; add `.accessibilityAddTraits(.isSelected)`.
- Detail placeholder (no selection): use design token fonts/colors; guidance copy + keyboard hint.

### B) iPhone – Filtered Sections List
- Group by table (already present); ensure section headers readable and sticky.
- OrderRowView parity with sidebar content:
  - Same title/secondary/total layout and item preview lines.
  - Trailing swipe actions: Print, Mark Serving (when eligible).
- Pull to refresh; subtle list update animation.

### C) Filters/Controls
- Filter chips: consistent `FilterChip` style/colors per status, counts visible.
- “Active/All” toggle retained; reset scroll on change.
- Options menu: Refresh, Auto-print toggle, Clear print history, Sign out (as today).

### D) States
- Loading: skeleton/redacted placeholders for rows and counts.
- Empty: friendly localized text + CTA to start new order.
- Error: inline banner with retry; doesn’t block list interaction.

## 4) Localization & Data Fixes (highest priority)
- Centralized model helpers using `LocalizationManager.currentLanguage`:
  - Category.displayName → JA/VI fallback to EN.
  - MenuItem.displayName, displayDescription → JA/VI fallback to EN.
  - MenuItemSize.displayName, Topping.displayName → JA/VI fallback to EN.
  - OrderItem.name → take from `menu_item` using the same logic.
- Replace any hardcoded currency in POS/add-item views with `"price_format"` key.
- Ensure search in AddItemToOrderView uses `displayName` to match current language.

## 5) Unify Add-Item Flows (new vs existing orders)
- Create shared `MenuItemRowCompact` component:
  - Shows `[CODE] • Localized Name` and price; primary "+" button.
  - No description.
  - Uses DesignSystem fonts/colors, spacing tokens.
  - Accessibility: label “Add %@ to order”.
- Use this component in:
  - AddItemToOrderView (existing order)
  - POS MenuItemView (new order path)
- Align search bar, category chips, empty/loading messages across both.

## 6) Visual Design Tokens
- Colors: .appPrimary, .appSurface, .appBackground, .appTextPrimary/Secondary, .appInfo/.appWarning/.appError.
- Fonts: .sectionHeader, .cardTitle, .bodyMedium, .captionRegular/Bold.
- Spacing: multiples of 8 via Spacing.*. No hardcoded `.system(size:)` or Color.*.

## 7) Accessibility
- All row elements have combined `accessibilityLabel` (table, id, status, guests, time, total).
- Buttons and chips include `.accessibilityLabel("...".localized)`.
- Selected row exposes `.isSelected` trait on iPad.

## 8) Performance
- Keep List for large sets; avoid heavy per-row computations.
- Use `.redacted(reason: .placeholder)` during loads.
- Consider `.id(selectedFilter, showAllOrders)` to reset scroll on filter scope change.

## 9) Deliverables & File Changes
1) Model-level localization
   - Update: `mobile/SOder/SOder/models/Models.swift`
     - Implement language-aware displayName/displayDescription on Category, MenuItem, MenuItemSize, Topping, and OrderItem.
2) Shared compact item row
   - New: `mobile/SOder/SOder/views/shared/MenuItemRowCompact.swift`
3) Apply shared row
   - Update: `views/orders/AddItemToOrderView.swift` (replace item rows; remove description)
   - Update: `views/pos/MenuItemView.swift` (replace item rows; remove hardcoded colors/currency; use localization keys)
4) Orders list polish
   - Update: `views/orders/OrdersView.swift` and `SidebarOrderRowView` (badge/dot color logic, item preview additions, accessibility labels, loading placeholders)
   - Update: `OrderRowView` if separate (ensure visual parity with sidebar)
5) Empty/Loading/Error localization
   - Verify keys exist in EN/JA/VI; add where needed.

## 10) Acceptance Criteria
- When app language is VI/JA, all menu item names in Orders, Order Detail, Add Item, and POS show localized names (with EN fallback only if missing).
- Add-item UIs for new/existing orders look and behave consistently; rows show `CODE • Localized Name` only.
- iPad sidebar rows clearly indicate NEW state without using error red for normal status; selection is obvious and accessible.
- No user-facing hardcoded strings or colors in updated code; all from DesignSystem/localization.
- Pull-to-refresh, swipe actions, and error banners work without blocking core flows.

## 11) Phasing
- Phase 1: Model localization + shared compact row + apply to both add-item views.
- Phase 2: Orders row polish (sidebar + iPhone) + accessibility labels + loading/empty states.
- Phase 3: Minor refinements (swipe actions, animations) and QA in EN/JA/VI.
