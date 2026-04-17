# Owner Multi-Branch Features: Gap Analysis & Implementation Plan

**Date**: 2026-04-15  
**Branch**: `claude/owner-multi-branch-features-IEX93`

---

## Business Workflow Overview

### Roles

The platform models an **owner_organization** as the top-level business entity. Each organization has members with one of five roles:

| Role | Description |
|------|-------------|
| `founder_full_control` | Full access to everything, including org settings and member management |
| `founder_operations` | Operations focus — no finance exports, billing, or org settings |
| `founder_finance` | Finance focus — reports, exports, billing only |
| `accountant_readonly` | Read-only finance data |
| `branch_general_manager` | Branch-scoped operations — no org-level access |

### Branch (Restaurant) Access

Each member has a `shop_scope`:
- `all_shops` — can access every branch in the org
- `selected_shops` — restricted to a specific subset (stored in `organization_member_shop_scopes`)

### Permission System

9 permissions: `reports`, `finance_exports`, `purchases`, `promotions`, `employees`, `attendance_approvals`, `restaurant_settings`, `organization_settings`, `billing`.

Each role has **default permissions** (`ROLE_DEFAULT_PERMISSIONS` in `web/lib/server/authorization/types.ts`). Individual members can have explicit overrides stored in `organization_member_permissions`.

### Order Management Flow

1. Customer scans QR code → creates session → places order
2. Web dashboard shows real-time order status (per active branch)
3. iOS app receives orders via Supabase Realtime → processes → prints receipts
4. Kitchen board groups identical items across orders

---

## Gap Analysis

### Priority 1 — Core Branch Operations (High Impact / Blocking)

| ID | Feature | Gap | Impact |
|----|---------|-----|--------|
| P1-1 | **Add a new branch** | No UI. New branches require a full restaurant onboarding flow with no way to link them to an existing org | Owners can't scale |
| P1-2 | **Cross-branch dashboard** | Home dashboard is scoped to active branch only. No org-level KPI view | No single pane of glass |
| P1-3 | **Organization settings editor** | `owner_organizations` stores name, timezone, currency, country but there is no UI/API to update them | Org data can't be corrected |
| P1-4 | **Email delivery for invites** | Invite tokens are returned to the API caller for manual distribution | Unusable at scale |

### Priority 2 — Staff & Access Management (High Impact / Day-to-Day)

| ID | Feature | Gap | Impact |
|----|---------|-----|--------|
| P2-1 | **Change member role** | No API or UI to change a member's role after joining | Requires remove + re-invite |
| P2-2 | **Update branch access scope** | No way to change `shop_scope` or `selected_restaurant_ids` for an existing member | Same friction |
| P2-3 | **Permission override UI** | `organization_member_permissions` table exists and the auth service reads it, but no UI or API to manage overrides | Overrides are DB-only |
| P2-4 | **Invite resend / extend expiry** | Pending invites expire after 7 days with no resend mechanism | Operational friction |
| P2-5 | **Cross-branch staff view** | Employees are per-branch. No org-level headcount view | Owner can't audit staff |

### Priority 3 — Branch Operations (Medium Impact / Efficiency)

| ID | Feature | Gap | Impact |
|----|---------|-----|--------|
| P3-1 | **Non-destructive menu copy** | Current copy deletes entire target menu before copying | Data safety risk |
| P3-2 | **Branch settings management** | No way to edit branch settings without switching active branch | Tedious for multi-branch |
| P3-3 | **Cross-branch finance reports** | Reports are per-branch only. No consolidated P&L or revenue roll-up | Blind spot for owner |
| P3-4 | **Bulk branch operations** | No cross-branch item availability toggle, announcements, etc. | Time cost |

### Priority 4 — Governance & Audit (Lower Urgency / Compliance)

| ID | Feature | Gap | Impact |
|----|---------|-----|--------|
| P4-1 | **Audit log UI** | No frontend for member/permission change history | Accountability |
| P4-2 | **Role change history** | Member role changes aren't tracked | Compliance |
| P4-3 | **Branch deactivation** | No way to soft-close a branch | Seasonal branches |

---

## Implementation Plan

### Sprint 1 — Core Management Unblocking ✅ IMPLEMENTED + BUGS FIXED

**A1: Organization Settings Editor**  
- `PATCH /api/v1/owner/organization` — update name, timezone, currency  
- Authorization: `canChangeOrgSettings()` (`founder_full_control` only)  
- UI: edit button in org header card → inline form with save/cancel  
- Files: `route.ts`, `queries.ts` (`updateOrganizationSettings`), `service.ts` (`updateOrganization`), `organization-client.tsx`

**B1: Edit Member Role & Scope**  
- `PATCH /api/v1/owner/organization/members/[memberId]` — update role, shop_scope, selected_restaurant_ids  
- Authorization: `canManageMembers()` (`founder_full_control` only)  
- Syncs `organization_member_shop_scopes` rows atomically  
- UI: pencil icon per member row → inline form → save/cancel  
- Files: `members/[memberId]/route.ts`, `queries.ts` (`updateOrganizationMember`), `service.ts` (`editMember`), `schemas.ts` (`updateMemberSchema`), `MembersPanel.tsx`

**Resend Invite (A4)**  
- DB migration `042_invite_resend.sql`: adds `last_resent_at`, `resend_count` columns  
- `POST /api/v1/owner/organization/invites/[inviteId]/resend` — regenerates token, extends expiry 7 days  
- Authorization: `canManageMembers()` only  
- UI: "Resend" button on each pending invite row → inline token card  
- Files: `invites/[inviteId]/resend/route.ts`, `invites.ts` (`resendPendingInvite`), `MembersPanel.tsx`

**Schema changes in Sprint 1:**
```sql
-- 042_invite_resend.sql
ALTER TABLE organization_pending_invites
  ADD COLUMN IF NOT EXISTS last_resent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resend_count   INT NOT NULL DEFAULT 0;
```

**Bug fixes applied (2026-04-16):**

| # | Severity | File | Bug | Fix |
|---|----------|------|-----|-----|
| 1 | Critical | `MembersPanel.tsx`, `queries.ts`, `types.ts`, `shared/types/organization.ts` | `EditMemberForm` initialised `selectedBranchIds` to `[]`; members with `selected_shops` scope lost their branch assignments on edit and were blocked by the "select at least one branch" validation | Added `accessible_restaurant_ids` to `OrganizationMemberWithUser` and `ApiOrganizationMember`; populated from `organization_member_shop_scopes` in `listOrganizationMembers`; `EditMemberForm` now initialises state from `member.accessible_restaurant_ids ?? []` |
| 2 | Medium | `members/[memberId]/route.ts` | DELETE handler did not filter by `is_active: true` when verifying the target member, so removing an already-deactivated member returned 200 success | Added `.eq('is_active', true)` to the membership lookup query |
| 3 | Medium | `MembersPanel.tsx` | `removeMember` and `revokeInvite` called `onRefresh()` unconditionally regardless of API response status, silently hiding errors | Added `res.ok` checks; errors are now surfaced via an `actionError` banner above the member list |
| 4 | Medium | `invites.ts` | `acceptPendingInvite` used `supabaseAdmin.auth.admin.listUsers()` (unbounded, single-page) to find a user by email — could miss users past the default page limit and create duplicate auth accounts | Replaced with a targeted `users` table query (`.eq('email', email)`) which is indexed and returns the correct result regardless of total user count |

---

### Sprint 2 — Branch Creation & Overview Dashboard ✅ IMPLEMENTED

**A2: Add Branch to Existing Org**
- `POST /api/v1/owner/organization/restaurants` — create new `restaurants` row + link via `organization_restaurants`
- Reuse onboarding `BasicInfoStep` as a modal
- Guard: `founder_full_control` only

**A3: Cross-Branch Overview Dashboard**
- New `/dashboard/overview` page for founders
- Widgets: today's revenue per branch, open orders per branch, low-stock alerts
- API: `GET /api/v1/owner/organization/overview` — aggregates across accessible branches

---

### Sprint 3 — Email Delivery & Permission UI ✅ IMPLEMENTED

**A4 (continued): Email delivery**
- Integrate Resend/SendGrid or Supabase Email edge function
- Send branded invite email on creation and resend

**B2: Permission Override UI**
- `GET /api/v1/owner/organization/members/[id]/permissions` — effective permissions + which are overridden
- `PATCH /api/v1/owner/organization/members/[id]/permissions` — upsert override rows
- UI: expandable permission editor per member (toggle checkboxes showing "default" vs "override")

**B3: Cross-Branch Staff View**
- `GET /api/v1/owner/organization/employees` — joins employees across all accessible branches
- New tab in `/dashboard/branches` or dedicated `/dashboard/staff` page

---

### Sprint 4 — Operational Improvements ⏳ PENDING

**C1: Safe Menu Copy (Non-Destructive)**
- New `mode` option in `CopyMenuRequest`: `'replace' | 'merge' | 'add_missing'`
- `add_missing`: only add categories/items not already in target

**C2: Cross-Branch Finance Report**
- `GET /api/v1/owner/organization/reports/summary` — aggregated revenue, orders, avg ticket
- Visible to `founder_full_control` and `founder_finance`

**C3: Branch Settings at Org Level**
- `GET/PATCH /api/v1/owner/organization/branches/[id]/settings` — proxy without switching active branch
- UI: settings modal accessible from branches list

---

### Sprint 5 — Governance ⏳ PENDING

**P4-1: Audit Log UI** — browse `organization_audit_log` table  
**P4-3: Branch Deactivation** — soft-close with `is_active = false`

**Schema changes for Sprint 5:**
```sql
CREATE TABLE organization_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES owner_organizations(id),
  actor_user_id   UUID NOT NULL,
  action          TEXT NOT NULL,
  target_user_id  UUID,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Key File Locations

| Area | Path |
|------|------|
| Auth types & role defaults | `web/lib/server/authorization/types.ts` |
| Authorization service | `web/lib/server/authorization/service.ts` |
| Org domain types | `web/lib/server/organizations/types.ts` |
| Org queries | `web/lib/server/organizations/queries.ts` |
| Org service | `web/lib/server/organizations/service.ts` |
| Invite service | `web/lib/server/organizations/invites.ts` |
| Zod schemas | `web/lib/server/organizations/schemas.ts` |
| Shared API types | `web/shared/types/organization.ts` |
| Organization page | `web/app/[locale]/(restaurant)/dashboard/organization/` |
| Branches page | `web/app/[locale]/(restaurant)/dashboard/branches/` |
| MembersPanel | `web/components/features/admin/organization/MembersPanel.tsx` |
| Organization API | `web/app/api/v1/owner/organization/` |
| DB migrations | `infra/migrations/` |
| i18n messages | `web/messages/{en,ja,vi}/owner/organization.json` |
