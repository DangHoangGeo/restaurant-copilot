## 2025-05-15 - [Improving Accessibility for Icon-Only Buttons]
**Learning:** Icon-only buttons are common throughout the application (header, tables, card actions) but often lack accessible names, making them unusable for screen reader users despite having visual titles. Existing translation keys like `common.edit`, `common.delete`, and `common.refresh` can be reused for `aria-label` to provide immediate accessibility wins without new strings.
**Action:** Always check icon-only buttons for `aria-label` or `sr-only` text and reuse existing i18n keys for them to ensure accessibility across all languages.

## 2025-05-16 - [Using aria-pressed for Toggleable Filters]
**Learning:** For tab-like filters or category selectors (like in SmartMenu), using only visual cues (colors/backgrounds) for the active state is insufficient. Adding `aria-pressed` to the button elements allows screen readers to communicate which filter is currently applied.
**Action:** Implement `aria-pressed={isActive}` on all interactive filter or toggle elements.

## 2025-05-16 - [Contextual Accessibility Labels for Menu Items]
**Learning:** Generic "Add" or "View" labels on item cards lack context. Screen reader users benefit from knowing exactly what they are adding or viewing. Furthermore, distinguishing between "Add to Cart" (direct action) and "View Details" (modal opening for options) provides better predictability.
**Action:** Use localized strings that interpolate the item name (e.g., `aria-label={\`\${t("add_to_cart")}: \${itemName}\`}`) and reflect the actual UI behavior.
