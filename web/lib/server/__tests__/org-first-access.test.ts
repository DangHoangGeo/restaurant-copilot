/** @jest-environment node */

jest.mock("@/lib/server/getUserFromRequest", () => ({
  getUserFromRequest: jest.fn(),
}));

jest.mock("@/lib/server/organizations/service", () => ({
  resolveOrgContext: jest.fn(),
}));

jest.mock("@/lib/server/organizations/active-branch", () => ({
  getActiveBranchId: jest.fn(),
}));

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() =>
            Promise.resolve({ data: { currency: "JPY" } }),
          ),
        })),
      })),
    })),
  },
}));

import { resolvePromotionsAccess } from "../promotions/access";
import { resolvePurchasingAccess } from "../purchasing/access";
import { resolveFinanceAccess } from "../finance/access";
import { getUserFromRequest } from "../getUserFromRequest";
import { resolveOrgContext } from "../organizations/service";
import { getActiveBranchId } from "../organizations/active-branch";
import type { AuthUser } from "../getUserFromRequest";
import type { OrgContext, OrgMemberRole } from "../organizations/types";

const mockedGetUserFromRequest = jest.mocked(getUserFromRequest);
const mockedResolveOrgContext = jest.mocked(resolveOrgContext);
const mockedGetActiveBranchId = jest.mocked(getActiveBranchId);

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    userId: "user-1",
    email: "user@example.com",
    restaurantId: "branch-1",
    subdomain: "branch-1",
    role: "manager",
    restaurantSettings: null,
    organization: null,
    ...overrides,
  };
}

function buildOrgContext(role: OrgMemberRole): OrgContext {
  return {
    organization: {
      id: "org-1",
      name: "Org One",
      slug: "org-one",
      public_subdomain: "org-one",
      approval_status: "approved",
      country: "JP",
      timezone: "Asia/Tokyo",
      currency: "JPY",
      is_active: true,
      created_by: "founder-1",
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z",
    },
    member: {
      id: "member-1",
      organization_id: "org-1",
      user_id: "user-1",
      role,
      shop_scope: "selected_shops",
      invited_by: "founder-1",
      joined_at: "2026-04-27T00:00:00.000Z",
      is_active: true,
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z",
    },
    accessibleRestaurantIds: ["branch-1"],
    permissionOverrides: new Map(),
  };
}

describe("org-first mixed access helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserFromRequest.mockResolvedValue(buildUser());
    mockedGetActiveBranchId.mockResolvedValue("branch-1");
  });

  it("does not let a legacy manager role bypass org promotion permissions", async () => {
    mockedResolveOrgContext.mockResolvedValue(buildOrgContext("founder_finance"));

    await expect(resolvePromotionsAccess()).resolves.toBeNull();
  });

  it("uses org permissions for purchasing even when the legacy role is manager", async () => {
    mockedResolveOrgContext.mockResolvedValue(
      buildOrgContext("accountant_readonly"),
    );

    await expect(resolvePurchasingAccess()).resolves.toMatchObject({
      restaurantId: "branch-1",
      userId: "user-1",
      canWrite: false,
    });
  });

  it("falls back to legacy branch access only when no org context exists", async () => {
    mockedResolveOrgContext.mockResolvedValue(null);

    await expect(resolvePurchasingAccess()).resolves.toEqual({
      restaurantId: "branch-1",
      userId: "user-1",
      canWrite: true,
    });
  });

  it("uses org finance permissions instead of legacy owner close authority", async () => {
    mockedGetUserFromRequest.mockResolvedValue(buildUser({ role: "owner" }));
    mockedResolveOrgContext.mockResolvedValue(buildOrgContext("founder_finance"));

    await expect(resolveFinanceAccess()).resolves.toMatchObject({
      restaurantId: "branch-1",
      organizationId: "org-1",
      userId: "user-1",
      canExport: true,
      canClose: false,
    });
  });
});
