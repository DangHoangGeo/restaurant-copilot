You are an expert UX/UI designer tasked with creating a modern, mobile-first web interface for “CoOrder,” a multi-tenant SaaS platform for small restaurants. The frontend must be built with Next.js (App Router), Tailwind CSS, and TypeScript, and must satisfy all of these requirements:

1. **Multi-Tenant & Subdomain Awareness**

   * Each restaurant has its own subdomain (e.g. `restaurantabc.coorder`).
   * All navigation, API calls, and visual branding should adapt automatically based on the tenant’s subdomain.
   * Owners log in at their subdomain to access the Admin Dashboard; customers access via `/[locale]/customer` on that same subdomain.

2. **Internationalization (i18n) from Day One**

   * Support Japanese (`ja`), English (`en`), and Vietnamese (`vi`).
   * All UI text, labels, error messages, placeholders, buttons, and tooltips use `next-intl`.
   * Locale selected via URL prefix (`/ja`, `/en`, `/vi`) and a visible language switcher in both Admin and Customer UIs.

3. **Admin Dashboard Structure**

   * Protected behind Supabase Auth and RLS.
   * Main sidebar (collapsible on mobile) with links:

     1. **Dashboard Home** (overview cards: Today’s sales, Active orders, Top seller, Low-stock alerts)
     2. **Restaurant Settings** (profile: name, logo upload, brand color, default language, contact info)
     3. **Menu Management**

        * Categories list (drag-and-drop reorder)
        * Within each category: list of items, with localized name/description, price, availability toggle, weekday-visibility tags, image thumbnail, edit/delete.
        * “Add Category” and “Add Item” modals or pages with full Zod-validated forms (multi-language inputs, price, tags, availability checkboxes for Mon–Sun, image upload).
     4. **Table & QR Code Management**

        * Tables list (name, optional position), with “Edit” and “Generate QR” actions.
        * On “Generate QR”: show a 256×256 QR code for `/{locale}/customer/order?tableId={id}`, plus a “Download PNG” button.
     5. **Employees & Schedules**

        * Employees list (join to Users), with name, email, role (chef/server/cashier/manager), edit/delete.
        * “Add Employee” form that looks up existing user by email.
        * Schedule calendar: weekly grid (Mon–Sun, 06:00–23:00) showing each employee’s shifts; form or drag interface to add/edit/delete shifts.
     6. **Bookings & Preorders**

        * Pending bookings list: customer name, contact, date/time, party size, status badge (pending/confirmed/canceled).
        * Booking details page shows any preorder items (with localized names and quantities); buttons to “Confirm” or “Cancel.”
     7. **Reports & Analytics**

        * **Reports Home** with four summary cards:
          • Today’s Total Sales
          • Active Orders Count
          • Today’s Top-Selling Item
          • Low-Stock Alerts
        * **Sales Report Tab**: date-range selector (Last 7 days/30 days), bar chart of daily revenue, pie/bar chart of category breakdown, CSV/PDF export.
        * **Items Report Tab**: sortable table of each menu item (localized name, total sold, total revenue, average rating), CSV/PDF export.
        * **Feedback Report Tab**: list of last 50 reviews (localized item name, rating stars, comment, date, resolved toggle), with a “Resolve” button per row.
        * **Recommendations Widget**: list top 3 sellers (menu item, quantity) from last 7 days, with “Apply to Next Week” button.

4. **Customer-Facing Ordering Site Structure**

   * URL format: `https://{subdomain}.coorder/{locale}/customer/...`.

   * **Order Entry** (via table QR code):

     1. Scanning QR leads to `/[locale]/customer/order?tableId={id}`.
     2. Server-side fetch of `sessionId` via API; if `status !== "new"`, show “Session Expired.”
     3. Display categories as collapsible panels or tabbed sections; under each, show items that are `available = true` and include today’s weekday in `weekday_visibility`.
     4. Each item card: image (fallback if missing), localized name and description, formatted price, inline star rating (average of reviews) or “No reviews,” quantity “＋/–” controls.
     5. Sorting/filter dropdown at top: “Top Seller,” “Price ↑/↓,” “Rating ↓/↑.”
     6. Floating Cart at bottom: shows item count and total price, “Checkout” button (disabled if empty).
     7. On “Checkout”: open a modal or drawer with order summary, “Confirm (Cash Only)” button. On click, POST `/api/v1/orders/create`; on success, redirect to `/thank-you?orderId={id}`.

   * **Booking & Preordering Flow** (if tableBooking feature enabled):

     * Separate page: `/[locale]/customer/booking`.
     * Form fields (Zod-validated): table selector (dropdown), customer name, contact (email/phone), booking date (today or future), booking time (within operating hours), party size, optional preorder items (list of checkboxes or quantity inputs for today’s available items).
     * On submit, POST `/api/v1/bookings/create`; handle 409 conflict. On success, show “Booking Pending Approval.”
     * Hide “Book a Table” if `FEATURE_FLAGS.tableBooking = false`.

   * **Thank You & Reviews**:

     * `/[locale]/customer/thank-you?orderId={id}` shows order summary (table number, items, quantities, total) and “Rate this Dish” links.
     * `/[locale]/customer/review/{menuItemId}`: form with star rating (1–5) and optional comment; on submit, POST `/api/v1/customer/reviews/create`, then show “Thank you for your feedback.”

   * **Persistent Language Switcher** in header that preserves query params (sessionId, tableId, etc.) when switching locales.

5. **Global UI & Styling Guidelines**

   * Use Tailwind CSS for layout and styling. Follow a clean, minimal aesthetic with ample whitespace.
   * Use a responsive grid where appropriate; ensure mobile (≤ 640px) prioritizes single-column flows.
   * Font sizing: `xl`/`2xl` for page titles, `lg` for section headings, `base` for body text, `sm` for captions.
   * Buttons and cards: rounded corners (`rounded-2xl`) and soft shadows (`shadow-lg`).
   * Primary brand color should be pulled from the restaurant’s settings (via CSS variable `--brand-color`) to theme buttons and highlights.
   * Use icons from Heroicons or lucide-react (imported components).
   * For charts, use Recharts: bar charts for sales over time, pie or donut for category breakdown.

6. **Component Breakdown & Code Organization**

   * **Layouts**:

     * `AdminLayout.tsx` (with sidebar, top bar, content area).
     * `CustomerLayout.tsx` (header with restaurant name, language switcher, footer).
   * **Forms & Inputs**: use React Hook Form + Zod resolvers for all client-side validation; show inline error messages.
   * **Modals/Drawers**: for “Add/Edit Category,” “Add/Edit Item,” “Confirm Checkout,” and “Resolve Review.”
   * **Reusable Components**:

     * `<StarRating value={avgRating} count={reviewCount} />`
     * `<DataTable columns={[…]} data={…} />` for reports.
     * `<QRCodeDisplay value={url} />` for QR code previews.
     * `<LanguageSwitcher />`
     * `<SidebarItem icon={} label={} href={} />`
   * **API Client**: wrap Supabase client calls in `/web/lib/api.ts`; always pass JWT and rely on RLS for scoping.

7. **Feature Flags & Conditional Rendering**

   * Wherever a feature is not yet ready (payments, AI chat, reviews toggles), wrap UI in:

     ```tsx
     if (!FEATURE_FLAGS.<featureName>) {
       return <ComingSoon />;
     }
     ```
   * Ensure that the “Online Payment” button or “AI Chat” widget never renders if its flag is off.

8. **Accessibility & ARIA**

   * All interactive elements (buttons, links, modals) must include appropriate `aria-label` or `aria-describedby` for screen readers.
   * Modals must trap focus and close on pressing `Esc`.
   * Ensure color contrast meets WCAG AA (use Tailwind’s default colors or adjust with `text-gray-800` on `bg-gray-100`, etc.).
   * Use semantic HTML: `<nav>` for sidebar, `<main>` for content, `<header>`/`<footer>` properly.

9. **Performance & Best Practices**

   * Lazy-load images (menu item photos) using Next.js `<Image>` with `loading="lazy"`.
   * Code-split large pages (e.g., Reports) with dynamic imports for Recharts.
   * Use `getServerSideProps` or Next.js Server Components to fetch initial data for dashboard and order pages; keep client bundle minimal.

10. **Deliverables**

    * For each major section (Admin Dashboard, Customer Site), deliver:

      1. **Homepage Layout**: full-width wireframe showing sidebar, header, content area.
      2. **Menu Management Screens**: mockups for category list with drag-and-drop, item list, add/edit forms.
      3. **Table QR Screen**: mockup showing QR code panel with “Download PNG” button.
      4. **Booking Flow**: booking form, pending bookings list, booking details.
      5. **Order Flow**: simplified menu view, cart overlay, checkout modal.
      6. **Reports Pages**: analytics home cards layout, sales report charts, items report table, feedback report list.
      7. **Responsive Variants**: mobile views for critical pages (order page, dashboard home, reports home).

    * Each mockup should include annotations describing interactive behavior (e.g., “When user clicks ‘Add Item,’ open a modal with this form,” “If stock level ≤ threshold, card turns red”).

---

**Final Prompt to the AI:**

```
You are a senior UX/UI designer. Design a complete, mobile-first web interface for CoOrder’s Next.js + Tailwind front end, incorporating:

1. Multi-tenant subdomain awareness (restaurant-specific branding and routing).
2. Full localization in Japanese, English, and Vietnamese.
3. A protected Admin Dashboard with sidebar navigation and the following sections:
   • Dashboard Home (summary cards: Today’s sales, active orders, top seller, low stock)
   • Restaurant Settings (profile form: name, logo upload, brand color, default language, contact info)
   • Menu Management (category list with drag-and-drop reorder; item list with localized fields, price, availability, weekday visibility, image upload; add/edit forms)
   • Table & QR Code Management (list of tables, edit/delete; “Generate QR” panel with 256×256 QR code + Download PNG)
   • Employee & Schedule Management (employee list, add/edit; weekly schedule calendar for shifts)
   • Booking & Preorder Management (pending bookings list with detail view showing any preorder items; confirm/cancel actions)
   • Reports & Analytics (Dashboard cards; Sales Report tab with date-range selector and charts; Items Report tab with sortable table; Feedback Report tab with review list and resolve buttons; Recommendations widget listing top 3 sellers and “Apply to Next Week”)

4. A public, localized Customer Ordering site under `/[locale]/customer` that supports:
   • QR-driven session creation (via `/api/v1/customer/reviews/create`) and “Session Expired” handling
   • Category-based menu browsing of today’s available items (localized name/description, price, image, star rating, quantity controls)
   • Filters/sorting (Top Seller, Price, Rating)
   • Floating Cart with “Checkout (Cash Only)” button driving `/api/v1/orders/create`, then redirect to Thank You page
   • “Book a Table” flow (if enabled): table selector, customer info, date/time, party size, optional preorder items, POST to `/api/v1/bookings/create`
   • Thank You page showing order summary and “Rate this Dish” links; review form that posts `/api/v1/customer/reviews/create`

5. Global UI guidelines:
   • Tailwind styling with brand-color theming, rounded 2xl corners, soft shadows, responsive grids
   • Tailored typography: xl/2xl for titles, lg for headings, base for text, sm for captions
   • Heroicons or lucide-react icons
   • Accessible, semantic HTML with proper ARIA attributes
   • Lazy-loaded images, code-splitting for large pages

6. Component organization:
   • Layouts: `AdminLayout.tsx`, `CustomerLayout.tsx`
   • Reusable components: `<StarRating>`, `<DataTable>`, `<QRCodeDisplay>`, `<LanguageSwitcher>`, `<SidebarItem>`
   • All forms built with React Hook Form + Zod; inline validation errors

7. Feature flags:
   • Wrap payments, AI chat, reviews, low-stock alerts, and tableBooking behind `FEATURE_FLAGS` checks
   • If a feature is disabled, replace its UI with “Coming Soon” or appropriate notice

8. Responsive variants:
   • Show mobile wireframes for critical flows (order page, dashboard home, reports home)

Produce a set of detailed wireframes or high-fidelity mockups for each section, annotated with interactive behavior descriptions. Focus on a clean, professional, and intuitive experience that scales from mobile phones to desktop screens.  
```
