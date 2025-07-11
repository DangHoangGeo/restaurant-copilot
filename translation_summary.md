# Translation Summary Report

This report summarizes the translation process for files in the `web/messages/ja/` directory.

## Processed Files and Statistics

| File Path                                       | Lines Translated | Intentionally Untranslated Entries (Examples)                                                                 |
| :---------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------ |
| `web/messages/ja/auth.json`                     | 95               | `your-restaurant-name` (Reason: Formatting string, proper noun, or placeholder), `All rights reserved.` (Reason: Formatting string, proper noun, or placeholder) |
| `web/messages/ja/common.json`                   | 124              | `All rights reserved.` (Reason: Formatting string, proper noun, or placeholder), `Zod` (Reason: Formatting string, proper noun, or placeholder), `Recharts` (Reason: Formatting string, proper noun, or placeholder), `{value, number, ::currency/JPY}` (Reason: Formatting string, proper noun, or placeholder), `PNG, JPG, or WEBP` (Reason: Formatting string, proper noun, or placeholder), `#RRGGBB` (Reason: Formatting string, proper noun, or placeholder) |
| `web/messages/ja/customer/booking.json`         | 57               |                                                                                                               |
| `web/messages/ja/customer/cart.json`            | 30               |                                                                                                               |
| `web/messages/ja/customer/checkout.json`        | 45               |                                                                                                               |
| `web/messages/ja/customer/home.json`            | 15               |                                                                                                               |
| `web/messages/ja/customer/menu.json`            | 28               |                                                                                                               |
| `web/messages/ja/customer/orderHistory.json`    | 33               |                                                                                                               |
| `web/messages/ja/customer/session.json`         | 12               |                                                                                                               |
| `web/messages/ja/landing.json`                  | 55               | `All rights reserved.` (Reason: Formatting string, proper noun, or placeholder)                                 |
| `web/messages/ja/legal.json`                    | 2                |                                                                                                               |
| `web/messages/ja/owner/bookings.json`           | 60               |                                                                                                               |
| `web/messages/ja/owner/dashboard.json`          | 42               |                                                                                                               |
| `web/messages/ja/owner/employees.json`          | 53               |                                                                                                               |
| `web/messages/ja/owner/homepage.json`           | 20               |                                                                                                               |
| `web/messages/ja/owner/menu.json`               | 118              |                                                                                                               |
| `web/messages/ja/owner/onboarding.json`         | 62               | `your-restaurant-name` (Reason: Formatting string, proper noun, or placeholder)                                 |
| `web/messages/ja/owner/orders.json`             | 55               |                                                                                                               |
| `web/messages/ja/owner/profile.json`            | 29               | `All rights reserved.` (Reason: Formatting string, proper noun, or placeholder)                                 |
| `web/messages/ja/owner/reports.json`            | 30               |                                                                                                               |
| `web/messages/ja/owner/settings.json`           | 78               | `#RRGGBB` (Reason: Formatting string, proper noun, or placeholder), `PNG, JPG, or WEBP` (Reason: Formatting string, proper noun, or placeholder) |
| `web/messages/ja/owner/tables.json`             | 34               |                                                                                                               |
| `web/messages/ja/serviceAdmin/home.json`        | 15               |                                                                                                               |
| `web/messages/ja/serviceAdmin/orders.json`      | 28               |                                                                                                               |
| `web/messages/ja/serviceAdmin/settings.json`    | 12               |                                                                                                               |
| `web/messages/ja/serviceAdmin/users.json`       | 40               |                                                                                                               |

**Note on "Lines Translated":** This count refers to the number of string values that were identified as requiring translation and were processed. It excludes simple placeholders (e.g., `{username}`), specific formatting strings, proper nouns, or phrases intentionally kept in English (as listed in the "Intentionally Untranslated Entries" column). The actual number of JSON lines in each file might be higher due to structure, comments, or keys.

**Untranslated Entry Reasons:**
*   **Formatting string:** Values like currency formats (`{value, number, ::currency/JPY}`), color codes (`#RRGGBB`), or file types (`PNG, JPG, or WEBP`) are kept as is.
*   **Proper noun:** Brand names (e.g., `Zod`, `Recharts`) or specific technical terms are often not translated.
*   **Placeholder:** Values like `your-restaurant-name` are meant to be substituted by actual data and are not translated.
*   **Standard legal phrase:** Terms like `All rights reserved.` are often kept in English for legal consistency.

This summary provides an overview of the translation effort. Each file's integrity, including its structure, keys, and interpolation placeholders, has been maintained.Tool output for `create_file_with_block`:
