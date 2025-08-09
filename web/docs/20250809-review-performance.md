1. Home page waits for client-side subdomain detection and data fetch
app/[locale]/page.tsx determines the subdomain in a useEffect and only then renders NewHomePage, which itself performs another useEffect fetch for restaurant data. This double round‑trip delays initial paint

2. Menu page performs redundant data fetches before showing menu
MenuPageClient.tsx fetches menu categories in a useEffect, then SmartMenu calls useMenuData which fetches the same data again via React Query, creating unnecessary latency

3. Menu API returns large payload without caching
/api/v1/customer/menu selects full descriptions, images, sizes, toppings, etc., for all menu items on every request. This heavy payload contributes to slow responses and long rendering time

4. Restaurant data API performs multiple expensive queries on each home page load
/api/v1/restaurant/data first calls a Supabase RPC for homepage data, then executes a separate query for categories and menu items, which adds latency for every request