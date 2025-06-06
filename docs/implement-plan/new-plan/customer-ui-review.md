# Customer Facing UI Improvement Plan

## Overview
The existing customer interface under `web/app/[locale]/customer` is not completed and too complecated to maintain. The design is functional but lacks production‑ready structure and mobile polish. Follow the bellow instruction to complete the current 
customer facing UI and ordering flow.

## Key Improvements Needed
1. **Componentization** – Extract shared UI pieces from the mockup into clear components (e.g., `MenuList`, `FoodCard`, `CategoryTabs`, `OrderSummary`).
2. **Session Handling** – Persist a session per table QR link so customers can add more items until checkout. Show a “session expired/thank you” state after payment.
3. **Mobile Usability** – Adjust padding, font sizes and button hit areas for small screens. Ensure responsive layouts.
4. **Food Discovery** – Add quick search and filtering by category or keyword.
5. **Recommended & Popular Items** – Display a list of suggestions at the top of the menu.
6. **Feedback Flow** – After checkout show a thank‑you page with review prompt.

## Proposed Reusable Components
- **CategoryTabs** – Horizontal scrollable tabs to jump to each category.
- **FoodCard** – Card component showing image, title, description, price and rating. Includes quantity controls.
- **MenuList** – Renders categories and their `FoodCard` items.
- **FloatingCart** – Sticky footer bar summarizing items in cart with checkout button.
- **BookingForm** – Form for table booking with date/time and optional preorder items.
- **OrderSummary** – Checkout page summarizing selected dishes.
- **ThankYouScreen** – Displays order ID and review links after checkout.

These components can live inside `web/components/features/customer` for reuse across pages.

## Session & Order Flow
- **Order processing, booking APIs and reviews** – there are no API routes for orders, bookings or review creation yet. The customer UI contains placeholders for these actions but they are not backed by server code.
1. **Session Creation** – When the URL `/[locale]/customer/order?tableId=...` is visited, call an API (`/api/v1/sessions/create`) to create a new `orders` row with `status:"new"` and return `sessionId`.
2. **Active Session** – Store `sessionId` in localStorage or a cookie. All subsequent order or booking requests send this ID.
3. **Adding Items** – Customers can navigate back to the menu and the cart persists thanks to `sessionId`.
4. **Checkout** – POST to `/api/v1/orders/create` with the cart items. Keep `orders.status = 'new'` until staff marks it complete. Afterwards the `sessionId` is considered closed.
5. **Thank You Page** – After checkout redirect to `/customer/thank-you?orderId=123`. If a closed session tries to open the menu again, show a “Thank you” state with option to leave a review.
6. **Review Prompt** – The thank‑you screen links to `/customer/review/{menuItemId}` to rate each item.

## Mobile-First Design Checklist
- Use responsive grids with Tailwind’s `grid-cols-1 md:grid-cols-2` pattern for menu items.
- Ensure buttons are at least `h-10` with ample padding.
- Use `text-base` for body text, `text-lg`+ for headings.
- Keep important actions (Add to cart, Checkout) within thumb reach.
- Test on devices from 320px to 768px width.

## Food Discovery Enhancements
Implement a search bar at the top of the menu page. Filter displayed items as the user types. Add category shortcuts (tabs) pinned under the header. Use the existing `StarRating` component (`web/components/ui/star-rating.tsx`) to highlight highly rated dishes.

## Recommended & Popular Section
At the API level expose `/api/v1/menu/recommended`. For now use static demo data or top ordered items from analytics. Show these items in a horizontal scroll list above the regular categories on the menu page.

Example snippet:
```tsx
<section className="mb-6" aria-label="Recommended">
  <h2 className="text-xl font-semibold mb-2">{t('menu.recommended')}</h2>
  <div className="flex space-x-3 overflow-x-auto pb-2">
    {recommended.map(item => (
      <FoodCard key={item.id} item={item} compact />
    ))}
  </div>
</section>
```

## Customer Feedback Flow
After a successful order the ThankYouScreen should display the order summary and a call‑to‑action:
```tsx
<Button href={`/${locale}/customer/review/${firstItemId}`} className="mt-4">
  {t('thankyou.leave_review_button')}
</Button>
```
Store rating and optional comment via `/api/v1/reviews/create`.

## Implementation Plan
1. **Refactor Components** – Create the reusable components listed above inside `web/components/features/customer`. Migrate existing markup from `customer-client-content.tsx` into these components.
2. **API Endpoints** – Implement `/api/v1/sessions/create` and adjust `/api/v1/orders/create` to validate the session as described in `docs/implement-plan/detailed-implementation-steps/05_customer-facing-website.md`.
3. **Session Management** – On first visit obtain `sessionId` and store it. Show session‑expired state if the order row is no longer `status:"new"`.
4. **Search & Category Tabs** – Add search input and category navigation to `MenuList`.
5. **Recommended Items** – Create static or analytics‑driven data and display via new component.
6. **Polish Mobile Styles** – Audit Tailwind classes for spacing, sizes, and responsive breakpoints.
7. **Thank You & Review** – After checkout show `ThankYouScreen` with review links; implement `ReviewForm` page for rating.

