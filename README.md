# Restaurant Copilot

Restaurant Copilot exists to help a founder fully operate one or more restaurants from a phone.

That means the product must stay simple under pressure, powerful in real operations, and trustworthy enough for daily use by founders, managers, and staff. We are not building a complex admin panel. We are building a calm, mobile-first operating system for running restaurants.

## Mission

- Help founders run the business from their phone with less stress.
- Keep daily operations clear: what needs attention now, today, this week, and this month.
- Preserve the current customer ordering flow as a stable product surface.
- Expand the system around multi-branch operations, founder control, staff execution, and clean monthly numbers.

## Product North Star

The best version of this product lets a founder:

- switch between branches in seconds
- see what needs attention first
- monitor sales, staffing, attendance, and purchases
- approve important exceptions without digging through settings
- trust the numbers enough to use them for payroll and accountant review

If a feature does not help a founder, manager, or staff member operate faster and with more confidence from a phone, it should be questioned.

## Non-Negotiable Foundation Rules

These come from the active foundation documents in [`docs/foundation/README.md`](docs/foundation/README.md), [`docs/foundation/00_owner_business_operations_plan.md`](docs/foundation/00_owner_business_operations_plan.md), [`docs/foundation/01_organization_branch_menu_foundation.md`](docs/foundation/01_organization_branch_menu_foundation.md), and [`docs/foundation/02_ai_agent_execution_plan.md`](docs/foundation/02_ai_agent_execution_plan.md).

1. Do not break the current customer menu ordering flow.
2. Treat the current `restaurant` as the branch-level operating unit.
3. Add multi-branch support through an organization layer above branches.
4. Keep branch menus independent first.
5. Keep the owner and manager experience mobile-first and operationally simple.
6. Keep permissions, finance, and attendance explicit and auditable.
7. Separate language preference from country-specific business rules.

## Product Principles

- Mobile-first before desktop polish.
- Fewer screens, fewer taps, less setup.
- Operational language over technical language.
- Guided defaults over configuration overload.
- Modern, beautiful, professional UI without decorative clutter.
- Simple for busy founders, managers, and staff.
- Powerful through good workflow design, not through dense menus.
- Branch scope must always be obvious in data, UI, and permissions.

## UX Standard

Every important workflow should feel usable on a phone while standing in a restaurant.

- Show urgent actions first.
- Avoid deep navigation trees.
- Prefer one clear primary action per screen.
- Keep labels short and concrete.
- Reduce modal-heavy and settings-heavy flows.
- Use progressive disclosure for advanced controls.
- Design for low attention, interruptions, and one-handed use.

Founders should not need training to understand the main owner experience. Managers should be able to act quickly. Staff should not have to decode system language.

## Engineering Standard

This codebase should be easy to extend safely by strong human engineers and AI agents.

- Keep domains explicit: organization, branch, menu, orders, people, attendance, money, settings.
- Do not hide cross-domain logic in UI components or route handlers.
- Centralize authorization and branch-scope resolution.
- Keep finance calculations in dedicated domain logic.
- Keep background jobs separate from request handling.
- Add migrations for schema changes; do not rely on undocumented manual drift.
- Prefer small, composable modules over oversized shared utilities.
- Keep feature boundaries clean so changes in one area do not quietly break another.
- Write code that is readable first, clever second.

## AI Agent Working Contract

Before changing code, every AI agent must:

1. Read the four active foundation documents.
2. Restate the core constraints in its own words.
3. Read the relevant local architecture in the repository areas it will touch.
4. Define the task boundary, expected changes, and what must remain stable.
5. State where the code belongs before creating files.
6. Only then begin implementation.

Every implementation should protect:

- customer ordering stability
- branch-scoped operations
- shared founder support
- mobile usability
- clean domain boundaries

## Architecture Workflow

Agents should work architecture-first, not patch-first.

- Read the relevant existing modules before introducing new files.
- Reuse current patterns before inventing new abstractions.
- Explain where new code fits and which layers consume it.
- Stop and ask if a requested change conflicts with the active foundation.
- Update the relevant architecture or foundation docs when structural assumptions change.

## File Placement and Naming

- Keep frontend, backend-style route handling, database, and shared types separated cleanly.
- Place web UI in `web/components/`, route logic in `web/app/`, domain/services in `web/lib/`, shared contracts in `web/shared/`, translations in `web/messages/`.
- Place iOS views in `mobile/SOder/SOder/views/`, services in `mobile/SOder/SOder/services/`, models in `mobile/SOder/SOder/models/`, and localization in `mobile/SOder/SOder/localization/`.
- Use `PascalCase` for React and SwiftUI components/types, `camelCase` for functions and variables, and `kebab-case` for web file names unless the local framework pattern requires otherwise.
- Keep TypeScript fully typed. Avoid implicit `any`.

## Quality Baseline

- Add or update tests for new or changed critical logic.
- Use the repo tooling that already exists: Jest and Testing Library for web, XCTest and UI tests for iOS, ESLint and Prettier for web formatting and linting.
- Keep error handling explicit, validate inputs, and never hardcode secrets.
- Note meaningful technical debt directly in code comments or docs when it cannot be resolved in the current task.

## Repository Structure

```text
├── web/                    # Next.js admin dashboard and customer site
│   ├── app/                # App Router pages and API routes
│   ├── components/         # Reusable UI components
│   ├── lib/                # Services, domain helpers, utilities
│   ├── messages/           # next-intl translations
│   └── shared/             # Shared types and schemas
├── mobile/SOder/           # SwiftUI iOS app
│   ├── SOder/              # App source
│   ├── SOderTests/         # Unit tests
│   └── SOderUITests/       # UI tests
├── infra/                  # Migrations and production scripts
└── docs/                   # Foundation docs and supporting plans
```

## Core Architecture

- Web: Next.js 15, TypeScript, Tailwind CSS
- Mobile: SwiftUI iOS app for staff operations
- Database: Supabase PostgreSQL with Row-Level Security
- Auth: Supabase Auth with scoped JWTs
- Realtime: Supabase Realtime for order and operational updates
- i18n: Japanese, English, Vietnamese

## Development Commands

### Web

```bash
cd web
npm install
npm run dev
npm run build
npm run start
npm run lint
npm run format
```

### iOS

```bash
cd mobile/SOder
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug build
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug test
xcodebuild -project SOder.xcodeproj -scheme SOder clean
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0' build
```

### Database

```bash
# Migrations live in infra/migrations/
# Run production scripts from infra/production/
```

## Delivery Expectations

Good changes in this repository are:

- clearly tied to the mission
- scoped to the right domain
- easy to review
- verified at the appropriate level
- documented when behavior or architecture changes

The standard is not just shipping features. The standard is building a product founders can actually rely on while keeping the system clean enough to grow well.
