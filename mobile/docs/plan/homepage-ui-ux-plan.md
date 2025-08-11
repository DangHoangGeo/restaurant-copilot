# Mobile App Home Page – UI/UX Improvement Plan

Owner: Mobile (iOS, SwiftUI)
Goal: Professional, easy-to-use, fast for staff in a busy restaurant

## 1) Objectives
- Make core actions one tap away: New Order, Kitchen, Printers.
- Surface the right context: active orders summary, auto-print status, connection health.
- Reduce cognitive load with clear visual hierarchy and consistent components.
- Respect localization and accessibility out of the box.

## 2) Information Architecture (Home as a Command Center)
- Top status bar (compact):
  - Connection indicators: Database, Live Updates, Printer.
  - Auto-print status chip with quick toggle and last result.
- Primary actions row:
  - New Order (primary, filled)
  - Kitchen (secondary, filled)
  - Printers (tertiary, outlined)
- Active snapshot cards:
  - Orders summary: New, Serving, Ready to serve (counts)
  - Today KPIs: Orders placed, Items prepared (optional if available)
- Quick lists:
  - Recent orders (5–8 items): table name, time, status, total, new-item dot.
  - Actions per row: open, print (overflow).

## 3) Visual/Interaction Design Guidelines
- Use DesignSystem exclusively:
  - Colors: .appPrimary, .appSurface, .appBackground, .appTextPrimary/Secondary, .appSuccess/Warning/Error.
  - Fonts: .sectionHeader, .cardTitle, .bodyMedium, .captionRegular.
  - Spacing: multiples of 8 (Spacing.xs/sm/md/lg/xl).
- Components to standardize:
  - StatusChip (success/warn/error/neutral, with icon)
  - QuickActionButton (filled/outlined)
  - StatCard (title, value, delta, icon)
  - OrderListRow (table + short id + badge for NEW + dot if items new, total)
- Accessibility:
  - Combine labels on rows (table, id, status, guests, time, total).
  - Hit targets ≥44pt; keyboard navigation friendly on iPad.
- Motion:
  - Use subtle transitions for list updates; prefer .redacted placeholder when loading.

## 4) Layouts
- iPhone
  - ScrollView with sections:
    1. Status bar
    2. Primary actions (horizontal)
    3. Stat cards (2-up grid)
    4. Recent orders list
  - Pull-to-refresh recent orders
- iPad (Regular width)
  - Two-column split feel in a single page:
    - Left: Actions + Stats
    - Right: Recent orders list (taller, denser)

## 5) Content Rules
- Names follow app language (vi/ja/en) via model-level display helpers.
- Money via localized price_format.
- Time short style; relative if <1h (e.g., “5m”).
- Show code + name for menu items in lists; avoid descriptions on home.

## 6) Empty/Loading/Error States
- Loading: skeleton Placeholders for stat cards and list.
- Empty: friendly copy + New Order CTA.
- Error: inline banner with retry; does not block other sections.

## 7) Quick Interactions
- Order row:
  - Tap: open order detail
  - Trailing swipe: print, mark serving (if applicable)
  - Long-press: show context menu (print, copy id)

## 8) Tech Tasks (Incremental)
1. Model-level localization helpers (one source of truth)
   - MenuItem/Category/MenuItemSize/Topping/OrderItem computed display props using LocalizationManager.currentLanguage with fallbacks.
2. Shared components (reusable across Home/Orders):
   - StatusChip, QuickActionButton, StatCard, OrderListRow
3. Home View
   - New file: `HomeView.swift` using components above.
   - Inject `OrderManager`, `PrinterManager`, `LocalizationManager` via @EnvironmentObject.
   - Fetch recent orders on appear + refreshable.
4. POS consistency
   - Reuse a compact MenuItemRow (code + localized name + price) in both add-item screens.
5. Accessibility & QA
   - Add combined accessibility labels; verify VoiceOver order.
   - Snapshot Previews: iPhone/ iPad, EN/JA/VI.

## 9) Metrics & Success
- Time to start new order ≤ 2 taps from home.
- Recent orders visible without scrolling on iPhone (at least 4 rows).
- Localized names shown correctly for all locales.
- Zero hardcoded colors/strings in new code; design tokens used.

## 10) Open Questions
- Should we show Today KPIs on home (requires API)? If not, keep the card but hide when unavailable.
- Do we need a dedicated Notifications area (printer errors, offline) with a count badge?
