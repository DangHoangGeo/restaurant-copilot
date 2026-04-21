/** @jest-environment node */

import { canAccessRestaurantSettings } from "../restaurant-settings-access";
import type { OrgContext } from "../organizations/types";

function buildOrgContext(overrides?: Partial<OrgContext>): OrgContext {
  return {
    organization: {
      id: "org-1",
      name: "Acme Foods",
      slug: "acme-foods",
      public_subdomain: "acme",
      approval_status: "approved",
      country: "JP",
      timezone: "Asia/Tokyo",
      currency: "JPY",
      is_active: true,
      created_by: "user-1",
      created_at: "2026-04-21T00:00:00.000Z",
      updated_at: "2026-04-21T00:00:00.000Z",
    },
    member: {
      id: "member-1",
      organization_id: "org-1",
      user_id: "user-1",
      role: "founder_full_control",
      shop_scope: "all_shops",
      invited_by: null,
      joined_at: "2026-04-21T00:00:00.000Z",
      is_active: true,
      created_at: "2026-04-21T00:00:00.000Z",
      updated_at: "2026-04-21T00:00:00.000Z",
    },
    accessibleRestaurantIds: ["branch-1"],
    permissionOverrides: new Map(),
    ...overrides,
  };
}

describe("canAccessRestaurantSettings", () => {
  it("allows legacy owner access when no org context exists", () => {
    expect(
      canAccessRestaurantSettings({
        user: { role: "owner", restaurantId: "branch-1" },
        orgContext: null,
      }),
    ).toBe(true);
  });

  it("blocks legacy employee access when no org context exists", () => {
    expect(
      canAccessRestaurantSettings({
        user: { role: "employee", restaurantId: "branch-1" },
        orgContext: null,
      }),
    ).toBe(false);
  });

  it("blocks founder finance when org context denies restaurant settings", () => {
    const orgContext = buildOrgContext({
      member: {
        ...buildOrgContext().member,
        role: "founder_finance",
      },
    });

    expect(
      canAccessRestaurantSettings({
        user: { role: "manager", restaurantId: "branch-1" },
        orgContext,
      }),
    ).toBe(false);
  });

  it("allows branch general manager with branch access", () => {
    const orgContext = buildOrgContext({
      member: {
        ...buildOrgContext().member,
        role: "branch_general_manager",
      },
    });

    expect(
      canAccessRestaurantSettings({
        user: { role: "manager", restaurantId: "branch-1" },
        orgContext,
      }),
    ).toBe(true);
  });

  it("blocks org members without access to the current branch", () => {
    const orgContext = buildOrgContext({
      accessibleRestaurantIds: ["branch-2"],
    });

    expect(
      canAccessRestaurantSettings({
        user: { role: "owner", restaurantId: "branch-1" },
        orgContext,
      }),
    ).toBe(false);
  });
});
