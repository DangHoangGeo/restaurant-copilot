# Shop-Copilot Web Features Review

This document summarizes the current state of the `web` application in comparison with the high level requirements outlined in `docs/requirements-checklist.md` and `docs/overview.md`.

## Implemented Features

- **Multi-tenant subdomain handling** – `middleware.ts` parses the hostname and validates subdomains through `/api/v1/restaurant/exists`【F:web/middleware.ts†L20-L68】.
- **Basic auth flows** – `/api/v1/auth/register` and `/api/v1/auth/login` implement CAPTCHA verification and token‑bucket rate limiting【F:web/app/api/v1/auth/register/route.ts†L11-L43】【F:web/app/api/v1/auth/login/route.ts†L10-L33】. JWTs are issued and stored in cookies.
- **Restaurant settings API** – `/api/v1/restaurant/settings` allows fetching and updating restaurant profile data with Zod validation【F:web/app/api/v1/restaurant/settings/route.ts†L1-L71】【F:web/app/api/v1/restaurant/settings/route.ts†L72-L139】.
- **Menu management** – Categories and items are created via React Hook Form components such as `CategoryForm` and `MenuItemForm`【F:web/components/features/admin/menu/CategoryForm.tsx†L1-L62】 and persisted through `/api/v1/categories`【F:web/app/api/v1/categories/route.ts†L1-L116】.
- **Table, employee and schedule APIs** – endpoints exist under `/api/v1/tables`, `/api/v1/employees`, and `/api/v1/schedules` for CRUD operations with RLS checks and validation.
- **Customer ordering UI skeleton** – `customer-client-content.tsx` renders a localized menu, booking form and floating cart. Feature flags hide the booking interface if disabled【F:web/app/[locale]/customer/customer-client-content.tsx†L368-L803】.
- **Database schema and RLS** – `infra/migrations/001_init.sql` defines all core tables (restaurants, users, categories, menu_items, tables, employees, schedules, orders, order_items, reviews, feedback, inventory_items, analytics_snapshots, chat_logs, bookings) along with row‑level security policies【F:infra/migrations/001_init.sql†L1-L230】【F:infra/migrations/001_init.sql†L160-L234】. Audit logging triggers are created in `002_audit_logs.sql`【F:infra/migrations/002_audit_logs.sql†L1-L41】.

## Partially Implemented or Missing

- **Repository structure** – The root lacks the `/shared` and `/config` folders required by the guidelines. Feature flags are defined under `web/config` instead of a top level `config` directory.
- **Environment example file** – `/web/.env.example` is missing although documented in the README.
- **Order processing, booking APIs and reviews** – there are no API routes for orders, bookings or review creation yet. The customer UI contains placeholders for these actions but they are not backed by server code.
- **Reports and analytics** – dashboard pages reference analytics data but the relevant API endpoints and scheduled jobs are not implemented.
- **Payments and AI assistant** – no code exists for Stripe/PayPay payments or the chat bot beyond feature flag stubs.
- **Automated tests and CI configuration** – the `web` package has no test scripts or GitHub Actions workflows. `npm test` fails because no test script is defined.

## Suggested Next Steps

1. **Create `/web/.env.example` and top level `/config`/`/shared` directories** aligning with the implementation guidelines.
2. **Complete order and booking flows** – implement `/api/v1/orders/create`, `/api/v1/bookings/create` and the related customer pages. Add Zod validation and RLS checks.
3. **Review & cleanup middleware** – ensure subdomain extraction handles production and localhost consistently. Add redirect logic for unknown subdomains.
4. **Implement analytics endpoints and reports** – generate daily snapshots (SQL function `generate_daily_snapshot`) and expose data to the dashboard via server components.
5. **Add automated testing** – configure Jest and React Testing Library. Provide tests for RLS protection, signup/login validation, and feature flag rendering.
6. **Set up GitHub Actions** – lint, format, run tests and deploy to Vercel. Include security scanning with `npm audit`.
7. **Prepare future modules** – scaffold payment and AI assistant APIs under `/api/v2` with feature flag checks, following the requirements checklist.

This review highlights the core pieces already present while indicating the substantial work remaining to meet the full specification.