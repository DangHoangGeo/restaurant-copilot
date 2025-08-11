# Security Architecture and Compliance Notes

This document outlines the security measures implemented within the web application, providing a reference for development standards and compliance considerations (e.g., SOC2, ISO27001).

## 1. Authentication

- **Mechanism:** Authentication is handled via Supabase Auth, which uses JSON Web Tokens (JWTs). Clients receive a JWT upon successful login, which is then sent with each subsequent API request.
- **Session Management:** The session is managed by the `supabase-ssr` library, which securely stores the JWT in browser cookies and refreshes it automatically.
- **Protection:** All sensitive API endpoints and dashboard pages are protected and require a valid JWT.

## 2. Authorization

Authorization is enforced at multiple layers to ensure robust access control:

- **Role-Based Access Control (RBAC):**
  - A centralized RBAC system is defined in `web/lib/server/rolePermissions.ts`.
  - User roles (`owner`, `manager`, `chef`, `server`) have specific permissions for accessing and manipulating resources (e.g., only `owner` and `manager` can edit `settings`).
  - The `createApiHandler` wrapper ensures that every API call is checked against these permissions.

- **Row-Level Security (RLS):**
  - Supabase RLS is enabled on all sensitive tables in the database.
  - The middleware (`web/middleware.ts`) sets the `app.current_restaurant_id` for each session, ensuring that database queries are automatically scoped to the user's restaurant. This is the primary defense against data leakage between tenants.

- **Application-Level Checks:**
  - In addition to RLS, all database queries made through the API explicitly include a `where('restaurant_id', '=', user.restaurantId)` clause as a defense-in-depth measure.

## 3. Input Validation and Sanitization

- **Schema Validation:** All incoming data to mutating API endpoints (`POST`, `PUT`, `PATCH`) is validated against a strict Zod schema. Schemas are defined in `web/shared/schemas/`.
- **Sanitization:** Basic sanitization is performed as part of the validation process. For example, all string inputs have leading/trailing whitespace removed using `.trim()`.
- **Rejection:** Requests with data that does not conform to the schema are rejected with a `400 Bad Request` error, and details of the validation failure are logged.

## 4. API Endpoint Security

A centralized API handler (`web/lib/server/apiHandler.ts`) wraps all owner API endpoints to enforce uniform security measures.

- **Cross-Site Request Forgery (CSRF) Protection:**
  - All mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) are protected against CSRF attacks.
  - The frontend is expected to send a custom header (`x-owner-csrf: owner-request`) with these requests.
  - The backend validates the `Origin` and `Referer` headers for same-origin requests.
  - Failed CSRF checks result in a `403 Forbidden` response and are logged.

- **Rate Limiting:**
  - All API endpoints are protected by a rate limiter to prevent abuse.
  - An in-memory token bucket algorithm is used, with separate limits for queries and mutations.
  - Rate limiting is based on a hash of the user's IP address and User-Agent.
  - Exceeding the rate limit results in a `429 Too Many Requests` response with a `Retry-After` header.

- **Security Headers:**
  - The middleware adds several important security headers to every response, including:
    - `Content-Security-Policy` (CSP) to prevent XSS attacks.
    - `Strict-Transport-Security` (HSTS) to enforce HTTPS.
    - `X-Frame-Options` to prevent clickjacking.
    - `X-Content-Type-Options` to prevent MIME-sniffing.

## 5. Error Handling and Auditing

- **Centralized Error Handling:** All errors in the API are caught by the `handleApiError` utility, ensuring consistent error responses.
- **Request IDs:** Every API request is assigned a unique `requestId`, which is included in both success and error responses, as well as in all log entries. This allows for effective tracing and auditing.
- **Secure Error Messages:** Raw error details and stack traces are never sent to the client in a production environment. Clients receive generic, safe error messages.
- **Structured Logging:** All security-relevant events (e.g., failed logins, authorization failures, rate limit exceeded, CSRF failures) are logged with a structured context, including `requestId`, `userId`, and `restaurantId`. This provides a clear audit trail for security monitoring and incident response.
