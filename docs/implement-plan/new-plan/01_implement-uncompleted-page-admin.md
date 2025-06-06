## Uncompleted Admin Dashboard Feature Implementation Plan
This document outlines the tasks required to replace the mock UI under /web/app/[locale]/dashboard with fully functional pages that meet the security and workflow requirements described in implementation-guideline.md and the requirements checklist. Each section below corresponds to one feature folder inside dashboard/.

1. Restaurant Settings
Fetch the current restaurant using the subdomain from middleware and getRestaurantSettingsFromSubdomain.
Implement form submission using Zod validation as in docs/requirements-checklist.md §4.
Upload logo files to restaurant-uploads/restaurants/{restaurant_id}/logos/logo.png with Supabase Storage and update logo_url.
Ensure writes check (restaurant_id = auth.jwt()->>'restaurant_id') via RLS.
After saving, refresh the page and show success/error toasts.

2. Menu Management
Replace mock category and item lists with data from Supabase as detailed in docs/implement-plan/detailed-implementation-steps/04_admin-dashboard.md §4.3.
Add CRUD forms for categories and items with the Zod schemas shown in that document.
Handle image uploads under restaurant-uploads/restaurants/{restaurant_id}/menu_items/{item_id}.jpg.
Gate low‑stock alerts and related UI behind FEATURE_FLAGS.lowStockAlerts.
All API routes must enforce RLS and validate input.

3. Table Management
List tables from tables table using tenant‑scoped queries.
Create/Edit forms with the tableSchema from the implementation plan (§4.4.2).
Generate QR codes that link to the customer ordering page as described in §4.4.3, with PNG download support.

## General Guidelines
- Every form must use Zod for input validation and display errors accordingly.
- All API endpoints should check the caller’s JWT for restaurant_id and enforce row‑level security.

- Rate limit critical actions such as booking creation, order creation, and authentication, following the pattern in - implementation-guideline.md §2.2.

- Internationalize all text with next-intl keys matching the existing mock UI.
- Keep feature‑flag checks (payments, AI assistant, reviews, low-stock alerts, table booking) as described in /config/feature-flags.ts.

- After every modifying or updating to the code, you must run build the web app to check any type errors or complier errors.
Here are the step.