# Customer Authentication Flows

## Summary

The platform provides several authentication mechanisms for customers (restaurant owners/admins): user registration (signup), login, a two-factor authentication (2FA) option, and a partially implemented password reset flow. Authentication is deeply integrated with Supabase Auth, but also utilizes a custom JWT for sessions initiated after 2FA verification. User accounts are associated with a specific restaurant and subdomain created during signup.

## How it works technically

### Frontend

Frontend authentication is handled by client components for each flow, typically involving forms, CAPTCHA verification, and API calls to the backend.

-   **Signup (`web/app/[locale]/signup/page.tsx`):**
    -   A client component using `react-hook-form` with `zodResolver` for input validation against `web/shared/schemas/signup.ts`.
    -   Fields: Name, Subdomain, Email, Password, Confirm Password, Default Language.
    -   **Subdomain Check**: Includes a debounced check for subdomain availability by calling `GET /api/v1/restaurant/check-subdomain` as the user types.
    -   **CAPTCHA**: Uses `ReCAPTCHA`. The token is verified by calling `POST /api/v1/verify-captcha` before attempting registration.
    -   **Submission**: Calls `POST /api/v1/auth/register` with user details. On success, redirects the user to the login page on their new subdomain.
-   **Login (`web/app/[locale]/login/page.tsx`):**
    -   A client component with a form for Email and Password.
    -   **CAPTCHA**: Uses `ReCAPTCHA`. Token is sent with login credentials.
    -   **Submission**: Calls `POST /api/v1/auth/login`.
        -   If the API response indicates `twoFactorRequired: true` and includes a `token` (a temporary JWT), the user is redirected to the `/two-factor` page with this token.
        -   Otherwise, on successful login, the API returns a `redirectUrl` (to the user's restaurant dashboard on their subdomain), and the page navigates there. Supabase's client library handles session cookie management.
-   **Two-Factor Authentication (`web/app/[locale]/two-factor/page.tsx`):**
    -   A client component that expects a temporary `token` (passed as a URL query parameter from the login page).
    -   Provides an input field for the Time-based One-Time Password (TOTP) code.
    -   **Submission**: Calls `POST /api/v1/auth/two-factor/verify` with the temporary `token` and the entered OTP `code`.
    -   On success, the API sets a custom `auth_token` cookie and returns a `redirectUrl`, to which the page navigates.
-   **Forgot Password (`web/app/[locale]/forgot-password/page.tsx`):**
    -   A client component with `ReCAPTCHA`.
    -   **Current Status**: The form submission logic is a placeholder and does not yet call the backend API. This feature is incomplete.

### Backend (API Routes & Supabase)

Backend authentication logic resides in API routes under `web/app/api/v1/auth/` and heavily utilizes Supabase Auth.

-   **User Registration (`POST /api/v1/auth/register`):**
    -   File: `web/app/api/v1/auth/register/route.ts`
    -   Rate-limited. Validates input using `signupSchema`.
    -   Checks if the chosen `subdomain` is already taken in the `restaurants` table.
    -   Creates an Auth user via `supabaseAdmin.auth.admin.createUser` (email is auto-confirmed).
    -   Inserts a new record into the `restaurants` table (name, subdomain, language).
    -   Updates the new Auth user's `app_metadata` with `subdomain`, `restaurant_id`, and `role: "owner"`.
    -   Inserts a corresponding record into the public `users` table (linking Supabase Auth ID, restaurant ID, email, name, role).
    -   Returns a `redirectUrl` to the login page on the newly created subdomain.
-   **Login (`POST /api/v1/auth/login`):**
    -   File: `web/app/api/v1/auth/login/route.ts`
    -   Rate-limited. Verifies CAPTCHA via `/api/v1/verify-captcha`.
    -   Authenticates using `supabase.auth.signInWithPassword`. Supabase handles session cookie creation.
    -   Retrieves the user's `restaurant_id` (from custom `users` table) and the restaurant's `subdomain` and `default_language` (from `restaurants` table).
    -   **2FA Check**: Fetches `two_factor_enabled` and `role` for the user. While it fetches this, the current logic does not explicitly halt login for users with 2FA to go through the OTP step; it seems the frontend `LoginPage` expects a specific response (`twoFactorRequired: true, token: ...`) to initiate that redirect. The API itself doesn't return this structure yet.
    -   Returns a `redirectUrl` to the dashboard on the restaurant's subdomain.
-   **Logout (`POST /api/v1/auth/logout`):**
    -   File: `web/app/api/v1/auth/logout/route.ts`
    -   Clears a custom cookie named `auth_token` by setting its `maxAge` to 0. This is likely for sessions established via 2FA. For Supabase-only sessions, `supabase.auth.signOut()` would be used on the client.
-   **Forgot Password (`POST /api/v1/auth/forgot-password`):**
    -   File: `web/app/api/v1/auth/forgot-password/route.ts`
    -   Rate-limited. Verifies CAPTCHA.
    -   **Current Status**: The actual password reset logic (e.g., sending a reset email via Supabase) is a placeholder. This feature is incomplete.
-   **Verify Two-Factor OTP (`POST /api/v1/auth/two-factor/verify`):**
    -   File: `web/app/api/v1/auth/two-factor/verify/route.ts`
    -   Verifies the temporary JWT `token` (passed from login page) and the submitted OTP `code` using `speakeasy.totp.verify` against the user's `two_factor_secret` (from `users` table).
    -   If valid, it generates a new custom JWT (`auth_token`) containing `userId`, `restaurantId`, and `subdomain`, signed with `process.env.JWT_SECRET`.
    -   Sets this `auth_token` in an HTTPOnly cookie with a 7-day expiry.
    -   Returns a `redirectUrl` to the dashboard.
-   **Get Session (`GET /api/v1/auth/session`):**
    -   File: `web/app/api/v1/auth/session/route.ts`
    -   Uses `getUserFromRequest` (which likely uses Supabase's server client to get the current user from session cookies) to return the authenticated user's data or a 401 error.
-   **CAPTCHA Verification (`POST /api/v1/verify-captcha` - not read but usage noted):**
    -   An internal API endpoint used by other auth routes to validate reCAPTCHA tokens.

-   **Supabase Helpers (`web/lib/supabase/`):**
    -   `client.ts`: Standard browser client for Supabase.
    -   `server.ts`: Standard server client for Supabase (used in Route Handlers, Server Components).
    -   `middleware.ts`:
        -   Manages Supabase session state using `@supabase/ssr`.
        -   **RLS Context**: Sets `app.current_restaurant_id` in the database session via RPC call `set_current_restaurant_id_for_session`, using the subdomain from the request host. This is crucial for multi-tenant data security.
        -   Redirects unauthenticated users to `/login` for protected paths (e.g., `/dashboard`).

### Data & Schemas

-   **Supabase `auth.users`**: Stores core user authentication data (email, password hash, etc.).
-   **Supabase `auth.identities`**: Stores user identity information.
-   **Custom `users` table**: Public table likely containing `id` (FK to `auth.users.id`), `restaurant_id` (FK to `restaurants.id`), `email`, `name`, `role`, `two_factor_secret`, `two_factor_enabled`.
-   **Custom `restaurants` table**: Stores restaurant-specific information including `id`, `subdomain`, `name`, `default_language`.
-   **Zod Schema (`web/shared/schemas/signup.ts`):**
    -   `signupSchema`: Validates `name`, `subdomain` (specific regex), `email`, `password`, `confirmPassword`, `defaultLanguage`, and `captchaToken`.

### Authentication State Management

-   For standard email/password logins without 2FA, authentication state appears to be managed by Supabase's default session cookies.
-   For logins with 2FA successfully verified, a custom JWT named `auth_token` is issued and used for session management.
-   The `getUserFromRequest` helper likely checks for both Supabase session and the custom `auth_token` to determine user status.

## Dependencies

-   Supabase (for Auth and Database)
-   `@supabase/ssr` (for server-side auth and middleware)
-   `jose` (for custom JWT generation and verification in 2FA flow)
-   `speakeasy` (for TOTP verification)
-   `react-google-recaptcha` (for CAPTCHA)
-   `zod` & `@hookform/resolvers/zod` (for form validation)
-   `react-hook-form` (for form handling)
-   `next-intl` (for internationalization)
-   `shadcn/ui` components (Button, Input, Label, etc.)

## File and Folder Paths

**Frontend Pages & Components:**
-   `web/app/[locale]/login/page.tsx`
-   `web/app/[locale]/signup/page.tsx`
-   `web/app/[locale]/forgot-password/page.tsx`
-   `web/app/[locale]/two-factor/page.tsx`

**API Routes (`web/app/api/v1/auth/`):**
-   `forgot-password/route.ts`
-   `login/route.ts`
-   `logout/route.ts`
-   `register/route.ts`
-   `session/route.ts`
-   `two-factor/verify/route.ts`
-   (Implicitly: `web/app/api/v1/verify-captcha/route.ts` and `web/app/api/v1/restaurant/check-subdomain/route.ts`)

**Supabase Helpers (`web/lib/supabase/`):**
-   `client.ts`
-   `middleware.ts`
-   `server.ts`

**Shared Schemas (`web/shared/schemas/`):**
-   `signup.ts`

## How to use or modify

### How a customer uses each authentication flow

1.  **Signup**:
    -   Fills out the registration form (name, desired subdomain, email, password, language).
    -   Completes CAPTCHA.
    -   Subdomain availability is checked as they type.
    -   On submission, an account and restaurant record are created. They are redirected to the login page on their new subdomain.
2.  **Login**:
    -   Enters email and password.
    -   Completes CAPTCHA.
    -   If 2FA is not enabled/required by API logic: Redirected to their restaurant's dashboard. Session managed by Supabase.
    -   If 2FA is required by API logic: Redirected to the `/two-factor` page with a temporary token.
3.  **Two-Factor Authentication**:
    -   Enters the OTP from their authenticator app.
    -   On successful verification, a custom `auth_token` cookie is set, and they are redirected to the dashboard.
4.  **Logout**:
    -   User clicks logout. The `/api/v1/auth/logout` endpoint is called, which clears the `auth_token` cookie. Client-side Supabase logout (`supabase.auth.signOut()`) would also be needed to clear Supabase session.
5.  **Forgot Password**:
    -   User enters email and CAPTCHA.
    -   (Currently Incomplete) Intended to send a password reset link.

### How a developer might add a new social login provider (e.g., Google)

1.  **Supabase Console Configuration**:
    -   Enable the desired social provider (e.g., Google) in the Supabase Auth settings.
    -   Provide the necessary Client ID and Client Secret from the provider's developer console.
    -   Configure the redirect URI in both Supabase and the provider's console (e.g., `https://<your-site>/api/auth/callback`).
2.  **Frontend Changes (`web/app/[locale]/login/page.tsx` and potentially `signup/page.tsx`):**
    -   Add a "Sign in with Google" button.
    -   When clicked, call `supabase.auth.signInWithOAuth({ provider: 'google' })` from `web/lib/supabase/client.ts`. This will redirect the user to Google's authentication page.
3.  **Callback Handling**:
    -   Supabase handles the OAuth callback to `/api/auth/callback` (a default Supabase endpoint, usually no custom backend code needed for this specific callback unless extra processing is required post-authentication).
    -   After successful authentication, the user is redirected back to your application, typically to a specified page or the page they were on. The Supabase client library will manage the session.
4.  **User Profile Creation/Linking (Backend - Potentially `register/route.ts` or a webhook):**
    -   When a user signs up/in with a social provider for the first time, a new user is created in `auth.users`.
    -   You'll need logic to:
        -   Create a corresponding entry in your public `users` table.
        -   Associate them with a `restaurant_id`. This is tricky for social logins initiating restaurant creation. The current signup flow is designed for creating a new restaurant/subdomain. A social login might be for joining an existing restaurant or a modified signup flow would be needed.
        -   If it's a new restaurant, the subdomain creation logic from the current `register` route would need to be adapted or triggered.
        -   If the email from social login matches an existing user, you might link the social identity to that existing user account (Supabase might handle some of this).
5.  **Middleware (`web/lib/supabase/middleware.ts`):**
    -   Ensure the middleware correctly handles sessions established via OAuth. `supabase.auth.getUser()` should work correctly for these sessions.
6.  **Environment Variables**:
    -   Store any public keys or client IDs for the social provider in `NEXT_PUBLIC_` environment variables if needed on the client, and secret keys in server-side environment variables.

Adding social login for a system where users also create unique subdomains/restaurants requires careful consideration of the user flow:
-   Does social login create a new restaurant, or is it for users joining existing ones?
-   How is the subdomain chosen or assigned if a new restaurant is created via social login?
The current `register` API is tightly coupled with subdomain creation and password setup.
