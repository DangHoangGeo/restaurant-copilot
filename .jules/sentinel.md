## 2025-05-22 - [RLS Bypass in Profile Update]
**Vulnerability:** The `PUT /api/v1/user/profile` endpoint used the `supabaseAdmin` client (service role) to update user data, bypassing Row Level Security (RLS). It also incorrectly attempted to use `supabaseAdmin.auth.getUser()` in a stateless environment where the admin client lacked session context.
**Learning:** Using the service role key (`supabaseAdmin`) for routine user operations is a "Defense in Depth" violation and can lead to accidental privilege escalation if the application logic has flaws.
**Prevention:** Always use the standard SSR client (`createClient()`) and established session helpers (`getUserFromRequest()`) for user-initiated data mutations to ensure RLS is correctly enforced by the database.

## 2026-04-22 - [Unreliable listUsers() for Auth Checks]
**Vulnerability:** Using `supabaseAdmin.auth.admin.listUsers()` to check for user existence before invite acceptance was unreliable and insecure. It only returned the first page (50 users), leading to false negatives where existing users were incorrectly identified as "new".
**Learning:** Auth-level pagination can hide users from simple in-memory searches, breaking logic that depends on global user state.
**Prevention:** Query the indexed `public.users` table or use `auth.admin.getUserByEmail()` for targeted existence checks instead of scanning a list.

## 2025-05-24 - [Unprotected Public Mutation Endpoints]
**Vulnerability:** Several public-facing or customer-facing mutation endpoints (e.g., `/api/v1/customer/reviews/create`) lacked rate limiting and CSRF protection, making them susceptible to automated spam and DoS attacks.
**Learning:** While internal owner APIs were mostly protected, newer customer-facing features were inconsistently applying the `protectEndpoint` middleware.
**Prevention:** All state-changing API endpoints (POST, PUT, PATCH, DELETE) must explicitly call `protectEndpoint` at the start of their handlers to enforce baseline security guardrails.
