# SOder POS: Unified Add-Items UX and Session Handling Plan

Owner: iOS
Status: Draft
Date: 2025-08-11

## Goals
- Unify POS “browse + add items” UX between new-order flow and existing-order flow.
- Always add to the current session when adding from OrderDetailView; do not create new sessions.
- Remove item images in lists; show code, item name (primary = app language, secondary = other available language), item status, and price.
- Fix search: support multi-language fields and item code.
- Maintain app rules from DesignSystem and Localization.

## Scope
- Views: MenuSelectionView, AddItemToOrderView, DraftOrderView, SelectTableView, OrderDetailView
- Managers: OrderManager (no API change, minor helpers), SupabaseManager (caching)
- Shared UI: new header, list, summary bar components
- Localization updates

## UX Decisions
- List Item (no image):
  - Leading: code badge (if available)
  - Title: name in current language
  - Subtitle: secondary language name (fallback rules)
  - Meta: status chip (available/out-of-stock) if stock_level available
  - Trailing: price, quick-add, customize (if sizes/toppings)
- Search: search over
  - name_en, name_ja, name_vi
  - description_en, description_ja, description_vi
  - code
- Quick Add vs Customize
  - If item has sizes/toppings → open Customize sheet
  - Else → add with default quantity 1

## Tech Plan
1) Shared Components
- MenuSearchHeader: TextField + FilterChip row
- MenuItemsList: ScrollView + LazyVStack of compact rows (no image)
- OrderSummaryBar: total + items count + Done
- AddToOrderCoordinator: price calc + quickAddOrCustomize decision

2) AddItemToOrderView
- Replace ad-hoc list with MenuSearchHeader + MenuItemsList
- Implement multi-lang search and code search
- Customize sheet for sized/topping items; otherwise quick add
- Show OrderSummaryBar; dismiss triggers fetchActiveOrders

3) MenuSelectionView
- Adopt shared components for consistency
- Keep local draft behavior for new orders; DB add for existing

4) Data & Performance
- SupabaseManager: in-memory cache for categories/menu items (TTL 60s)
- Optional search debounce (300ms)

5) Design & Localization
- Replace system fonts/colors with DesignSystem
- Add missing localization keys listed below

## Localization Keys (examples)
"pos_search_placeholder" = "Search by name or code...";
"pos_filter_all" = "All";
"pos_loading_menu" = "Loading menu...";
"pos_empty_search_format" = "No items found for '%@'";
"pos_empty_try_different" = "Try a different search term.";
"pos_empty_category" = "No items in this category.";
"pos_empty_all" = "No items available.";
"pos_done" = "Done";
"pos_view_cart" = "View Cart";

## Acceptance Criteria
- Item rows show: code, primary name, secondary name, status, price; no images.
- Search finds matches across en/ja/vi names, descriptions, and code.
- Add from OrderDetailView never creates a new session; items and totals update correctly.
- POS new order uses local draft and confirm to persist.
- All text is localized and uses DesignSystem.

## Risks
- Price calculation drift → centralize in coordinator, test with options.
- Double submissions → guard with isAddingItem.

## Tasks
- [ ] Create shared components (header, list, summary bar)
- [ ] Implement AddToOrderCoordinator
- [ ] Refactor AddItemToOrderView to shared components and logic
- [ ] Update MenuSelectionView to shared components and search
- [ ] SupabaseManager caching and optional debounce
- [ ] Localization updates
- [ ] QA on iPhone/iPad
