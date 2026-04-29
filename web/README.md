# CoOrder Web App

CoOrder is a multi-tenant SaaS platform for small restaurants, built with Next.js (App Router), Tailwind CSS, and TypeScript. Each restaurant uses its own subdomain (e.g., `restaurantabc.coorder`) to manage menus, tables, orders, employees, reports, and more. Customers access a localized ordering site (Japanese, English, Vietnamese) via QR codes on tables.

This repository contains the **Next.js web frontend** (Admin Dashboard + Customer Ordering Site). All UI components use [shadcn/ui](https://ui.shadcn.com/) for consistent styling and layout, and [lucide-react](https://lucide.dev/docs/react/) for icons.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Environment Variables](#environment-variables)
   - [Installation](#installation)
   - [Development](#development)
   - [Building & Deployment](#building--deployment)
4. [Folder Structure](#folder-structure)
5. [UI/UX Conventions](#uiux-conventions)
   - [Layout & Styling](#layout--styling)
   - [Components & Icons](#components--icons)
   - [Forms & Validation](#forms--validation)
   - [Internationalization](#internationalization)
   - [Feature Flags](#feature-flags)
6. [API & Data Layer](#api--data-layer)
   - [Supabase Integration](#supabase-integration)
   - [Row-Level Security (RLS)](#row-level-security-rls)
7. [Testing](#testing)
8. [Contributing](#contributing)
9. [License](#license)

---

## Features

- **Multi-Tenant Subdomains**: Each restaurant has its own subdomain (e.g., `restaurantabc.coorder`), isolating data via Supabase RLS.
- **Admin Dashboard**:
  - Restaurant profile & branding (logo, brand color, default language).
  - Menu management (categories drag-and-drop, multi-language item creation, per-weekday visibility).
  - Table & QR code management (auto-generated QR codes, PNG download).
  - Employee & schedule management (weekly calendar view).
  - Booking & preorder approval workflow.
  - Reports & analytics (sales, items, feedback, recommendations).
- **Customer Ordering Site**:
  - QR-driven session creation (table scan → new session).
  - Localized menu browsing (Japanese/English/Vietnamese).
  - Sorting/filtering by top seller, price, ratings.
  - Floating cart & cash-only checkout.
  - Booking & preordering form.
  - Thank-you page + dish review submission.
- **Internationalization (i18n)**: Native support for `ja`, `en`, `vi` via `next-intl`.
- **Feature Flags**: Enable or disable payments, AI chatbot, online reviews, low-stock alerts, table booking without refactoring.
- **Strong Security**:
  - Supabase Auth + custom JWT claims (`restaurant_id`, `role`).
  - Row-Level Security (RLS) on all tenant data.
  - Rate limiting on critical endpoints.
  - CAPTCHA on auth flows.
  - Web Application Firewall (WAF) via Vercel.
- **Modern UI**:
  - Tailwind CSS + shadcn/ui components.
  - lucide-react icons.
  - Responsive, mobile-first design.
- **Testing & CI/CD**:
  - Jest & React Testing Library for unit/integration tests.
  - ESLint, Prettier, `npm audit`.
  - GitHub Actions → Vercel deployment (staging on `develop`, production on `main`).

---

## Tech Stack

- **Framework**: Next.js (App Router, Server & Client Components)
- **Styling**: Tailwind CSS, shadcn/ui
- **Icons**: lucide-react
- **Language**: TypeScript
- **Forms & Validation**: React Hook Form + Zod
- **i18n**: next-intl
- **Backend & Auth**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **Deployment**: Vercel (Frontend), Supabase (Database & Functions)
- **Linting & Formatting**: ESLint, Prettier
- **Testing**: Jest, React Testing Library
- **CI/CD**: GitHub Actions → Vercel

---

## Getting Started

### Prerequisites

- Node.js ≥ 18.x
- npm (or yarn)
- A Supabase project with the following enabled:
  - Postgres (with UUID extension, RLS)
  - Supabase Auth (with email/password, custom JWT claims)
  - Supabase Storage (`restaurant-uploads` bucket)
  - pg_cron (for scheduled SQL functions)
- Vercel account for deployment (wildcard domain configured).

### Environment Variables

Create a `.env.local` (never commit secrets) with the following keys:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
UPSTASH_REDIS_URL=your_upstash_redis_url
UPSTASH_REDIS_TOKEN=your_upstash_redis_token
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_qstash_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_qstash_next_signing_key

SUPABASE_READ_REPLICA_URL=your_read_replica_or_api_load_balancer_url

SENTRY_DSN=your_server_sentry_dsn
NEXT_PUBLIC_SENTRY_DSN=your_browser_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_source_map_upload_token

NEXT_PUBLIC_CAPTCHA_SITE_KEY=your_captcha_site_key
NEXT_PRIVATE_CAPTCHA_SECRET=your_captcha_secret_key

NEXT_PUBLIC_FEATURE_PAYMENTS=false
NEXT_PUBLIC_FEATURE_AI=false
NEXT_PUBLIC_FEATURE_REVIEWS=true
NEXT_PUBLIC_FEATURE_LOWSTOCK=true
NEXT_PUBLIC_FEATURE_TABLEBOOKING=true

# If enabling payments later:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PRIVATE_STRIPE_SECRET_KEY=your_stripe_secret_key

# If enabling AI later:
NEXT_PRIVATE_OPENAI_API_KEY=your_openai_api_key
```

`UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` are required in production. The app intentionally fails startup in production without them so auth and mutation rate limits cannot fall back to process-local memory on serverless infrastructure.

`SUPABASE_READ_REPLICA_URL`, Sentry, and QStash values are optional for local development but required before marking the Phase 2/3 scale plan complete in staging or production. Without them the code falls back to safe primary reads or skipped background dispatch, and the status must remain partial.

Refer to `/web/.env.example` for a template. CI/CD pipelines must inject real production/staging secrets—do not commit `.env.local`.

### Installation

1. Clone this repository and navigate to the `web` folder:

   ```bash
   git clone https://github.com/your-org/coorder.git
   cd coorder/web
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

   or

   ```bash
   yarn install
   ```

### Development

To run the development server (with hot reload and mock subdomain routing):

```bash
npm run dev
```

- The default locale is Japanese (`/ja`).
- To preview English or Vietnamese, navigate to `http://localhost:3000/en` or `http://localhost:3000/vi`.
- To simulate a restaurant’s subdomain locally, add an entry in `/etc/hosts`:

  ```
  127.0.0.1   restaurantabc.localhost
  ```

  Then visit `http://restaurantabc.localhost:3000/ja/signup` for signup.

### Building & Deployment

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run start
```

**Vercel Deployment**:

- On push to `develop`, GitHub Actions triggers deploy to the `staging.coorder` environment (staging Supabase project).
- On push to `main`, deploy to `coorder` (production Supabase project).
- Ensure your Vercel settings include:

  - Wildcard domain `*.coorder`
  - Environment variables matching those in `.env.local` (staging vs. production).

---

## Folder Structure

```
/web
├── app
│   ├── (admin)                                 // Route group for admin
│   │   └── [locale]
│   │       └── dashboard
│   │           ├── layout.tsx                  // Admin Protected Layout
│   │           ├── page.tsx                    // Dashboard Home
│   │           ├── settings
│   │           │   └── page.tsx                // Restaurant Settings Page
│   │           ├── menu
│   │           │   ├── page.tsx                // Menu Management List
│   │           │   ├── new                     // Add Category Page
│   │           │   │   └── page.tsx
│   │           │   ├── [categoryId]
│   │           │   │   ├── edit
│   │           │   │   │   └── page.tsx        // Edit Category Page
│   │           │   │   └── items
│   │           │   │       ├── new
│   │           │   │       │   └── page.tsx    // Add Menu Item Page
│   │           │   │       └── [itemId]
│   │           │   │           └── edit
│   │           │   │               └── page.tsx // Edit Menu Item Page
│   │           ├── tables
│   │           │   └── page.tsx                // Table List
│   │           │   // ... other table CRUD pages & QR page
│   │           ├── employees
│   │           │   └── page.tsx
│   │           │   // ... other employee CRUD pages & schedule page
│   │           ├── bookings
│   │           │   └── page.tsx
│   │           └── reports
│   │               └── page.tsx
│   ├── (customer)                              // Route group for customer
│   │   └── [locale]
│   │       └── customer
│   │           ├── layout.tsx                  // Customer Layout
│   │           ├── page.tsx                    // Customer Menu/Landing Page (QR/Session handling)
│   │           ├── checkout
│   │           │   └── page.tsx
│   │           ├── thank-you
│   │           │   └── page.tsx
│   │           ├── review
│   │           │   └── [menuItemId]
│   │           │       └── page.tsx
│   │           └── booking
│   │               └── page.tsx
│   ├── api
│   │   └── v1
│   │       ├── restaurant
│   │       │   └── exists
│   │       │       └── route.ts
│   │       ├── subdomain
│   │       │   └── check
│   │       │       └── route.ts
│   │       ├── register
│   │       │   └── route.ts
│   │       ├── menu
│   │       │   └── reorder
│   │       │       └── route.ts
│   │       ├── sessions
│   │       │   └── create
│   │       │       └── route.ts
│   │       ├── orders
│   │       │   └── create
│   │       │       └── route.ts
│   │       ├── bookings
│   │       │   └── create
│   │       │       └── route.ts
│   │       └── reviews
│   │           ├── create
│   │           │   └── route.ts
│   │           └── resolve
│   │               └── route.ts
│   ├── [locale]
│   │   ├── layout.tsx                          // Locale specific layout
│   │   └── page.tsx                            // Root public page (e.g. main landing if any, or redirect)
│   │   // ... login, signup pages
│   └── layout.tsx                              // Root Layout
├── components
│   ├── common                                  // General reusable components
│   │   ├── language-switcher.tsx
│   │   ├── star-rating.tsx
│   │   ├── icon.tsx
│   │   └── qrcode-display.tsx
│   ├── layout                                  // Layout specific components
│   │   ├── admin-header.tsx
│   │   ├── admin-sidebar.tsx
│   │   ├── protected-layout.tsx
│   │   ├── customer-header.tsx
│   │   └── customer-footer.tsx
│   ├── providers                               // Context providers
│   │   ├── theme-provider.tsx
│   │   └── cart-provider.tsx
│   ├── features                                // Feature-specific components
│   │   ├── admin
│   │   │   ├── dashboard
│   │   │   │   └── stat-card.tsx
│   │   │   ├── settings
│   │   │   │   └── settings-form.tsx
│   │   │   ├── menu
│   │   │   │   ├── category-list.tsx
│   │   │   │   ├── category-form.tsx
│   │   │   │   ├── menu-item-card.tsx
│   │   │   │   ├── menu-item-form.tsx
│   │   │   │   └── weekday-selector.tsx
│   │   │   // ... other admin feature components
│   │   └── customer
│   │       ├── menu
│   │       │   ├── customer-menu-client.tsx
│   │       │   └── customer-menu-item-card.tsx
│   │       ├── checkout
│   │       │   └── checkout-client.tsx
│   │       ├── booking
│   │       │   └── booking-form.tsx
│   │       └── review
│   │           └── review-form.tsx
│   └── ui                                      // Shadcn UI components (auto-generated)
├── i18n
│   ├── locales
│   │   ├── en.json
│   │   ├── ja.json
│   │   └── vi.json
│   └── index.ts                                // next-intl config
├── lib
│   ├── i18n.ts                                 // next-intl middleware config (if needed separately)
│   ├── restaurant.ts                           // Helpers for restaurant data (subdomain -> ID)
│   ├── supabase
│   │   ├── client.ts                           // Supabase browser client
│   │   └── admin.ts                            // Supabase admin client (service_role)
│   └── utils.ts                                // General utility functions
├── middleware.ts                               // Next.js middleware for subdomain & auth
├── public
├── shared                                      // For Zod schemas, types
│   └── schemas
│       ├── settings-schema.ts
│       ├── category-schema.ts
│       └── menu-item-schema.ts
│       // ... other schemas
└── config
    └── feature-flags.ts
```

- **`/app/[locale]/dashboard`**: Admin Dashboard pages (Server + Client Components).
- **`/app/[locale]/customer`**: Customer Ordering pages.
- **`/app/[locale]/signup`, `/login`**: Tenant registration & authentication.
- **`/app/api/v1` & `/api/v2`**: Edge Functions and API routes (v1 = stable, v2 = breaking/new).
- **`/components`**: Reusable UI components (buttons, forms, cards, charts).
- **`/config/feature-flags.ts`**: Defines feature flags read from environment.
- **`/lib`**: Helpers for Supabase, logging, tenant context.
- **`/shared/schemas`**: Zod schemas shared between frontend and API.
- **`/i18n/locales`**: Translation JSON files for `ja`, `en`, `vi`.

---

## UI/UX Conventions

### Layout & Styling

- **Framework**: Next.js App Router + Server Components for data fetching.
- **Styling**: Tailwind CSS + `shadcn/ui` components. Always use existing `shadcn/ui` components (Card, Button, Input, Select, Modal, etc.) for consistent appearance.
- **Brand Color**: Each restaurant’s brand color (hex code) is applied via a CSS variable (e.g., `--brand-color`) at runtime. Use `bg-[var(--brand-color)]` or the `Button`’s `intent="primary"` variant to style primary actions.
- **Spacing & Typography**:

  - Padding: use multiples of 4 (`p-4`, `px-6`, `py-8`).
  - Font sizes: `text-2xl` for page titles, `text-xl` for section headings, `text-base` for body text, `text-sm` for captions.
  - Rounded corners: `rounded-2xl` on cards and buttons.
  - Shadows: `shadow-lg` on modals, cards, and popovers.

### Components & Icons

- **shadcn/ui**:

  - Import from `@/components/ui` (e.g., `Button`, `Card`, `Dialog`, `Tabs`, `DataTable`).
  - Leverage built-in variants (`primary`, `secondary`, `destructive`) for buttons.
  - Use `Dialog` or `Modal` for all “Add/Edit” forms, confirm dialogs, and checkout flow.

- **lucide-react**:

  - Use icons imported directly, e.g. `import { Plus, Pencil, Trash2, Calendar, ChartPie } from "lucide-react"`.
  - Keep icon size at `20px`–`24px` for buttons or `32px` for section headers.
  - Always provide an `aria-label` on icon‐only buttons (e.g., `<Button aria-label={t("ADD_CATEGORY")}><Plus /></Button>`).

### Forms & Validation

- **React Hook Form + Zod**:

  - All forms (signup, login, menu item, booking, review, settings) use React Hook Form with a Zod resolver.
  - Define schemas in `/shared/schemas`, import in both client and API.
  - Show inline error messages under each field in red (`text-red-600`).
  - Disable “Submit” until form is valid and any file uploads have completed.

### Internationalization

- **next-intl**:

  - Wrap root `layout.tsx` in `NextIntlClientProvider`, loading messages from `/i18n/locales/{locale}.json`.
  - All text uses `const t = useTranslations("namespace.key")` or `<FormattedMessage id="namespace.key" />`.
  - Language switcher in header (`<LanguageSwitcher />`) switches locale without losing query params.
  - Date/number formatting via `Intl.DateTimeFormat(locale)` and `Intl.NumberFormat(locale, { style: "currency", currency: "JPY" })`.

### Feature Flags

- **`/config/feature-flags.ts`** exports `FEATURE_FLAGS` object.
- Gate entire sections with flags:

  ```tsx
  if (!FEATURE_FLAGS.tableBooking) {
    return <ComingSoon message={t("TABLE_BOOKING_COMING_SOON")} />;
  }
  ```

- Hide tabs or pages entirely when flags are off.

---

## API & Data Layer

### Supabase Integration

- **Supabase Client** (`lib/supabaseAdmin.ts` for server, `lib/supabaseClient.ts` for client).
- **Server Components** use `supabaseAdmin` (service role key) to fetch tenant data in `getServersideProps`–style or `cache()` calls.
- **Client Components** use `createServerComponentClient` or `createClientComponentClient` (from `@supabase/auth-helpers-nextjs`) with the user’s JWT for RLS-protected queries.
- **Canonical bootstrap** now lives under `/supabase` at the repository root (`bootstrap.sql`, `sql/*`, `functions/*`).

### Row-Level Security (RLS)

- Every tenant-scoped table (e.g., `menu_items`, `orders`, `bookings`) has RLS enabled.
- Policies require `restaurant_id = auth.jwt() →> 'restaurant_id'` for all CRUD operations.
- Supabase Storage bucket `restaurant-uploads` uses org-aware and branch-aware RLS for `restaurants/{restaurant_id}/…` and `organizations/{organization_id}/…` asset paths.

---

## Testing

- **Unit & Integration**:

  - Jest and React Testing Library tests live under `/web/__tests__`.
  - Examples:

    - RLS Protection test: verify client with Restaurant A’s JWT cannot fetch Restaurant B’s data.
    - Signup form validation (invalid subdomain, missing CAPTCHA).
    - Order creation API validation (invalid sessionId, unavailable item).
    - Internationalization tests for English/Vietnamese.
    - Feature flag rendering: hide payment UI when disabled.

- **Linting & Formatting**:

  - Run `npm run lint` (ESLint) and `npm run format:check` (Prettier).
  - All code must pass without warnings.

- **Security Audit**:

  - Run `npm audit` and fail on high or critical vulnerabilities.

### Sample Test Commands

```bash
npm run lint
npm run test
npm run format:check
npm audit --audit-level=high
```

---

## Contributing

1. **Fork & Branch**: Create a feature branch off `develop` (e.g., `feature/menu-reorder`).
2. **Coding Conventions**:

   - Follow `.eslintrc.js` rules.
   - Use `shadcn/ui` components and `lucide-react` icons only—do not introduce new UI libraries.
   - Write all new UI in TypeScript with strict typing.
   - Add translations for any UI text in all three locales (`ja.json`, `en.json`, `vi.json`).

3. **Pull Request**:

   - Base your PR against `develop`.
   - Ensure all tests pass, linting/formatting checks pass, and no security vulnerabilities are introduced.
   - Describe your changes and reference related issues.

---

## License

This project is licensed under the [MIT License](LICENSE).

```

```
