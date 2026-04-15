## 2025-05-22 - [RLS Bypass in Profile Update]
**Vulnerability:** The `PUT /api/v1/user/profile` endpoint used the `supabaseAdmin` client (service role) to update user data, bypassing Row Level Security (RLS). It also incorrectly attempted to use `supabaseAdmin.auth.getUser()` in a stateless environment where the admin client lacked session context.
**Learning:** Using the service role key (`supabaseAdmin`) for routine user operations is a "Defense in Depth" violation and can lead to accidental privilege escalation if the application logic has flaws.
**Prevention:** Always use the standard SSR client (`createClient()`) and established session helpers (`getUserFromRequest()`) for user-initiated data mutations to ensure RLS is correctly enforced by the database.
