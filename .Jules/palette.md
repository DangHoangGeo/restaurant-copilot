## 2025-05-15 - [Improving Accessibility for Icon-Only Buttons]
**Learning:** Icon-only buttons are common throughout the application (header, tables, card actions) but often lack accessible names, making them unusable for screen reader users despite having visual titles. Existing translation keys like `common.edit`, `common.delete`, and `common.refresh` can be reused for `aria-label` to provide immediate accessibility wins without new strings.
**Action:** Always check icon-only buttons for `aria-label` or `sr-only` text and reuse existing i18n keys for them to ensure accessibility across all languages.

## 2025-05-16 - [Focus Management and Indicating Toggle State]
**Learning:** Interaction efficiency is greatly improved by returning focus to the trigger element (like a search input) after an action that clears it. Additionally, for toggle-like buttons such as category filters, using `aria-pressed` allows screen readers to communicate whether a filter is active, providing essential context that visual styling alone cannot.
**Action:** Use `useRef` to manage focus for "clear" or "reset" buttons and ensure all filter/toggle buttons use `aria-pressed` to indicate their current state.
