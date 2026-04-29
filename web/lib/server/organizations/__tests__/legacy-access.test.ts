/** @jest-environment node */

import { mapOrgRoleToLegacyUserAccess } from "../legacy-access";

describe("mapOrgRoleToLegacyUserAccess", () => {
  it("maps operational founder roles to legacy owner access for the resolved branch", () => {
    expect(
      mapOrgRoleToLegacyUserAccess("founder_operations", "branch-1"),
    ).toEqual({
      role: "owner",
      restaurantId: "branch-1",
      grantsBranchAccess: true,
    });
  });

  it("maps branch managers to legacy manager access for the resolved branch", () => {
    expect(
      mapOrgRoleToLegacyUserAccess("branch_general_manager", "branch-1"),
    ).toEqual({
      role: "manager",
      restaurantId: "branch-1",
      grantsBranchAccess: true,
    });
  });

  it("keeps accountant readonly users out of legacy branch access", () => {
    expect(
      mapOrgRoleToLegacyUserAccess("accountant_readonly", "branch-1"),
    ).toEqual({
      role: "staff",
      restaurantId: null,
      grantsBranchAccess: false,
    });
  });
});
