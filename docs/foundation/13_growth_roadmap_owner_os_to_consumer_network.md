# Growth Roadmap: Owner OS to Consumer Ordering Network

**Written:** 2026-04-30

## Purpose

This document defines the product expansion path from restaurant operating system to consumer ordering network.

The company should not start as another ordering marketplace that only lets owners register a restaurant profile. The first product advantage is that the system helps owners actually operate the restaurant: menu, branch setup, staff, attendance, purchasing, expenses, finance, reporting, and daily order flow.

The later consumer ordering service should grow from that operating base. When enough restaurants already run on the system, customers can use one account and one familiar ordering experience across many restaurants.

## Strategic Thesis

Stage 1 wins restaurant supply by reducing owner stress and operational work for small restaurant businesses and multi-branch founders.

Stage 2 expands that restaurant operating system country-by-country.

Stage 3 wins consumer demand because the restaurant network already exists and menus, availability, opening hours, order status, and branch operations are live in the system.

This is different from marketplace-first ordering apps:

- marketplace-first apps help owners receive orders, but often leave operations outside the product
- owners still manage separate provider tablets, separate menus, separate finance reports, and manual restaurant work
- this product should become the operating source of truth first, then expose a customer ordering layer on top

## Non-Negotiable Product Boundary

The consumer experience may become network-wide, but restaurant operations stay branch-scoped.

Always preserve:

- `organization` as the founder/company control layer
- `restaurant` as the branch operating unit
- branch-resolved menus for every customer order
- organization members separate from employees
- customer accounts separate from organization members and employees
- finance, attendance, permissions, and billing as auditable business records

Do not build a consumer ordering feature that weakens branch operations or makes order ownership ambiguous.

## Stage 0 - Production Trust Foundation

Goal: make the current foundation safe enough for real restaurant operators.

This stage is complete when the system can be trusted for daily restaurant work before aggressive growth.

### Product Outcomes

- owner signup, approval, onboarding, and first branch setup work reliably
- founder control is mobile-first and organization-scoped
- branch operations remain fast and clear for orders, tables, menu, staff, attendance, purchasing, and expenses
- customer QR/table ordering remains stable
- support and platform approval flows are auditable

### Technical Outcomes

- active legacy routes are hardened or migrated to org-aware APIs
- distributed rate limiting is required in production
- customer session and order paths are abuse-resistant
- finance reporting uses explicit live versus closed meanings
- monitoring exists for API errors, slow requests, and database pressure

### Milestone Evidence

- first restaurants can onboard without engineer support
- founder can complete setup from a phone
- branch staff can operate orders during service
- month-close and reports are understandable enough for the owner or accountant
- no critical customer ordering security gaps remain open

## Stage 1 - Japan Restaurant Operating System

Goal: serve 1,000 restaurants in Japan as the operating system for small restaurants and multi-branch founders.

This is the fundraising proof stage. The story should be:

> We help restaurant owners run the business from a phone, not just receive orders from another provider.

### Product Scope

Prioritize owner and branch operations:

- fast company and first-branch setup
- branch setup and branch switching
- menu management with multilingual names, descriptions, images, sizes, toppings, active state, and branch inheritance
- QR/table ordering and branch order workflow
- people management with organization members separate from employees
- attendance, schedules, role rates, and salary close preparation
- purchases, expenses, monthly close, and accountant-friendly exports
- branch and organization reporting with clear time windows and accounting meaning
- AI-assisted onboarding, menu copy, and operational drafting with review before sensitive changes

Defer broad consumer marketplace features until the restaurant operating base is strong.

### Target Scale

- 1,000 restaurants in Japan
- approximately 1,000,000 orders per day capacity target
- lunch and dinner peaks tested, not only daily averages
- customer menu load p95 under 300 ms for cached paths
- order creation p95 under 500 ms during peak simulation
- owner control p95 under 800 ms for normal operational pages

### Business Milestones

- restaurants can self-activate with platform approval
- owners use the system weekly for menu, staff, and money, not only orders
- restaurant retention is measured at 30, 60, and 90 days
- support burden per restaurant decreases over time
- monthly recurring revenue and gross margin are tracked by restaurant and organization
- at least one credible multi-branch operator can run multiple branches through founder control

### Investor-Ready Proof

Prepare evidence before calling for investment:

- number of active restaurants
- number of orders processed per day and per month
- peak load test results for 1,000 restaurants with headroom
- uptime and incident history
- average setup time for a new restaurant
- active owner workflows used per restaurant
- retention by cohort
- support tickets per restaurant
- monthly revenue, churn, and infrastructure cost per restaurant
- finance/reporting trust evidence, including month-close usage

### Stage 1 Done Criteria

Stage 1 is done when the company can honestly say:

- restaurants use the product to operate, not only to list themselves
- owners can run core business workflows from mobile
- branch operations are stable during service
- customer ordering is protected and fast
- permissions and finance are auditable
- the platform has measured capacity for 1,000 restaurants with 20 percent headroom

## Stage 2 - Multi-Country Restaurant OS Expansion

Goal: expand the restaurant operating system beyond Japan into selected Asian markets without turning locale into business-country logic.

Expansion should be country-by-country, not a generic global launch.

### Product Scope

Before entering a new country, define:

- legal business identity fields
- country-specific tax settings
- currency and payment methods
- receipt and invoice requirements
- language requirements
- support language and onboarding materials
- platform approval rules
- data retention and privacy obligations

Language preference must remain separate from business country rules.

### Technical Scope

Required before multi-country expansion:

- country-aware tax profiles
- currency-safe money storage and display
- localized owner, staff, and customer UI in the active locale
- region-aware storage and media handling where required
- operational runbooks for support, incident handling, and data export
- ability to segment reporting by country without mixing accounting rules

### Market Entry Order

Pick markets based on operational similarity and founder access, not only market size.

For each country:

1. validate restaurant owner pain and payment constraints
2. onboard a small pilot cohort
3. localize setup, menu, staff, and finance workflows
4. verify tax and reporting assumptions with local advisors
5. scale only after support and operations are repeatable

### Stage 2 Done Criteria

Stage 2 is done when:

- more than one country can run through the same product foundation
- country-specific tax and payment behavior is explicit
- restaurant operations remain branch-scoped
- owner workflows remain simple on mobile
- support and onboarding are repeatable outside Japan

## Stage 3 - Consumer Ordering Network

Goal: at around 10,000 restaurants, add a consumer ordering layer where customers can register once and order from any restaurant in the network.

This stage should begin only when restaurant density is high enough to make consumer discovery useful.

The story becomes:

> We already power restaurant operations. Now customers can order from any restaurant in the network with one account and one trusted experience.

### Product Scope

Consumer network features may include:

- customer account registration and login
- customer profile, preferences, allergies, and language preference
- saved addresses where delivery is supported
- order history across restaurants
- favorites across restaurants
- search by location, cuisine, branch availability, opening hours, and language
- dine-in, pickup, and delivery modes where supported by each branch
- payments where legally and operationally ready
- loyalty, points, coupons, and membership
- customer support for network orders

### Required Boundary

Every consumer order must still resolve to one branch before checkout.

The customer may feel like they are using one network, but the operating facts remain:

- one order belongs to one `restaurant`
- the menu is branch-resolved
- availability and prices are branch-owned
- order execution is branch-owned
- refunds, tax, receipt, and support must know the branch and country

### New Data Domains

When this stage begins, add consumer domains deliberately. Do not reuse owner or employee tables.

Likely future domains:

- `customer_accounts`
- `customer_profiles`
- `customer_saved_addresses`
- `customer_restaurant_profiles`
- `customer_payment_methods`
- `consumer_order_index`
- `customer_favorites`
- `loyalty_accounts`
- `loyalty_events`
- `customer_support_cases`

These should sit beside the restaurant operating model, not inside it.

### API Direction

Future consumer APIs should be separate from owner and branch APIs.

Expected families:

- `api/v1/customer/account/*`
- `api/v1/customer/network/*`
- `api/v1/customer/search/*`
- `api/v1/customer/orders/*`
- `api/v1/customer/payments/*`
- `api/v1/customer/loyalty/*`

Owner and branch APIs should not become consumer APIs by accident.

### Technical Prerequisites

Do not launch the consumer network until:

- the 10,000-restaurant scale plan has passed load testing
- menus and public restaurant metadata are edge/cache friendly
- order creation is idempotent and fast under peak
- consumer identity, privacy, and consent rules are designed
- payment and refund flows are auditable
- support can identify the customer, restaurant, branch, order, and payment path
- cross-restaurant search does not query live branch operation tables directly

### Stage 3 Done Criteria

Stage 3 is done when:

- a customer can use one account to order from multiple restaurants
- restaurants still operate through the branch workflow
- customer order history is network-wide but operational order ownership remains branch-scoped
- search and discovery are fast without harming branch operations
- payments, refunds, support, and privacy are auditable

## Stage 4 - Funded Platform Scale

Goal: after the 10,000-restaurant stage proves demand, use investment to prepare for 100,000+ restaurants.

This should not be bootstrapped casually. It likely requires:

- tenant sharding across multiple database clusters
- region-aware routing
- a consumer search/index platform
- an analytics warehouse
- event-driven order processing for non-critical side effects
- stronger tenant management and support tooling
- country-specific compliance operations

The core product contract still remains:

- owner OS first
- branch operations explicit
- customer network built on live restaurant operations

## Execution Order Summary

1. Harden current production foundation.
2. Win 1,000 Japan restaurants as a restaurant operating system.
3. Prove restaurant retention, operating usage, and scale capacity.
4. Expand the restaurant OS country-by-country.
5. Add the consumer ordering network after restaurant density exists.
6. Use investment to fund the architecture needed for 100,000+ restaurants.

## Decision Rules For Future Work

When a task proposes a new feature, classify it:

- Stage 1 owner OS
- Stage 2 multi-country restaurant OS
- Stage 3 consumer ordering network
- Stage 4 funded platform scale

Then ask:

- Does this help owners operate restaurants, or only make a listing prettier?
- Does this preserve `restaurant` as the branch unit?
- Does this keep customer ordering branch-resolved?
- Does this keep owner, employee, and customer identities separate?
- Does this make finance, payment, support, or permissions more auditable?
- Does this belong now, or does it depend on restaurant density?

If a feature weakens the restaurant operating system to chase marketplace behavior too early, defer it.
