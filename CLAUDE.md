# CLAUDE.md

This file gives AI agents strict guidance for working in this repository.

## Mission

Build a restaurant operating system that lets any founder fully operate the business from a phone.

The product must stay:

- simple for founders, managers, and staff
- powerful in real daily operations
- modern, beautiful, and professional in UI and UX
- safe to extend without damaging unrelated features

Do not optimize for impressive admin complexity. Optimize for calm operational control.

## Mandatory Foundation Reading

Before making any code change, read:

1. `docs/foundation/README.md`
2. `docs/foundation/00_owner_business_operations_plan.md`
3. `docs/foundation/01_organization_branch_menu_foundation.md`
4. `docs/foundation/02_ai_agent_execution_plan.md`

No implementation is valid until those documents are read.

## Foundation Constraints You Must Follow

Every task must preserve these rules:

1. Do not break the current customer menu ordering flow.
2. Treat the current `restaurant` model as the branch-level operating unit.
3. Build multi-branch capability through an organization layer above branches.
4. Keep branch menus independent first.
5. Keep owner and manager UX mobile-first and operationally simple.
6. Keep permissions, finance, attendance, and audit boundaries explicit.
7. Keep language preference separate from country-specific business rules.

If a requested change conflicts with these rules, pause and surface the conflict clearly.

## Required Start-of-Task Protocol

Before editing files, the agent must do all of the following:

1. Read the foundation documents.
2. Read the relevant existing architecture and implementation in the repo areas it will touch.
3. Restate the relevant constraints in its own words.
4. Define the exact task boundary.
5. State what must remain stable.
6. Name likely files or modules to change.
7. Identify database, API, UI, and verification impact.
8. State the target directories and why the new or changed code belongs there.

If the task is not clear enough to do this, the agent should create a short implementation brief first and only then proceed.

## Product Direction

The owner experience should revolve around:

- `Shops`
- `People`
- `Money`
- `Settings`

The product should help users answer operational questions fast:

- Which branch needs attention first?
- Who is late or missing?
- How much money came in today?
- What needs approval before close?
- Are the month-end numbers clean enough for payroll and accountant review?

## UX and UI Rules

These are strict.

- Design mobile-first before desktop polish.
- Prefer fewer screens and fewer taps.
- Use plain operational language, not internal system language.
- Avoid deep menu trees and hidden dependency chains.
- Keep the most urgent action visible first.
- Prefer one clear primary action per screen.
- Use progressive disclosure for advanced options.
- Make screens feel calm, clear, and trustworthy under time pressure.
- Keep the interface modern and beautiful, but never decorative at the cost of speed or clarity.
- Do not make founders manage complexity the system should absorb for them.

When choosing between flexibility and simplicity, default to the simpler flow unless the business operation truly requires the extra complexity.

## Architecture Rules

- The current customer ordering flow is a protected surface.
- Every branch must remain an explicit operating unit with its own menu, pricing, availability, staff, and reports.
- Shared founders and owner-level partners must not be modeled as employees.
- Authorization logic must be centralized and reusable.
- Branch scope must be explicit in queries, services, and route handlers.
- Finance logic must live in domain code, not scattered through UI or API glue.
- Background jobs must be separate from request-time handlers.
- Schema changes must be captured in migrations.
- Audit-sensitive actions must remain traceable.

Do not introduce hidden coupling between orders, menus, reports, attendance, permissions, and finance.

## File Placement Rules

- Create files only in the correct domain directories.
- For web work, prefer:
  - `web/app/` for routes and page-level entry points
  - `web/components/` for reusable presentation and interaction
  - `web/lib/` for domain logic, services, and server helpers
  - `web/shared/` for shared types and schemas
  - `web/messages/` for translations
- For iOS work, prefer:
  - `mobile/SOder/SOder/views/` for SwiftUI views
  - `mobile/SOder/SOder/services/` for API and business services
  - `mobile/SOder/SOder/models/` for models
  - `mobile/SOder/SOder/localization/` for strings
- Do not create duplicate “misc” layers when a clear home already exists.
- Before creating a file, state the filepath and why it belongs there.

## Naming and Typing Rules

- Use `camelCase` for functions and variables.
- Use `PascalCase` for components, view models, and types.
- Use `kebab-case` for web file names unless an established local pattern requires otherwise.
- Every TypeScript function must be fully typed. Avoid implicit `any`.
- Keep shared contracts explicit rather than inferred through scattered ad hoc shapes.

## Code Quality Rules

- Keep features separated cleanly by domain.
- Prefer small modules with clear names and focused responsibilities.
- Do not mix UI formatting, authorization, and database logic in one file unless the change is truly tiny.
- Extend existing patterns when they are sound; do not invent new abstractions casually.
- Keep types, schemas, and contracts explicit.
- Add or update tests when changing money logic, permissions, attendance, org scope, or critical user flows.
- Make illegal states hard to represent.
- Favor readable code over clever code.
- Leave the codebase more organized than you found it.
- Prefer composition over inheritance.
- Keep functions small and single-purpose.
- Search for and reuse an existing solution before creating a new abstraction.
- Make sure to audit all key operations and actions—including errors and system bugs—so administrators can identify and fix issues. Maintain business audit logs for managers and owners, enabling them to clearly see who performed each action and when.

## Testing and Verification Rules

- For web changes, use the existing Jest and Testing Library setup where tests apply.
- For iOS changes, use XCTest and UI tests where tests apply.
- Run lint and the most relevant tests for the changed area whenever feasible.
- Critical paths should get both behavior verification and error-path verification.
- If a new module is non-trivial and testable, add a matching test or explain why not.

## Security and Reliability Rules

- Never hardcode secrets. Use environment variables or existing secure config paths.
- Validate and sanitize user-controlled input at the appropriate boundary.
- Keep auth, permissions, and scope checks explicit.
- Preserve or improve rate limiting on sensitive endpoints.
- Add robust error handling and logging for operationally important failures.

## Delivery Format Rules

Before creating files or proposing changes, the agent should clearly state:

- target filepath
- purpose
- main dependencies
- likely consumers

If a task requires an architecture change, call it out explicitly before implementation and explain the impact.

## Delivery Rules

A task is not complete unless the agent can explain:

- what foundation rule the work supports
- what existing behavior stayed stable
- what changed
- how it was verified
- what risks or follow-ups remain

If behavior or architecture changes materially, update the relevant docs too.

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

### Database

```bash
# Canonical bootstrap is in supabase/bootstrap.sql
# Self-contained SQL is in supabase/sql/
# Apply to a blank or reset Supabase database with:
# ./infra/scripts/apply_supabase_baseline.sh
```

## Repository Shape

```text
├── web/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── messages/
│   └── shared/
├── mobile/SOder/
│   ├── SOder/
│   ├── SOderTests/
│   └── SOderUITests/
├── infra/
│   ├── scripts/
│   └── test_data/
├── supabase/
│   ├── functions/
│   └── sql/
└── docs/
```

## Final Reminder

Build like a top engineer serving real restaurant operators:

- protect the stable paths
- reduce operational stress
- keep the UI clean
- keep the architecture honest
- keep the code organized enough that the next agent can extend it safely
