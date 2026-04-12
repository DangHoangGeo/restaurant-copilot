'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportsSkeleton } from '@/components/ui/skeletons';
import { AlertTriangle, DollarSign, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import { DateRangeSelector, DateRange } from '@/components/features/admin/reports/date-range-selector';
import { ItemsReportTab } from '@/components/features/admin/reports/items-report-tab';
import { ReportExportService } from '@/lib/export-utils';
import { subDays } from 'date-fns';

// Dynamic import for heavy chart components to reduce initial bundle size
const AdvancedAnalyticsCharts = dynamic(
  () => import('@/components/features/admin/reports/advanced-analytics-charts').then(mod => ({ default: mod.AdvancedAnalyticsCharts })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

interface ReportsData {
  todaySales: number;
  activeOrdersCount: number;
  topSellerToday: { name: string; metricValue: string } | null;
  lowStockItemsCount: number;
}

interface RecentOrder {
  id: string;
  table: string;
  amount: number;
  status: string;
  time: string;
}

interface SalesDataPoint {
  date: string;
  sales: number;
  orders: number;
  averageOrderValue: number;
}

interface CategoryDataPoint {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface ItemDataPoint {
  id: string;
  name: string;
  category: string;
  totalSold: number;
  revenue: number;
  avgRating: number;
  reviewCount: number;
  costPerItem: number;
  profitMargin: number | null;
  popularityRank: number;
  lastOrderDate: string;
  imageUrl?: string;
}

interface TrendDataPoint {
  period: string;
  sales: number;
  growth: number;
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useTranslations('owner.reports');
  
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ReportsClientContent() {
  const t = useTranslations('owner.reports');
  const [metrics, setMetrics] = useState<ReportsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryDataPoint[]>([]);
  const [itemsData, setItemsData] = useState<ItemDataPoint[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [selectedRange, setSelectedRange] = useState<DateRange>({
    from: subDays(new Date(), 6),
    to: new Date()
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fromParam = selectedRange.from.toISOString().split('T')[0];
      const toParam = selectedRange.to.toISOString().split('T')[0];
      
      const [metricsRes, ordersRes, salesRes, categoryRes, itemsRes] = await Promise.all([
        fetch('/api/v1/owner/reports', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/v1/owner/reports/recent-orders', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`/api/v1/owner/reports/advanced-sales?from=${fromParam}&to=${toParam}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`/api/v1/owner/reports/category-breakdown?from=${fromParam}&to=${toParam}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`/api/v1/owner/reports/items-detail?from=${fromParam}&to=${toParam}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (!metricsRes.ok || !ordersRes.ok || !salesRes.ok || !categoryRes.ok || !itemsRes.ok) {
        throw new Error('Failed to load reports data');
      }

      const [metricsData, ordersData, salesDataRes, categoryDataRes, itemsDataRes] = await Promise.all([
        metricsRes.json(),
        ordersRes.json(),
        salesRes.json(),
        categoryRes.json(),
        itemsRes.json()
      ]);

      setMetrics(metricsData);
      setRecentOrders(ordersData);
      setSalesData(salesDataRes);
      setCategoryData(categoryDataRes);
      setItemsData(itemsDataRes);
      
      // Generate trend data from sales data
      const trend = salesDataRes.map((item: SalesDataPoint, index: number) => ({
        period: item.date,
        sales: item.sales,
        growth: index > 0 ? (item.sales - salesDataRes[index - 1].sales) / salesDataRes[index - 1].sales : 0
      }));
      setTrendData(trend);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.fetch_failed'));
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [t, selectedRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateRangeChange = (range: DateRange) => {
    setSelectedRange(range);
  };

  const handleExport = async (format: 'csv' | 'pdf', reportType: 'sales' | 'items' | 'category') => {
    setIsExporting(true);
    try {
      switch (reportType) {
        case 'sales':
          await ReportExportService.exportSalesReport(salesData, format, selectedRange);
          break;
        case 'items':
          await ReportExportService.exportItemsReport(itemsData, format, selectedRange);
          break;
        case 'category':
          await ReportExportService.exportCategoryReport(categoryData, format, selectedRange);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isInitialLoading) return <ReportsSkeleton />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('description')}
        </p>
      </header>

      {/* Date Range Selector */}
      <DateRangeSelector
        selectedRange={selectedRange}
        onRangeChange={handleDateRangeChange}
        onExport={(format) => handleExport(format, 'sales')}
        isExporting={isExporting}
      />

      {/* Tabs for different report views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="items">Items Report</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('metrics.todaySales')}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? formatCurrency(metrics.todaySales) : '¥0'}
                </div>
                {isLoading && <div className="text-xs text-muted-foreground">Updating...</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('metrics.activeOrders')}
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.activeOrdersCount || 0}
                </div>
                {isLoading && <div className="text-xs text-muted-foreground">Updating...</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('metrics.topSeller')}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.topSellerToday?.name || t('metrics.noData')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.topSellerToday?.metricValue || ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('metrics.lowStock')}
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.lowStockItemsCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('metrics.itemsNeedAttention')}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <AdvancedAnalyticsCharts
            salesData={salesData}
            categoryData={categoryData}
            itemsData={itemsData}
            trendData={trendData}
            isLoading={isLoading}
            dateRange={`${selectedRange.from.toLocaleDateString()} - ${selectedRange.to.toLocaleDateString()}`}
            currency="JPY"
          />
        </TabsContent>

        {/* Items Report Tab */}
        <TabsContent value="items" className="space-y-6">
          <ItemsReportTab
            data={itemsData}
            isLoading={isLoading}
            onExport={(format) => handleExport(format, 'items')}
            isExporting={isExporting}
            currency="JPY"
          />
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('recentOrders.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {t('recentOrders.noOrders')}
                </p>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{t('recentOrders.table')} {order.table}</p>
                        <p className="text-sm text-gray-500">{order.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(order.amount)}</p>
                        <p className="text-sm text-gray-500 capitalize">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
