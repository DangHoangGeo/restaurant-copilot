Step‐by‐step **refactoring plan**
Please execute—namespace by namespace—to split the giant JSON into the new directory structure, migrate keys, and spot/fill any missing messages:

---

## 1. Prep: Create Folder Structure

1. **Task:** In your repo, create under `web/messages/en/` the folders and empty files for each namespace:

   ```
   web/messages/en/
   ├── common.json
   ├── landing.json
   ├── auth.json
   ├── legal.json
   ├── serviceAdmin/
   │     home.json
   │     users.json
   │     orders.json
   │     settings.json
   ├── owner/
   │     dashboard.json
   │     menu.json
   │     orders.json
   │     tables.json
   │     employees.json
   │     bookings.json
   │     reports.json
   │     settings.json
   │     profile.json
   └── customer/
         home.json
         menu.json
         cart.json
         checkout.json
         orderHistory.json
         booking.json
   ```

---

## 2. Namespace-by-Namespace Migration

For each namespace below, have the AI agent:

1. **Extract** all keys & values belonging to that section from the old monolith.
2. **Dedupe** against anything already in `common.json`.

   * If a key exists in `common.json`, skip it here and reference the common key.
3. **Write** the remaining keys into the new `<namespace>.json`.
4. **Identify** any gaps (places in your React code that call `t('namespace.key')` but the JSON file has no entry).

   * Generate a placeholder entry: `"key": "__MISSING__"`.

Proceed in this order:

### 2.1 common.json

* Extract all **globally shared** strings: buttons, validation templates, weekdays, generic errors, etc.
* Populate `common.json`.

### 2.2 landing.json

* Pull everything under your old `"LandingPage"` section.

### 2.3 auth.json

* Pull old `"auth"` section (titles, subtitles, placeholders, navigation, messages, errors, footers).

### 2.4 legal.json

* Merge old `"legal.terms"` + `"legal.privacy"` navigation & sections.

### 2.5 serviceAdmin/\*.json

* **home.json** ← old `"Metadata"` + service-wide dashboard strings (if any).
* **users.json** ← any “user management” strings.
* **orders.json** ← any super-admin order-management texts.
* **settings.json** ← service-wide settings page.

*(If you don’t yet have super-admin strings, leave these empty or remove later.)*

### 2.6 owner/\*.json

Repeat for each owner page:

* **dashboard.json** ← old `"AdminDashboard"`.
* **menu.json** ← old `"AdminMenu"`.
* **orders.json** ← old `"AdminOrders"`.
* **tables.json** ← old `"AdminTables"`.
* **employees.json** ← old `"AdminEmployees"`.
* **bookings.json** ← old `"AdminBookings"`.
* **reports.json** ← old `"AdminReports"`.
* **settings.json** ← old `"Dashboard.Settings"` + `"AdminLayout.user_menu"`.
* **profile.json** ← old `"Profile"` section.

### 2.7 customer/\*.json

* **home.json** ← old `"CustomerHome"`.
* **menu.json** ← old `"Customer.menu"`.
* **cart.json** ← old `"Customer.cart"`.
* **checkout.json** ← old `"Customer.checkout"`.
* **orderHistory.json** ← old `"Customer.orderhistory"` + `"Customer.history"`.
* **booking.json** ← old `"Customer.booking"`.

---

## 3. Update Loader & Components

1. **Task:** After all files are in place, have the AI agent update `web/i18n/request.ts`’s `NAMESPACES` list to include every new `<role>/<feature>` path.
```ts
// web/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { hasLocale }      from 'next-intl';
import { routing }        from './routing';

const NAMESPACES = [
  // public
  'common',
  'landing',
  'auth',
  'legal',
  // service admin
  'serviceAdmin/home',
  'serviceAdmin/users',
  'serviceAdmin/orders',
  'serviceAdmin/settings',
  // restaurant owner
  'owner/dashboard',
  'owner/menu',
  'owner/orders',
  'owner/tables',
  'owner/employees',
  'owner/bookings',
  'owner/reports',
  'owner/settings',
  'owner/profile',
  // customer
  'customer/home',
  'customer/menu',
  'customer/cart',
  'customer/checkout',
  'customer/orderHistory',
  'customer/booking'
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale    = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Dynamically import each namespace file
  const loaded = await Promise.all(
    NAMESPACES.map(ns =>
      import(`../messages/${locale}/${ns}.json`)
        .then(mod => mod.default)
        .catch(() => ({}))
    )
  );

  // Merge all into one flat messages object
  const messages = Object.assign({}, ...loaded);

  return { locale, messages };
});
```

2. **Task:** Scan your codebase for any remaining hard-coded strings or failed lookups and ensure every `useTranslations('namespace')` call matches an entry in its JSON file.
3. **Task:** For each `"__MISSING__"` placeholder, fill in the proper copy or flag for manual translation.

---

