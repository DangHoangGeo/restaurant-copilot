## 1. Define Your Roles & Pages

| Role                                    | Pages / Features                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Public**                              | landing, auth, common, legal                                                                                                           |
| **Service Admin**                       | serviceAdmin/home, serviceAdmin/users, serviceAdmin/orders, serviceAdmin/settings                                                      |
| **Restaurant Owner** (per-tenant admin) | owner/dashboard, owner/menu, owner/orders, owner/tables, owner/employees, owner/bookings, owner/reports, owner/settings, owner/profile |
| **Customer**                            | customer/home, customer/menu, customer/cart, customer/checkout, customer/thankYou, customer/orderHistory, customer/booking             |

---

## 2. New `messages/en/` Folder Structure

```
src/
└── messages/
    └── en/
        common.json
        landing.json
        auth.json
        legal.json
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

1. **`common.json`**
   All truly global strings (buttons, generic errors, weekdays, validation templates).

2. **`landing.json` / `auth.json` / `legal.json`**
   Public-facing homepage, authentication flows, terms & privacy.

3. **`serviceAdmin/*.json`**
   The super-admin UI for your multi-tenant service.

4. **`owner/*.json`**
   The restaurant-owner dashboard and its subpages.

5. **`customer/*.json`**
   The customer-facing ordering UI.

---

## 3. Update `getRequestConfig`

Update **`web/i18n/request.ts`**:

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

> **Tip:** if you’d rather keep namespaces nested at runtime, skip the `Object.assign` flattening and pass `{ locale, messages: loadedMap }`, then call `useTranslations('owner/dashboard')`.

---

## 4. Consume in Components

### a) Restaurant-Owner Dashboard

```tsx
// src/components/OwnerDashboard.tsx
'use client';

import { useTranslations } from 'next-intl';

export function OwnerDashboard() {
  const t = useTranslations('owner/dashboard');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>

      <button>
        {t('actions.createReport')}
      </button>
    </div>
  );
}
```

### b) Customer Home Page

```tsx
// src/components/CustomerHome.tsx
'use client';

import { useTranslations } from 'next-intl';

export function CustomerHome() {
  const tHome = useTranslations('customer/home');
  const tCommon = useTranslations('common');

  return (
    <main>
      <h1>{tHome('welcome')}</h1>
      <button>
        {tHome('viewMenu')}
      </button>
      <footer>
        {tCommon('buttons.cancel')}
      </footer>
    </main>
  );
}
```

### c) Service-Admin Orders

```tsx
// src/components/ServiceAdminOrders.tsx
'use client';

import { useTranslations } from 'next-intl';

export function ServiceAdminOrders() {
  const t = useTranslations('serviceAdmin/orders');

  return (
    <>
      <h2>{t('title')}</h2>
      <p>{t('instructions.filter')}</p>
    </>
  );
}
```

---

## 5. Roll-out Checklist

1. **Generate** the folders/files under `src/messages/en/` as per above.
2. **Copy-and-paste** each section from your old JSON into its matching new file, deduping into `common.json`.
3. **Install/replace** your loader with the new `i18n.ts`.
4. **Refactor** your UI components to call `useTranslations(namespace)` instead of inlining keys.
5. **Test** every page under all locales for missing keys or typos.

With this organization:

* **Adding** a new page = create one JSON, add its namespace string, then `useTranslations('thatNamespace')`.
* **Maintaining** translations is trivial—you only edit the specific file for a page or feature.
* **Scaling** to more locales (e.g. `ja/`) just means copying the same folder structure under `src/messages/ja/`.
