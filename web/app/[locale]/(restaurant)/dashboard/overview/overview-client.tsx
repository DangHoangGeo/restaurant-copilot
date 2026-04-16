'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, ShoppingBag, LayoutGrid } from 'lucide-react';
import type { OrgOverviewResponse } from '@/shared/types/organization';

interface OverviewClientProps {
  data: OrgOverviewResponse;
  currency: string;
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function OverviewClient({ data, currency }: OverviewClientProps) {
  const t = useTranslations('owner.overview');

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{t('pageTitle')}</h1>
            <p className="text-xs text-muted-foreground">{t('pageDescription')}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('totalRevenueLabel')}</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(data.total_today_revenue, currency)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('totalOpenOrdersLabel')}</p>
              <p className="text-2xl font-bold tabular-nums">{data.total_open_orders}</p>
            </div>
          </div>
        </div>

        {/* Per-branch breakdown */}
        <div>
          <h2 className="text-sm font-semibold mb-3">{t('branchesHeading')}</h2>

          {data.branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noAccess')}</p>
          ) : (
            <div className="space-y-3">
              {data.branches.map((branch) => (
                <div
                  key={branch.restaurant_id}
                  className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  {/* Branch name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{branch.name}</p>
                    <p className="text-xs text-muted-foreground">{branch.subdomain}.coorder.ai</p>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t('todayRevenueLabel')}</p>
                      <p className="text-sm font-semibold tabular-nums text-green-600">
                        {formatCurrency(branch.today_revenue, currency)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t('openOrdersLabel')}</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {branch.open_orders_count}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
