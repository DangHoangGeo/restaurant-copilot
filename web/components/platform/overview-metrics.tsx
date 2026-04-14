'use client';

// Overview Metrics Cards Component

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { Users, DollarSign, MessageSquare, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardOverview } from '@/shared/types/platform';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to load overview metrics');
  }
  return response.json();
};

export default function OverviewMetrics() {
  const t = useTranslations('platform.overview');
  const tc = useTranslations('platform.common');
  const searchParams = useSearchParams();
  const period = useMemo(() => {
    const value = searchParams.get('period');
    return value === 'today' || value === '7days' || value === '30days' || value === '90days'
      ? value
      : '30days';
  }, [searchParams]);

  const { data: overview, isLoading, error } = useSWR<DashboardOverview>(
    `/api/v1/platform/overview?period=${period}`,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  if (error || !overview) {
    return <div className="text-center text-gray-500">{tc('error')}</div>;
  }

  const metrics = [
    {
      title: t('tenants.title'),
      icon: Users,
      value: overview.tenants.total,
      subtitle: `${overview.tenants.on_trial} on trial, ${overview.tenants.active_subscribers} active`,
      badge: overview.tenants.new_signups > 0 ? `+${overview.tenants.new_signups} new` : null,
      badgeVariant: 'default' as const
    },
    {
      title: t('revenue.title'),
      icon: DollarSign,
      value: `$${overview.revenue.mrr.toLocaleString()}`,
      subtitle: `ARR: $${overview.revenue.arr.toLocaleString()}`,
      badge: overview.revenue.churn_rate > 0 ? `${overview.revenue.churn_rate.toFixed(1)}% churn` : null,
      badgeVariant: overview.revenue.churn_rate > 5 ? 'destructive' as const : 'secondary' as const
    },
    {
      title: t('support.title'),
      icon: MessageSquare,
      value: overview.support.unresolved_tickets,
      subtitle: `${overview.support.total_tickets} total tickets`,
      badge: overview.support.sla_breached > 0 ? `${overview.support.sla_breached} breached` : null,
      badgeVariant: 'destructive' as const
    },
    {
      title: t('usage.title'),
      icon: TrendingUp,
      value: overview.usage.total_orders.toLocaleString(),
      subtitle: `${overview.usage.avg_orders_per_tenant.toFixed(1)} avg per tenant`,
      badge: null,
      badgeVariant: 'default' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
              {metric.badge && (
                <Badge variant={metric.badgeVariant} className="mt-2">
                  {metric.badge}
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
