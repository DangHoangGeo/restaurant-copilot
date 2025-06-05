'use client';

import { StatCard } from '@/components/features/admin/dashboard/StatCard';
import { QuickActions } from '@/components/features/admin/dashboard/QuickActions';
import { RecentOrdersTable, RecentOrder } from '@/components/features/admin/dashboard/RecentOrdersTable';
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle, FileText, BarChart2 } from 'lucide-react';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { Card, CardContent } from '@/components/ui/card';
import { ComingSoon } from '@/components/common/coming-soon';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';

// Define a type for the initial data passed from the server component
export interface DashboardData {
  todaySales: number;
  activeOrdersCount: number;
  topSellerToday: { name: string; metricValue: string | number; } | null;
  lowStockItemsCount: number;
}

interface DashboardClientContentProps {
  initialData: DashboardData | null;
  recentOrders: RecentOrder[];
  isLoading: boolean;
  error?: string | null;
}

export function DashboardClientContent({ initialData, recentOrders, isLoading, error }: DashboardClientContentProps) {
  const t = useTranslations('AdminDashboard');
  const tCommon = useTranslations('Common');

  // Use FEATURE_FLAGS directly
  const lowStockAlertsEnabled = FEATURE_FLAGS.lowStockAlerts;

  if (error) {
    return <div className="text-destructive p-4 border border-destructive bg-destructive/10 rounded-md">{error}</div>;
  }

  const topSellerName = initialData?.topSellerToday?.name ?? t('cards.top_seller_unavailable');
  const topSellerMetric = initialData?.topSellerToday?.metricValue ?? '';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          titleKey="cards.todays_sales"
          value={initialData ? formatCurrency(initialData.todaySales, 'JPY') : 'N/A'}
          icon={DollarSign}
          // trend="+5.2% vs yesterday" // Example, fetch or calculate if needed
          // trendDirection="up"
          colorClass="text-blue-600 dark:text-blue-400"
          bgColorClass="bg-blue-100 dark:bg-blue-900/30"
          isLoading={isLoading}
        />
        <StatCard
          titleKey="cards.active_orders"
          value={initialData ? initialData.activeOrdersCount : 'N/A'}
          icon={ShoppingCart}
          // trend="-2 vs last hour"
          // trendDirection="down"
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
            value={initialData ? initialData.lowStockItemsCount : 'N/A'}
            icon={AlertTriangle}
            trend={initialData && initialData.lowStockItemsCount > 0 ? t('cards.needs_attention') : t('cards.all_good')}
            colorClass="text-amber-600 dark:text-amber-400"
            bgColorClass="bg-amber-100 dark:bg-amber-900/30"
            isAlert={initialData ? initialData.lowStockItemsCount > 0 : false}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentOrdersTable orders={recentOrders || []} isLoading={isLoading} />
        <QuickActions />
      </div>
      
      {/* Placeholder for more charts/reports */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <BarChart2 className="mx-auto h-12 w-12 mb-2" />
            {t('charts.sales_over_time_placeholder')}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-2" />
             {t('charts.popular_items_report_placeholder')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
