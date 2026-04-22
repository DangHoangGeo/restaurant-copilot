/** @jest-environment node */

import { buildOrganizationOverview } from '../organizations/overview';

describe('organization overview helper', () => {
  it('maps branch metrics and totals into the API response shape', () => {
    const overview = buildOrganizationOverview({
      branches: [
        {
          id: 'branch-a',
          name: 'Shibuya',
          subdomain: 'shibuya',
        },
        {
          id: 'branch-b',
          name: 'Shinjuku',
          subdomain: 'shinjuku',
        },
      ],
      metrics: [
        {
          restaurant_id: 'branch-a',
          today_revenue: '15000',
          open_orders_count: '4',
        },
      ],
    });

    expect(overview).toEqual({
      branches: [
        {
          restaurant_id: 'branch-a',
          name: 'Shibuya',
          subdomain: 'shibuya',
          today_revenue: 15000,
          open_orders_count: 4,
        },
        {
          restaurant_id: 'branch-b',
          name: 'Shinjuku',
          subdomain: 'shinjuku',
          today_revenue: 0,
          open_orders_count: 0,
        },
      ],
      total_today_revenue: 15000,
      total_open_orders: 4,
    });
  });
});
