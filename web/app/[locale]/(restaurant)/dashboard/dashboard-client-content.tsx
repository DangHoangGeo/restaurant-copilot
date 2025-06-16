'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/features/admin/dashboard/StatCard';
import { QuickActions } from '@/components/features/admin/dashboard/QuickActions';
import { RecentOrdersTable, RecentOrder } from '@/components/features/admin/dashboard/RecentOrdersTable';
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { Card, CardContent } from '@/components/ui/card';
import { ComingSoon } from '@/components/common/coming-soon';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';
import { DashboardSkeleton } from '@/components/ui/skeletons/dashboard-skeleton';
import { ErrorState } from '@/components/ui/states/error-state';

// Define the dashboard metrics interface
export interface DashboardData {
  todaySales: number;
  activeOrdersCount: number;
  topSellerToday: { name: string; metricValue: string } | null;
  lowStockItemsCount: number;
}

export function DashboardClientContent() {
  const [metrics, setMetrics] = useState<DashboardData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('AdminDashboard');
  const tCommon = useTranslations('Common');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [metricsRes, ordersRes] = await Promise.all([
        fetch('/api/v1/owner/dashboard/metrics', { credentials: 'include' }),
        fetch('/api/v1/owner/dashboard/recent-orders', { credentials: 'include' })
      ]);

      if (!metricsRes.ok || !ordersRes.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const [metricsData, ordersData] = await Promise.all([
        metricsRes.json(),
        ordersRes.json()
      ]);

      setMetrics(metricsData);
      setRecentOrders(ordersData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : t('errors.fetch_failed'));
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds for live data
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Show loading skeleton during initial load
  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={loadData}
        title={t('errors.dashboard_load_failed')}
      />
    );
  }

  // Use FEATURE_FLAGS directly
  const lowStockAlertsEnabled = FEATURE_FLAGS.lowStockAlerts;
  const topSellerName = metrics?.topSellerToday?.name ?? t('cards.top_seller_unavailable');
  const topSellerMetric = metrics?.topSellerToday?.metricValue ?? '';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </header>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          titleKey="cards.todays_sales"
          value={metrics ? formatCurrency(metrics.todaySales, 'JPY') : 'N/A'}
          icon={DollarSign}
          colorClass="text-blue-600 dark:text-blue-400"
          bgColorClass="bg-blue-100 dark:bg-blue-900/30"
          isLoading={isLoading}
        />
        <StatCard
          titleKey="cards.active_orders"
          value={metrics ? metrics.activeOrdersCount : 'N/A'}
          icon={ShoppingCart}
          colorClass="text-indigo-600 dark:text-indigo-400"
          bgColorClass="bg-indigo-100 dark:bg-indigo-900/30"
          isLoading={isLoading}
        />
        <StatCard
          titleKey="cards.top_seller_today"
          value={isLoading ? tCommon('loading') : topSellerName}
          icon={TrendingUp}
          trend={isLoading ? '' : String(topSellerMetric)}
          colorClass="text-emerald-600 dark:text-emerald-400"
          bgColorClass="bg-emerald-100 dark:bg-emerald-900/30"
          isLoading={isLoading}
        />
        {lowStockAlertsEnabled ? (
          <StatCard
            titleKey="cards.low_stock_alerts"
            value={metrics ? metrics.lowStockItemsCount : 'N/A'}
            icon={AlertTriangle}
            trend={metrics && metrics.lowStockItemsCount > 0 ? tCommon('needs_attention') : tCommon('all_good')}
            colorClass="text-amber-600 dark:text-amber-400"
            bgColorClass="bg-amber-100 dark:bg-amber-900/30"
            isAlert={metrics ? metrics.lowStockItemsCount > 0 : false}
            isLoading={isLoading}
          />
        ) : (
          <Card className="flex items-center justify-center">
            <CardContent className="p-6">
              <ComingSoon featureName="feature.low_stock_alerts_dashboard" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Orders and Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentOrdersTable orders={recentOrders} isLoading={isLoading} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
      
      {/* Placeholder for more charts/reports */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <ComingSoon featureName="feature.sales_over_time_chart" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <ComingSoon featureName="feature.popular_items_report" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
