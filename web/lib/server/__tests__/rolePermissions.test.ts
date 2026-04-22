/** @jest-environment node */

import { checkAuthorization, hasPermission } from '../rolePermissions';
import type { AuthUser } from '../getUserFromRequest';

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    userId: 'user-1',
    email: 'owner@example.com',
    restaurantId: 'restaurant-1',
    subdomain: 'branch-one',
    role: 'owner',
    restaurantSettings: null,
    organization: null,
    ...overrides,
  };
}

describe('role permission bridge', () => {
  it('uses the organization permission model when org context exists', () => {
    const user = createUser({
      organization: {
        organizationId: 'org-1',
        role: 'founder_finance',
        accessibleRestaurantIds: ['restaurant-1'],
        permissionOverrides: {},
      },
    });

    expect(hasPermission(user, 'categories', 'UPDATE')).toBe(false);
    expect(hasPermission(user, 'analytics', 'SELECT')).toBe(true);
  });

  it('honors explicit org permission overrides', () => {
    const user = createUser({
      organization: {
        organizationId: 'org-1',
        role: 'founder_finance',
        accessibleRestaurantIds: ['restaurant-1'],
        permissionOverrides: {
          restaurant_settings: true,
        },
      },
    });

    expect(hasPermission(user, 'tables', 'UPDATE')).toBe(true);
  });

  it('prevents operational writes for accountant members even if legacy role says owner', async () => {
    const user = createUser({
      organization: {
        organizationId: 'org-1',
        role: 'accountant_readonly',
        accessibleRestaurantIds: ['restaurant-1'],
        permissionOverrides: {},
      },
    });

    const response = checkAuthorization(user, 'tables', 'INSERT');

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({
      error: 'Forbidden: Insufficient permissions',
      details: 'User cannot INSERT tables in the current branch scope',
    });
  });

  it('keeps legacy branch-role behavior for users without org context', () => {
    const user = createUser({
      role: 'server',
      organization: null,
    });

    expect(hasPermission(user, 'orders', 'SELECT')).toBe(true);
    expect(hasPermission(user, 'orders', 'DELETE')).toBe(false);
  });
});
