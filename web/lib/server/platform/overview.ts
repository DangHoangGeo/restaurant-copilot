import type { DashboardOverview } from '@/shared/types/platform';

export interface PlatformOverviewSummaryRow {
  total_tenants: number | string | null;
  new_signups: number | string | null;
  suspended_tenants: number | string | null;
  on_trial: number | string | null;
  active_subscribers: number | string | null;
  canceled_in_period: number | string | null;
  total_mrr: number | string | null;
  total_arr: number | string | null;
  total_tickets: number | string | null;
  new_tickets: number | string | null;
  resolved_tickets: number | string | null;
  closed_tickets: number | string | null;
  sla_breached_tickets: number | string | null;
  avg_resolution_time_hours: number | string | null;
  total_orders: number | string | null;
  total_customers: number | string | null;
  total_ai_calls: number | string | null;
  avg_orders_per_restaurant: number | string | null;
}

export interface PlatformOverviewTrendRow {
  snapshot_date: string;
  signups: number | string | null;
  orders: number | string | null;
  revenue: number | string | null;
}

export function getPlatformOverviewPeriodStart(
  period: DashboardOverview['period'],
  now: Date = new Date()
): string {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  switch (period) {
    case 'today':
      break;
    case '7days':
      periodStart.setUTCDate(periodStart.getUTCDate() - 7);
      break;
    case '30days':
      periodStart.setUTCDate(periodStart.getUTCDate() - 30);
      break;
    case '90days':
      periodStart.setUTCDate(periodStart.getUTCDate() - 90);
      break;
  }

  return periodStart.toISOString().split('T')[0];
}

export function buildDashboardOverview(params: {
  period: DashboardOverview['period'];
  summary: PlatformOverviewSummaryRow | null | undefined;
  trends: PlatformOverviewTrendRow[] | null | undefined;
}): DashboardOverview {
  const summary = params.summary ?? {
    total_tenants: 0,
    new_signups: 0,
    suspended_tenants: 0,
    on_trial: 0,
    active_subscribers: 0,
    canceled_in_period: 0,
    total_mrr: 0,
    total_arr: 0,
    total_tickets: 0,
    new_tickets: 0,
    resolved_tickets: 0,
    closed_tickets: 0,
    sla_breached_tickets: 0,
    avg_resolution_time_hours: 0,
    total_orders: 0,
    total_customers: 0,
    total_ai_calls: 0,
    avg_orders_per_restaurant: 0,
  };

  const totalTickets = toNumber(summary.total_tickets);
  const resolvedTickets = toNumber(summary.resolved_tickets);
  const closedTickets = toNumber(summary.closed_tickets);
  const activeSubscribers = toNumber(summary.active_subscribers);
  const canceledInPeriod = toNumber(summary.canceled_in_period);

  return {
    period: params.period,
    tenants: {
      total: toNumber(summary.total_tenants),
      on_trial: toNumber(summary.on_trial),
      active_subscribers: activeSubscribers,
      suspended: toNumber(summary.suspended_tenants),
      new_signups: toNumber(summary.new_signups),
    },
    revenue: {
      total: toNumber(summary.total_arr),
      mrr: toNumber(summary.total_mrr),
      arr: toNumber(summary.total_arr),
      churn_rate: activeSubscribers > 0 ? (canceledInPeriod / activeSubscribers) * 100 : 0,
    },
    support: {
      total_tickets: totalTickets,
      new_tickets: toNumber(summary.new_tickets),
      unresolved_tickets: Math.max(totalTickets - resolvedTickets - closedTickets, 0),
      sla_breached: toNumber(summary.sla_breached_tickets),
      avg_resolution_time_hours: toNumber(summary.avg_resolution_time_hours),
    },
    usage: {
      total_orders: toNumber(summary.total_orders),
      total_customers: toNumber(summary.total_customers),
      total_ai_calls: toNumber(summary.total_ai_calls),
      avg_orders_per_tenant: toNumber(summary.avg_orders_per_restaurant),
    },
    trends:
      params.trends?.map((trend) => ({
        date: trend.snapshot_date,
        signups: toNumber(trend.signups),
        orders: toNumber(trend.orders),
        revenue: toNumber(trend.revenue),
      })) ?? [],
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}
