"use client";

import { Card } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';

interface MobileStatsCardsProps {
  metrics: {
    todaySales: number;
    activeOrdersCount: number;
    topSellerToday: { name: string; metricValue: string } | null;
    lowStockItemsCount: number;
  } | null;
  isLoading: boolean;
}

export function MobileStatsCards({ metrics, isLoading }: MobileStatsCardsProps) {
  const t = useTranslations("owner.dashboard.cards");
  const tCommon = useTranslations("common");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1 animate-pulse" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Today's Sales */}
      <Card className="p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate">
              {t('todays_sales')}
            </p>
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200 truncate">
              {metrics ? formatCurrency(metrics.todaySales, 'JPY') : '¥0'}
            </p>
          </div>
        </div>
      </Card>
      
      {/* Active Orders */}
      <Card className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 truncate">
              {t('active_orders')}
            </p>
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200">
              {metrics ? metrics.activeOrdersCount : 0}
            </p>
          </div>
        </div>
      </Card>
      
      {/* Top Seller */}
      <Card className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate">
              {t('top_seller_today')}
            </p>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200 truncate">
              {metrics?.topSellerToday?.name || tCommon('no_data')}
            </p>
            {metrics?.topSellerToday?.metricValue && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                {metrics.topSellerToday.metricValue}
              </p>
            )}
          </div>
        </div>
      </Card>
      
      {/* Low Stock Alerts */}
      <Card className={`p-3 ${
        metrics && metrics.lowStockItemsCount > 0 
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 border-2' 
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            metrics && metrics.lowStockItemsCount > 0 
              ? 'bg-amber-500' 
              : 'bg-slate-500'
          }`}>
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium truncate ${
              metrics && metrics.lowStockItemsCount > 0 
                ? 'text-amber-700 dark:text-amber-300' 
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {t('low_stock_alerts')}
            </p>
            <p className={`text-sm font-bold ${
              metrics && metrics.lowStockItemsCount > 0 
                ? 'text-amber-800 dark:text-amber-200' 
                : 'text-slate-800 dark:text-slate-slate-200'
            }`}>
              {metrics ? metrics.lowStockItemsCount : 0}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
