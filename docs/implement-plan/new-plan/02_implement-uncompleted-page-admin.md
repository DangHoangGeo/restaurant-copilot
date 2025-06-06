Uncompleted Admin Dashboard Feature Implementation Plan
This document outlines the tasks required to replace the mock UI under /web/app/[locale]/dashboard with fully functional pages that meet the security and workflow requirements described in implementation-guideline.md and the requirements checklist. Each section below corresponds to one feature folder inside dashboard/.

After every modifying or updating to the code, you must run build the web app to check any type errors or complier errors.
Here are the step.

1. Employee & Schedule Management
Implement employee directory and CRUD operations following §4.5.1 of the implementation plan.
Use Zod to validate role and user email; verify the user belongs to the same restaurant before inserting.
Build weekly schedule calendar per §4.5.2 with API routes guarded by RLS.

2. Bookings Management
Replace mock bookings table with real data from bookings table.
Provide actions to confirm or cancel a booking. Update status via an authenticated API route.
Apply feature flag FEATURE_FLAGS.tableBooking to hide the entire section when disabled.
Use server‑side validation and rate‑limited Edge Functions for /api/v1/bookings/create as noted in the security guidelines.

3. Reports & Analytics
Populate dashboard cards and report tabs using queries and RPCs from §4.6 of the implementation plan.
Ensure each query filters by restaurant_id and respects RLS.
Allow CSV/PDF exports only after validating user session.

## General Guidelines
- Every form must use Zod for input validation and display errors accordingly.
- All API endpoints should check the caller’s JWT for restaurant_id and enforce row‑level security.

- Rate limit critical actions such as booking creation, order creation, and authentication, following the pattern in - implementation-guideline.md §2.2.

- Internationalize all text with next-intl keys matching the existing mock UI.
- Keep feature‑flag checks (payments, AI assistant, reviews, low-stock alerts, table booking) as described in /config/feature-flags.ts.

- After every modifying or updating to the code, you must run build the web app to check any type errors or complier errors.
Here are the step.