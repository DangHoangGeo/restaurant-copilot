'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { StatCard } from '@/components/features/admin/dashboard/StatCard';
import { MobileStatsCards } from '@/components/features/admin/dashboard/MobileStatsCards';
import { QuickActions } from '@/components/features/admin/dashboard/QuickActions';
import { RecentOrdersTable, RecentOrder } from '@/components/features/admin/dashboard/RecentOrdersTable';
import { PopularItemsList, PopularItem } from '@/components/features/admin/dashboard/PopularItemsList';
import { LowStockAlerts, LowStockItem } from '@/components/features/admin/dashboard/LowStockAlerts';
import { ChartSkeleton } from '@/components/ui/skeletons/chart-skeleton';
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/common/coming-soon';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';
import { DashboardSkeleton } from '@/components/ui/skeletons/dashboard-skeleton';
import { ErrorState } from '@/components/ui/states/error-state';
import { useRestaurantSettings } from '@/contexts/RestaurantContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Define the dashboard metrics interface
import { SalesDataPoint } from '@/components/features/admin/dashboard/SalesOverTimeChart';

const SalesOverTimeChart = dynamic(
  () => import('@/components/features/admin/dashboard/SalesOverTimeChart').then(mod => mod.SalesOverTimeChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

export interface DashboardData {
  todaySales: number;
  activeOrdersCount: number;
  topSellerToday: { name: string; metricValue: string } | null;
  lowStockItemsCount: number;
}

export function DashboardClientContent() {
  const [metrics, setMetrics] = useState<DashboardData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('owner.dashboard');
  const tCommon = useTranslations('common');
  const { needsOnboarding, isLoading: contextLoading } = useRestaurantSettings();
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/owner/dashboard/aggregate', { 
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' 
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const result = await response.json();
      
      // Handle both old format (direct data) and new format (with success wrapper)
      const data = result.success ? result.data : result;

      setMetrics(data.metrics);
      setRecentOrders(data.recentOrders || []);
      setPopularItems(data.popularItems || []);
      setSalesData(data.salesOverTime || []);
      setLowStockItems(data.lowStockItems || []);
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
    // Note: Removed auto-refresh for dashboard metrics as they don't require real-time updates
    // The orders page handles real-time order updates through Supabase Realtime
  }, [loadData]);

  // Show onboarding welcome screen if not yet onboarded
  if (FEATURE_FLAGS.onboarding && needsOnboarding && !contextLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="text-center">
          <CardHeader className="pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Welcome to CoOrder!
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Let&apos;s get your restaurant set up in just a few minutes. Our AI will help you create a stunning profile and homepage.
            </p>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">What we&apos;ll set up together:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Restaurant basic information</li>
                  <li>✓ AI-generated hero content and owner story</li>
                  <li>✓ Logo and gallery photos upload</li>
                  <li>✓ Homepage configuration</li>
                </ul>
              </div>
              <Link href={`/${locale}/dashboard/onboarding`}>
                <Button size="lg" className="w-full">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="mt-1 md:mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </header>

      {/* Dashboard Metrics - Mobile/Tablet Optimized */}
      <div className="block lg:hidden">
        <MobileStatsCards metrics={metrics}  isLoading={isLoading} />
      </div>
      
      {/* Dashboard Metrics - Desktop */}
      <div className="hidden lg:grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      
      {/* Charts and Reports */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SalesOverTimeChart data={salesData} isLoading={isLoading} />
        <PopularItemsList items={popularItems} isLoading={isLoading} />
      </div>

      {/* Low Stock Alerts Section */}
      {lowStockAlertsEnabled && (
        <div className="mt-8">
          <LowStockAlerts items={lowStockItems} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
