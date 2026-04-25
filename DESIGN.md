# CoOrder Design System Contract

This file is mandatory reading before any AI agent changes UI in this repository. Read it after `AGENTS.md` and before editing web, mobile, email, screenshots, marketing pages, customer ordering, founder control, branch operations, or shared UI primitives.

## Product Feeling

CoOrder helps restaurant owners run daily operations from a phone with less stress, cleaner control, and happier guests. UI should feel warm, operational, trustworthy, fast, and specific to restaurants. Avoid generic SaaS visuals, generic AI copy, blue/purple startup gradients, and cold black-and-white controls.

Every interface should answer:

- What job is the restaurant team trying to finish right now?
- Which branch or organization scope is active?
- What number, permission, or customer action must be trusted?
- How can the next action be obvious on a phone?

## Surface Classification

Classify UI work before designing it:

- Root marketing: public value, brand story, product discovery, authentication entry.
- Public customer: branch-scoped restaurant presence, menu browsing, ordering, cart, checkout.
- Founder control: organization-scoped setup, branches, people, finance, reporting, billing.
- Branch operations: branch-scoped daily execution, orders, menu, staff, attendance.
- Platform admin: approval, subscription, safety, support, operational oversight.
- Mobile app: founder and operator workflows that must work quickly with thumb-first layouts.

Do not mix visual priorities blindly. Marketing can be cinematic and expressive. Customer ordering should make food and checkout clear. Founder and branch tools should be denser, calmer, and more explicit.

## Brand Assets

Use the current CoOrder identity everywhere:

- Web mark: `web/public/brand/coorder-mark.svg`
- Web wordmark: `web/public/brand/coorder-wordmark.svg`
- Legacy web alias: `web/public/coorder.svg`
- iOS mark asset: `mobile/SOder/SOder/Assets.xcassets/CoorderMark.imageset/`

Do not reintroduce the old black-and-white logo or isolated text logo. Do not create a new logo variant without updating this file and both web/mobile asset locations.

## Color System

The core palette is warm, restaurant-native, and grounded:

- Ink: `#080705`
- Espresso: `#14100B`
- Charcoal: `#1A130D`
- Rice: `#F6E8D3`
- Cream: `#FFF7E9`
- Copper: `#C8773E`
- Saffron: `#E9A35E`
- Herb: `#97BE73`
- Muted text on dark: `#C9B7A0`
- Warm line: `rgba(241, 220, 196, 0.14)`

Use blue, slate, or grayscale defaults only when they belong to an existing operational surface and do not conflict with the local design. Do not use purple/blue AI gradients for CoOrder brand moments.

## Restaurant Brand Theming

Each company should feel like its own restaurant brand on customer-facing pages, including company public subdomains, branch subdomains, ordering, booking, order history, and public home pages. That uniqueness must come from controlled theme derivation, not raw unlimited color painting.

Rules:

- Company-level public pages use `owner_organizations.brand_color` as the primary seed.
- Branch ordering pages may use `restaurants.brand_color` as a branch override; otherwise they inherit the company seed.
- Customer-facing UI must pass brand colors through `web/lib/utils/colors.ts` before use.
- Use `createCustomerThemeProperties()` for customer page wrappers and `createCustomerBrandTheme()` when a component needs direct values.
- Do not apply arbitrary user-selected colors directly to large backgrounds, buttons, text, or focus rings.
- The selected primary color is a seed. The system derives button foreground, hover, soft tint, dark hero surface, border, ring, and accent values.
- Public buttons must keep readable contrast. If a chosen color is too bright, too dark, too saturated, or invalid, normalize it before rendering.
- AI-generated palette options must be restaurant-safe: muted food, ingredient, wood, herb, tea, clay, charcoal, rice, or warm hospitality tones.
- Avoid neon colors, generic blue SaaS defaults, purple AI gradients, pure black, pure white, and multiple competing loud accents.
- Show founders a customer-page preview when asking them to choose colors, not only two color dots.

## Typography

- Marketing pages may use more expressive display type, but keep headlines concise and concrete.
- Founder, branch, platform, and customer ordering surfaces should prioritize legibility, scan speed, and stable line lengths.
- Use tabular or mono styling for numbers that owners compare repeatedly.
- Avoid oversized headings inside compact panels, cards, drawers, and mobile toolbars.
- Do not rely on text-heavy sections to explain the product. Show the workflow and data.

## Layout

- Mobile-first is mandatory. Every primary action must be reachable and readable on narrow screens.
- Cards should have a clear reason to exist: repeated items, dialogs, focused tools, or contained data.
- Do not put cards inside cards.
- Avoid generic three-card feature rows on marketing pages. Use asymmetric layouts, product previews, dish imagery, live stats, and operational moments.
- Keep touch targets at least 44px tall on mobile.
- Prevent text overlap, clipping, horizontal scrolling, and button label overflow.

## Founder Control UX

Founder control is an owner command center, not a generic analytics dashboard. It must help an owner understand the business quickly and choose the next work area from a phone.

Navigation:

- Use a persistent left navigation on desktop for `control/*` pages.
- Use a compact bottom or thumb-reachable navigation on mobile.
- Avoid top navigation that forces repeated clicks before the owner can reach branches, menu, people, finance, or settings.
- Navigation labels must map to owner jobs: home, branches, menu, employees and salary, financial report, company profile.

Visual style:

- Founder control uses the warm dark CoOrder surface by default.
- Light cards on dark backgrounds must read as glass: translucent warm cream, backdrop blur, subtle inner separation, and no harsh white rectangles.
- Avoid excessive borders. Use spacing, typography, and table structure before adding another framed card.
- Keep corners restrained. Operational panels and tables should feel precise, not bubbly.
- Do not mix unrelated light and dark sections inside one control page.

Content hierarchy:

- Start from the owner’s actual decision: cash, sales, costs, branches, staff readiness, and menu movement.
- Show fewer sections with stronger meaning. Remove sections that do not directly help the owner act.
- Prefer tables for branch, employee, salary, and finance comparison. Use cards for KPI strips, focused summaries, empty states, and repeated item previews.
- Do not duplicate the same signal in multiple places on one page.
- Use clear time windows in labels and helper text.

Copy and localization:

- Never hardcode English UI text in founder control components. Add keys under `web/messages/{locale}/owner/control.json` or the correct namespace.
- Keep helper copy short. The UI should explain what number means, not teach the whole product.
- Avoid vague labels such as "insight" or "priority" unless the content is genuinely actionable and specific.

## Owner Overview Contract

`/{locale}/control/overview` is the owner’s home page after onboarding. It should answer:

- Are sales moving today and this month?
- Are total costs visible, including branch costs and shared company expenses?
- Which menu items are actually selling?
- How much cash should be prepared for employee pay?
- Which branches need attention or comparison?
- Are monthly books closed enough to trust finance reports?

Required overview patterns:

- KPI strip: today revenue, this month revenue, this month costs, and month-close coverage.
- This month costs must include branch purchasing, branch expenses, and shared company expenses.
- Charts must compare meaningful totals. A six-month business trend should use live completed order revenue and known expenses, not only closed snapshots.
- Month close belongs as one coverage signal. Do not also add a separate duplicated month-close progress card.
- Top selling items must come from completed orders and real order items, with localized menu names.
- Payroll belongs on the overview; "top employees" does not. Show approved payroll, projected month-end payroll, remaining cash to prepare, missing salary-rate warnings, and a branch payroll breakdown.
- Branch health and branch leaders should be one branch performance table with revenue, costs, gross profit, open/staff counts, and close status.
- Empty states must explain what data is missing: no completed sales, no approved payroll, no visible branches, or missing salary rates.

Do not show:

- Decorative priority panels with generic tasks.
- Generic insight cards that restate obvious status.
- Employee leaderboards unless there is a clear operational action.
- Expense-only charts that hide revenue or branch costs.
- Month-close-only charts on the overview. Month close is a reliability status; finance pages can show close detail.

## Founder Branches Contract

`/{locale}/control/restaurants` and `control/restaurants/[branchId]` are founder-owned branch management surfaces. They are not the same as branch daily execution.

Branch list expectations:

- Show branches in a scannable table or dense list before decorative cards.
- Include the data an owner uses to choose a branch: branch name/code, revenue, costs, gross profit, open orders, staff count, month-close status, onboarding/setup status, and clear action.
- Keep drill-down one click from the branch row.
- Do not make the owner pass through vague "choose what you are managing" screens.
- Use branch routes for local execution only when the task belongs to daily branch operations.

Branch detail expectations:

- Keep founder-owned tabs focused: overview, finance, team, setup.
- Use tables for employees, salary, attendance, branch finance rows, and setup checklists.
- Employee and salary screens must let owners view employees, choose a salary month, inspect detail, and understand payment preparation.
- Always keep branch identity explicit in the page title or header.
- When linking to branch operations, label the action as branch operations so the scope change is clear.

## Components

Buttons:

- Primary actions use copper/saffron warmth, not black/white defaults.
- Secondary actions use warm translucent surfaces with 1px borders.
- Destructive actions must stay explicit and recognizable.
- Include pressed, hover, focus-visible, disabled, and loading states.

Inputs and selectors:

- Menus, dropdowns, and popovers must inherit the local surface style.
- Language selectors should use language names or compact codes, not flag emojis.
- Labels sit above inputs. Helper and error text sit below.

Restaurant cards:

- Public discovery should show the best seller or signature dish first.
- Restaurant logos are supporting metadata, not the hero visual.
- If no dish image exists, use a warm food-focused placeholder that still feels intentional.

Numbers:

- Real metrics must come from owned server services or APIs.
- Label the time window clearly, such as today, this week, or per day.
- Do not invent fake operational stats in production UI.

## Motion

Motion should make the service feel alive without slowing restaurant work:

- Prefer `framer-motion` or local CSS transitions already used by the repo.
- Animate `transform` and `opacity`; avoid animating layout properties.
- Use subtle perpetual motion only in marketing or empty states.
- Respect `prefers-reduced-motion`.
- Keep operational surfaces calm. Feedback should confirm action, not entertain.

## Imagery

- Websites and public pages need real visual assets or generated bitmap assets.
- For discovery, food imagery should dominate over restaurant logos.
- Avoid abstract stock-like dark blurs, generic dashboards, and decorative orbs.
- Keep image crops inspectable: guests should understand the dish or restaurant context.

## Accessibility

- Keep contrast readable on dark and warm surfaces.
- Preserve keyboard focus rings.
- Do not hide essential labels behind color alone.
- Use semantic buttons, links, dialogs, menus, and headings.
- Test mobile viewport behavior for every new public or operational UI.

## Web Implementation Rules

- Routes and pages live in `web/app/`.
- UI components live in `web/components/`.
- Shared domain types live in `web/shared/`.
- Server-backed numbers live in `web/lib/server/` or owned API routes.
- Reuse existing design tokens and local patterns before inventing primitives.
- If a generic `bg-white`, `bg-slate-*`, `text-black`, or blue gradient appears inside a brand surface, verify it is intentional.

## Mobile Implementation Rules

- iOS views live under `mobile/SOder/SOder/views/`.
- iOS services live under `mobile/SOder/SOder/services/`.
- iOS models live under `mobile/SOder/SOder/models/`.
- iOS localization lives under `mobile/SOder/SOder/localization/`.
- Mobile UI should be thumb-first, state-explicit, and branch-aware.
- Keep language preference separate from country, currency, tax, and business rules.

## Copy Rules

- Prefer concrete restaurant operations language.
- Say what CoOrder helps owners do: manage branches, keep menus accurate, reduce order mistakes, speed service, understand numbers, and keep guests satisfied.
- Avoid "A founder can...", "AI-powered platform", "next-gen", "seamless", "elevate", and vague productivity claims.
- Keep landing copy short. Let visuals, metrics, and interaction do the heavy lifting.

## Verification Checklist

Before finishing UI work:

- Confirm `AGENTS.md` and this file were read.
- Confirm route ownership and branch/organization scope still match the foundation docs.
- Run the most relevant lint/type/test command that is feasible.
- Check the changed UI in desktop and mobile viewport sizes.
- Open menus, dialogs, language selectors, and empty states touched by the change.
- Confirm customer ordering still has no obvious regression when shared components or global styles change.
- State any skipped verification and why.
