import type { OrgBranch } from './queries';
import type { OrgBranchOverview, OrgOverviewResponse } from '@/shared/types/organization';

export interface OrganizationBranchMetricRow {
  restaurant_id: string;
  today_revenue: number | string | null;
  open_orders_count: number | string | null;
}

export function buildOrganizationOverview(params: {
  branches: OrgBranch[];
  metrics: OrganizationBranchMetricRow[] | null | undefined;
}): OrgOverviewResponse {
  const metricMap = new Map(
    (params.metrics ?? []).map((metric) => [
      metric.restaurant_id,
      {
        today_revenue: toNumber(metric.today_revenue),
        open_orders_count: toNumber(metric.open_orders_count),
      },
    ]),
  );

  const branches: OrgBranchOverview[] = params.branches.map((branch) => {
    const metrics = metricMap.get(branch.id);

    return {
      restaurant_id: branch.id,
      name: branch.name,
      subdomain: branch.subdomain,
      today_revenue: metrics?.today_revenue ?? 0,
      open_orders_count: metrics?.open_orders_count ?? 0,
    };
  });

  return {
    branches,
    total_today_revenue: branches.reduce((sum, branch) => sum + branch.today_revenue, 0),
    total_open_orders: branches.reduce((sum, branch) => sum + branch.open_orders_count, 0),
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}
