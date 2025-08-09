## web/app/[locale]/(restaurant)/dashboard/admin-layout-client.tsx Lines 69-76
Issue 1: Dynamic style injection without sanitization
admin-layout-client.tsx embeds restaurantSettings.primaryColor directly into a <style> tag, opening the door to CSS or script injection if the value is not strictly validated

## web/app/[locale]/(restaurant)/dashboard/dashboard-client-content.tsx Lines 52-73
Issue 2: Multiple dashboard fetches increase latency
dashboard-client-content.tsx makes five independent API requests on initial load, which may slow rendering and increase bandwidth usage


## web/app/api/v1/owner/orders/route.ts Lines 106-124,147-215, 293-349
Issue 3: Missing rate limiting and CSRF protection
State‑changing API routes (e.g., orders/route.ts POST) rely solely on session cookies and lack rate limiting or CSRF defenses

Issue 4: N+1 queries and no transaction in order creation
orders/route.ts performs multiple sequential Supabase calls for each order item (menu item, size, toppings), leading to N+1 query inefficiency and partial writes if errors occur mid-way

Issue 5: Unvalidated query parameters in orders GET
Query parameters such as fromDate, toDate, status, and period are parsed directly without validation or limits, allowing expensive or malformed queries


## web/app/api/v1/owner/categories/route.ts Lines 31-77, Lines 79-85
Issue 6: Categories endpoint returns unbounded data
categories/route.ts retrieves all categories, nested menu items, toppings, and sizes without pagination or limits, potentially generating very large payloads

Issue 7: Detailed error messages leaked to clients
Several API routes return raw error.message to the client, exposing internal details (e.g., categories/route.ts uses details: error.message)