# Phase 2: Core UX & Performance (Weeks 2–6)

Goal: Make the app feel instant and intuitive on mobile. Target a 10/10 UX and Performance score for daily owner workflows.

Outcomes
- Dashboard uses a single server-side aggregated fetch with caching and revalidation.
- Menu page remains smooth for 1,000+ items via virtualization.
- All images optimized through next/image with proper sizes and CDN loader.
- Mobile-first dashboard with action-oriented layout and primary bottom navigation.

Workstreams and Tasks
1) Server-Side Dashboard Aggregation (RSC)
- Files: `web/app/[locale]/(restaurant)/dashboard/page.tsx`, `web/app/api/v1/owner/dashboard/aggregate/route.ts`, `web/app/[locale]/(restaurant)/dashboard/dashboard-client-content.tsx`.
- Actions:
  - In page.tsx (Server Component), fetch aggregate data from the aggregate route or directly from Supabase server SDKs; pass to client as props.
  - Replace multiple client fetches with a single server fetch; keep fine-grained Suspense/skeletons for charts.
  - Use `revalidateTag('dashboard:aggregate')` and tag invalidation on relevant mutations.
- Tests: Component tests verifying SSR rendering with provided props; ensure no waterfalls (mock network).
- Acceptance: Initial dashboard content visible under 1.5s on mid mobile in staging; only one aggregate request on load.

2) Menu Management Virtualization
- Files: `web/app/[locale]/(restaurant)/dashboard/menu/menu-client-content.tsx`, new `web/components/features/admin/menu/VirtualizedMenuList.tsx`.
- Actions:
  - Introduce `@tanstack/react-virtual` to render visible menu items only.
  - Keep item height predictable; add skeletons for items loading.
  - Preserve a11y (ARIA list/grid), keyboard nav, and large touch targets.
- Tests: RTL tests asserting only visible items render; scroll virtualization works; no regressions in actions (edit/delete).
- Acceptance: 60 FPS scroll on a dataset of 2,000 items in staging; memory stable.

3) Image Optimization
- Files: `web/next.config.ts`, all components using images (e.g., `admin-sidebar.tsx`, menu item cards, owner profile).
- Actions:
  - Enforce `next/image` usage; replace `<img>` tags.
  - Configure images.remotePatterns or loader for CDN (Cloudinary/Imgix). No secrets in client bundle.
  - On uploads, generate multiple sizes and store URLs; render size-appropriate images with `sizes` attrs.
- Tests: Visual regression for critical images; Lighthouse image diagnostics = 0 failing audits.
- Acceptance: Total image bytes on dashboard < 300KB on first load.

4) Mobile-First Dashboard and Navigation
- Files: `admin-bottom-nav.tsx`, `dashboard-client-content.tsx`, Quick Actions, Recent Orders, etc.
- Actions:
  - Make `AdminBottomNav` the primary mobile nav (`lg:hidden` already present). Ensure routes are concise and thumb-friendly.
  - Redesign dashboard layout:
    - Top: 2–3 metrics (Today’s Sales, Active Orders, New Bookings).
    - Middle: Quick Actions component.
    - Bottom: Recent Events feed.
  - Move complex charts to `/reports` and lazy-load on that page.
  - Add a Quick Add (+) entry point (dialog with tabs) for Menu Item/Category/Employee.
- Tests: RTL tests for tabbed dialog flow; ensure 44x44px minimum touch targets.
- Acceptance: Task completion time (create a menu item) reduced by 30% in usability test; mobile Lighthouse Accessibility ≥ 95.

5) Loading and Error States Polish
- Files: `web/components/ui/skeletons/*`, `web/components/ui/states/error-state.tsx`.
- Actions:
  - Use contextual skeletons for cards and lists instead of page-wide placeholders; adopt subtle shimmer.
  - Ensure every fetch surface has a consistent ErrorState with retry.
- Tests: Snapshot tests for skeletons; interaction tests for retry flows.
- Acceptance: No blank content flashes; consistent UX patterns observed in heuristic review.

Definition of Done
- No client-side request waterfalls on dashboard.
- Menu management is smooth with large data sets.
- Images optimized; Lighthouse Performance ≥ 90 on mid mobile in staging.
- All user-facing strings are i18n-ready; no hardcoded English text.

Quality Gates and Metrics
- LCP ≤ 2.5s, CLS < 0.1, TBT < 200ms on staging median.
- 0 a11y violations in automated scans (axe) on core pages.
- 80%+ component test coverage for new/updated components.
