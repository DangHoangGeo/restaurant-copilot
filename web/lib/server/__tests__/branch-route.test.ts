/** @jest-environment node */

jest.mock('@/lib/server/getUserFromRequest', () => ({
  getUserFromRequest: jest.fn(),
}));

jest.mock('@/lib/server/organizations/service', () => ({
  resolveOrgContext: jest.fn(),
}));

import { resolveScopedBranchRouteAccess } from '../organizations/branch-route';
import { getUserFromRequest } from '../getUserFromRequest';
import { resolveOrgContext } from '../organizations/service';

const mockedGetUserFromRequest = jest.mocked(getUserFromRequest);
const mockedResolveOrgContext = jest.mocked(resolveOrgContext);

describe('resolveScopedBranchRouteAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers organization scope over the legacy branch shortcut', async () => {
    mockedGetUserFromRequest.mockResolvedValue({
      userId: 'user-1',
      email: 'owner@example.com',
      restaurantId: 'branch-a',
      subdomain: 'branch-a',
      role: 'owner',
      restaurantSettings: null,
      organization: {
        organizationId: 'org-1',
        role: 'founder_finance',
        accessibleRestaurantIds: ['branch-b'],
        permissionOverrides: {},
      },
    });

    mockedResolveOrgContext.mockResolvedValue({
      organization: {
        id: 'org-1',
        name: 'Org One',
        slug: 'org-one',
        public_subdomain: 'org-one',
        approval_status: 'approved',
        country: 'JP',
        timezone: 'Asia/Tokyo',
        currency: 'JPY',
        is_active: true,
        created_by: 'user-1',
        created_at: '2026-04-22T00:00:00.000Z',
        updated_at: '2026-04-22T00:00:00.000Z',
      },
      member: {
        id: 'member-1',
        organization_id: 'org-1',
        user_id: 'user-1',
        role: 'founder_finance',
        shop_scope: 'selected_shops',
        invited_by: null,
        joined_at: '2026-04-22T00:00:00.000Z',
        is_active: true,
        created_at: '2026-04-22T00:00:00.000Z',
        updated_at: '2026-04-22T00:00:00.000Z',
      },
      accessibleRestaurantIds: ['branch-b'],
      permissionOverrides: new Map(),
    });

    await expect(resolveScopedBranchRouteAccess('branch-a')).resolves.toBeNull();
  });

  it('allows organization members to access an authorized branch', async () => {
    mockedGetUserFromRequest.mockResolvedValue({
      userId: 'user-1',
      email: 'owner@example.com',
      restaurantId: 'branch-a',
      subdomain: 'branch-a',
      role: 'owner',
      restaurantSettings: null,
      organization: {
        organizationId: 'org-1',
        role: 'founder_operations',
        accessibleRestaurantIds: ['branch-b'],
        permissionOverrides: {},
      },
    });

    mockedResolveOrgContext.mockResolvedValue({
      organization: {
        id: 'org-1',
        name: 'Org One',
        slug: 'org-one',
        public_subdomain: 'org-one',
        approval_status: 'approved',
        country: 'JP',
        timezone: 'Asia/Tokyo',
        currency: 'JPY',
        is_active: true,
        created_by: 'user-1',
        created_at: '2026-04-22T00:00:00.000Z',
        updated_at: '2026-04-22T00:00:00.000Z',
      },
      member: {
        id: 'member-1',
        organization_id: 'org-1',
        user_id: 'user-1',
        role: 'founder_operations',
        shop_scope: 'selected_shops',
        invited_by: null,
        joined_at: '2026-04-22T00:00:00.000Z',
        is_active: true,
        created_at: '2026-04-22T00:00:00.000Z',
        updated_at: '2026-04-22T00:00:00.000Z',
      },
      accessibleRestaurantIds: ['branch-b'],
      permissionOverrides: new Map(),
    });

    await expect(resolveScopedBranchRouteAccess('branch-b')).resolves.toMatchObject({
      branchId: 'branch-b',
    });
  });

  it('falls back to the legacy owner-manager branch check only when no org context exists', async () => {
    mockedGetUserFromRequest.mockResolvedValue({
      userId: 'user-1',
      email: 'owner@example.com',
      restaurantId: 'branch-a',
      subdomain: 'branch-a',
      role: 'manager',
      restaurantSettings: null,
      organization: null,
    });

    mockedResolveOrgContext.mockResolvedValue(null);

    await expect(resolveScopedBranchRouteAccess('branch-a')).resolves.toMatchObject({
      branchId: 'branch-a',
      organizationContext: null,
    });
  });
});
