## 2025-05-15 - [Improving Accessibility for Icon-Only Buttons]
**Learning:** Icon-only buttons are common throughout the application (header, tables, card actions) but often lack accessible names, making them unusable for screen reader users despite having visual titles. Existing translation keys like `common.edit`, `common.delete`, and `common.refresh` can be reused for `aria-label` to provide immediate accessibility wins without new strings.
**Action:** Always check icon-only buttons for `aria-label` or `sr-only` text and reuse existing i18n keys for them to ensure accessibility across all languages.

## 2025-05-15 - [Unique IDs in List Components]
**Learning:** When linking labels to inputs using `htmlFor` and `id` within list components, using static IDs leads to collisions. Always use unique identifiers derived from the item's data (e.g., `item.id`) to ensure valid HTML and correct accessibility behavior.
**Action:** Use dynamic IDs for form elements within repeated components.
