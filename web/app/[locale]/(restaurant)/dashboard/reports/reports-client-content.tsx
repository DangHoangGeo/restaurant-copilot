'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportsSkeleton } from '@/components/ui/skeletons';
import { AlertTriangle, DollarSign, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

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

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useTranslations('AdminReports');
  
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
  const t = useTranslations('AdminReports');
  const [metrics, setMetrics] = useState<ReportsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [metricsRes, ordersRes] = await Promise.all([
        fetch('/api/v1/owner/reports', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/v1/owner/reports/recent-orders', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (!metricsRes.ok || !ordersRes.ok) {
        throw new Error('Failed to load reports data');
      }

      const [metricsData, ordersData] = await Promise.all([
        metricsRes.json(),
        ordersRes.json()
      ]);

      setMetrics(metricsData);
      setRecentOrders(ordersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.fetch_failed'));
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 minutes for live data
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [loadData]);

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

      {/* Recent Orders */}
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
    </div>
  );
}
