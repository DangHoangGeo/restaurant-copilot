/** @jest-environment node */

import {
  buildDashboardOverview,
  getPlatformOverviewPeriodStart,
} from '../platform/overview';

describe('platform overview helpers', () => {
  it('derives the expected period start for rolling windows', () => {
    const now = new Date('2026-04-22T12:00:00.000Z');

    expect(getPlatformOverviewPeriodStart('today', now)).toBe('2026-04-22');
    expect(getPlatformOverviewPeriodStart('7days', now)).toBe('2026-04-15');
    expect(getPlatformOverviewPeriodStart('30days', now)).toBe('2026-03-23');
  });

  it('builds the dashboard overview from summary and trend rows', () => {
    const overview = buildDashboardOverview({
      period: '30days',
      summary: {
        total_tenants: '10',
        new_signups: '2',
        suspended_tenants: '1',
        on_trial: '3',
        active_subscribers: '4',
        canceled_in_period: '1',
        total_mrr: '120000',
        total_arr: '1440000',
        total_tickets: '9',
        new_tickets: '2',
        resolved_tickets: '3',
        closed_tickets: '1',
        sla_breached_tickets: '1',
        avg_resolution_time_hours: '4.5',
        total_orders: '440',
        total_customers: '300',
        total_ai_calls: '1200',
        avg_orders_per_restaurant: '44',
      },
      trends: [
        {
          snapshot_date: '2026-04-20',
          signups: '1',
          orders: '100',
          revenue: '50000',
        },
      ],
    });

    expect(overview).toEqual({
      period: '30days',
      tenants: {
        total: 10,
        on_trial: 3,
        active_subscribers: 4,
        suspended: 1,
        new_signups: 2,
      },
      revenue: {
        total: 1440000,
        mrr: 120000,
        arr: 1440000,
        churn_rate: 25,
      },
      support: {
        total_tickets: 9,
        new_tickets: 2,
        unresolved_tickets: 5,
        sla_breached: 1,
        avg_resolution_time_hours: 4.5,
      },
      usage: {
        total_orders: 440,
        total_customers: 300,
        total_ai_calls: 1200,
        avg_orders_per_tenant: 44,
      },
      trends: [
        {
          date: '2026-04-20',
          signups: 1,
          orders: 100,
          revenue: 50000,
        },
      ],
    });
  });
});
