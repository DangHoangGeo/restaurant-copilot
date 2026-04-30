## 2025-05-15 - [Improving Accessibility for Icon-Only Buttons]
**Learning:** Icon-only buttons are common throughout the application (header, tables, card actions) but often lack accessible names, making them unusable for screen reader users despite having visual titles. Existing translation keys like `common.edit`, `common.delete`, and `common.refresh` can be reused for `aria-label` to provide immediate accessibility wins without new strings.
**Action:** Always check icon-only buttons for `aria-label` or `sr-only` text and reuse existing i18n keys for them to ensure accessibility across all languages.

## 2024-05-20 - [Focus Management and Decorative Icon Hygiene]
**Learning:** Returning focus to a primary input (like a search bar) after a "clear" action prevents the user from losing their place and allows for immediate re-entry, creating a smoother flow. Additionally, explicitly hiding decorative icons within buttons and labels using `aria-hidden="true"` reduces screen reader noise and improves the overall quality of the accessibility tree.
**Action:** Implement focus management using `useRef` for clear/reset actions on inputs. Always use `aria-hidden="true"` on purely decorative icons.
