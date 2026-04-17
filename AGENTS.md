# AGENTS.md

This file defines how AI agents must work in this repository.

## Mission

Our mission is to help any founder fully operate their restaurants from their phone.

Everything in this repository should support that mission:

- simple enough for founders, managers, and staff to use quickly
- powerful enough for real restaurant operations
- modern, beautiful, and professional in UI and UX
- organized well enough that features can evolve without turning the system into a mess

This is not a generic restaurant admin panel. It is a mobile-first operating system for restaurant ownership and daily execution.

## Mandatory Reading Before Any Implementation

Before starting any implementation task, read these files:

1. `docs/foundation/README.md`
2. `docs/foundation/00_owner_business_operations_plan.md`
3. `docs/foundation/01_organization_branch_menu_foundation.md`
4. `docs/foundation/02_ai_agent_execution_plan.md`

This is required every time a new agent begins work on a task.

## Foundation Rules

Every AI agent must preserve these rules:

1. Do not break the current customer menu ordering flow.
2. Treat the existing `restaurant` concept as the branch-level operating unit.
3. Add multi-branch support through an organization layer above branches.
4. Keep branch menus independent first.
5. Keep founder and manager UX mobile-first and operationally simple.
6. Keep permissions, attendance, finance, and reporting explicit and auditable.
7. Keep language preference separate from business-country rules.

If the task pressure pushes against these rules, the rules win.

## Required Start-of-Task Protocol

Before making changes, the agent must produce a short working summary that includes:

- confirmation that the foundation docs were read
- confirmation that the relevant existing architecture and local patterns were reviewed
- the relevant foundation constraints in the agent's own words
- the product goal of the task
- what existing behavior must remain stable
- which files or modules are likely to change
- the target directories and why the code belongs there
- expected database impact
- expected API impact
- expected UI impact
- expected verification

Do not jump straight into implementation without this mental frame.

## Product Priorities

When in doubt, optimize for:

1. founder control from a phone
2. simple daily branch operations
3. trustworthy permissions and numbers
4. speed and clarity for managers and staff
5. safe long-term maintainability

The product should help users operate a restaurant, not learn software.

## UX Rules

These are strict product rules for all user-facing work:

- Mobile-first comes before desktop refinement.
- Fewer screens and fewer taps are better.
- Show urgent actions first.
- Use short, direct, operational labels.
- Avoid deep navigation and sprawling admin layouts.
- Prefer guided flows over configuration-heavy forms.
- Keep advanced controls hidden until needed.
- Make the UI feel calm, clean, fast, and trustworthy.
- Keep it modern and beautiful, but never busy.
- Do not burden founders with system complexity that code can hide.

Every screen should answer one of these questions quickly:

- what needs attention now
- what changed today
- what must be approved
- what is blocked
- what needs action before closing the day or month

## Domain and Architecture Rules

- Preserve the current customer ordering flow.
- Keep branch scope explicit in schema, services, API routes, and UI.
- Treat branches as operational units with their own menus, prices, availability, staff, and reports.
- Model founders, co-founders, finance partners, and accountants as organization members, not employees.
- Keep authorization logic centralized.
- Keep finance and attendance logic in dedicated domain layers.
- Keep scheduled jobs and background workflows separate from route handlers.
- Use migrations for schema changes.
- Keep audit-sensitive actions traceable.
- Do not create hidden coupling across domains.

Preferred domain shape:

- organization
- branch
- menu
- orders
- people
- attendance
- money
- settings

## File Placement Rules

- Create files only in the correct directories for the domain and layer.
- For web work:
  - `web/app/` for routes, page entry points, and API handlers
  - `web/components/` for UI components
  - `web/lib/` for services, domain logic, and helpers
  - `web/shared/` for shared types and schemas
  - `web/messages/` for translations
- For iOS work:
  - `mobile/SOder/SOder/views/` for SwiftUI views
  - `mobile/SOder/SOder/services/` for services
  - `mobile/SOder/SOder/models/` for models
  - `mobile/SOder/SOder/localization/` for localization
- Do not create duplicate structures if a correct home already exists.
- Before creating a file, say which path you are targeting and why.

## Naming and Type Rules

- Use `camelCase` for functions and variables.
- Use `PascalCase` for types, components, and SwiftUI views.
- Use `kebab-case` for web file names unless the local framework convention clearly differs.
- Every TypeScript function must be fully typed.
- Do not introduce implicit `any`.
- Keep shared contracts in explicit types or schemas instead of repeating loose object literals across layers.

## Code Quality Rules

These rules are non-negotiable for top-engineer quality:

- Keep features separated cleanly by domain and responsibility.
- Prefer focused modules over large mixed-purpose files.
- Keep naming explicit and boring in a good way.
- Reuse sound local patterns before inventing new ones.
- Avoid leaky abstractions.
- Make data flow and permission flow easy to follow.
- Keep side effects isolated.
- Keep route handlers thin where possible.
- Keep UI components focused on presentation and interaction.
- Keep business rules in services, domain helpers, or clearly owned modules.
- Keep shared types and schemas accurate.
- Add tests for money logic, permissions, attendance, branch scope, and fragile workflows.
- Do not leave dead code, half-migrations, or misleading temporary hacks behind.
- Prefer composition over inheritance.
- Keep functions small and single-purpose.
- Reuse existing solutions before creating parallel implementations.

The codebase should become easier to understand after good changes, not harder.

## Testing and Quality Rules

- Use the repo's existing tooling: Jest and Testing Library for web, XCTest and UI tests for iOS, ESLint and Prettier for web quality checks.
- Run the most relevant tests and linting for the changed area whenever feasible.
- Add matching tests for new non-trivial modules and critical paths when the test harness exists.
- Cover both success cases and meaningful failure paths.
- If a test is not added for a risky change, explain why.

## Security and Reliability Rules

- Never hardcode secrets or credentials.
- Use environment variables and existing secure configuration patterns.
- Validate and sanitize user input at the correct boundary.
- Keep auth, permission, and branch-scope checks explicit.
- Preserve or improve rate limiting and auditability on sensitive operations.
- Include clear error handling and logging where operational failures matter.

## Scope Discipline

- Make the smallest complete change that solves the real problem.
- Do not refactor unrelated areas just because you noticed them.
- Do not mix multiple architectural directions in one task.
- Do not widen scope without a clear reason.
- Protect stable flows while extending foundations.

## Documentation Rules

If the work changes product behavior, architecture, or foundational assumptions:

- update the relevant docs
- keep documentation aligned with the real implementation
- do not leave foundation docs silently stale
- flag breaking changes before implementing them

## Communication Rules

Before generating code, the agent should explain:

- how the task fits the architecture
- which layer owns the change
- which modules depend on it
- which consumers will use it

If the requested change conflicts with the architecture or foundation, stop and ask instead of forcing it through.

## Definition of Done

Work is only done when:

- the implementation respects the foundation rules
- the domain boundary is clean
- the UI remains usable on mobile
- customer ordering is still stable
- appropriate verification was run
- important docs were updated if needed
- risks or follow-ups are called out clearly

## Development Commands

### Web Application

```bash
cd web
npm install
npm run dev
npm run build
npm run start
npm run lint
npm run format
```

### iOS Application

```bash
cd mobile/SOder
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug build
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug test
xcodebuild -project SOder.xcodeproj -scheme SOder clean
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0' build
```

### Database Management

```bash
# Migration files are in infra/migrations/
# Run migrations manually in Supabase SQL editor
# Production scripts are in infra/production/
```

## Repository Overview

```text
├── web/                    # Next.js admin dashboard and customer site
│   ├── app/                # App Router pages and API routes
│   ├── components/         # Reusable UI components
│   ├── lib/                # Services and utilities
│   ├── messages/           # Translation files
│   └── shared/             # Shared types and schemas
├── mobile/SOder/           # SwiftUI staff app
│   ├── SOder/              # Main app source
│   ├── SOderTests/         # Unit tests
│   └── SOderUITests/       # UI tests
├── infra/                  # Database and infrastructure
│   ├── migrations/         # Migration scripts
│   └── production/         # Production scripts
└── docs/                   # Foundation docs and plans
```

## Final Rule

Act like a top engineer building software for real operators under real pressure:

- protect the important flows
- reduce cognitive load
- keep the system organized
- keep the UI simple and strong
- leave a codebase the next engineer or agent can trust
