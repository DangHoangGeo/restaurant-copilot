'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Define the interface for a single data point
export interface SalesDataPoint {
  date: string;
  sales: number;
  orders_count: number;
}

// Define the props for the SalesOverTimeChart component
interface SalesOverTimeChartProps {
  data: SalesDataPoint[];
  isLoading: boolean;
  currency?: string;
}

export function SalesOverTimeChart({ data, isLoading, currency = 'JPY' }: SalesOverTimeChartProps) {
  const t = useTranslations('owner.dashboard.reports');

  // Calculate totals for the period
  const totalSales = data.reduce((sum, point) => sum + point.sales, 0);
  const totalOrders = data.reduce((sum, point) => sum + point.orders_count, 0);
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get max sales for scaling the bars
  const maxSales = Math.max(...data.map(d => d.sales), 1);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-blue-500" />
            {t('sales_chart_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Loading skeleton */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
              </div>
            </div>
            <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-5 w-5 text-blue-500" />
          {t('sales_chart_title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('total_sales_7days')}</p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(totalSales, currency)}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('total_orders_7days')}</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {totalOrders}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('avg_order_value')}</p>
              <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {formatCurrency(averageOrderValue, currency)}
              </p>
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('daily_sales_trend')}
            </h4>
            <div className="space-y-2">
              {data.map((point, index) => (
                <div key={point.date + index} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                    {formatDate(point.date)}
                  </div>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.max((point.sales / maxSales) * 100, 2)}%`
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {formatCurrency(point.sales, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right flex-shrink-0">
                    {point.orders_count} {t('orders_short')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Analysis */}
          {data.length >= 2 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('trend_analysis')}</span>
                <div className="flex items-center gap-1">
                  {data[data.length - 1].sales > data[data.length - 2].sales ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {t('trending_up')}
                      </span>
                    </>
                  ) : data[data.length - 1].sales < data[data.length - 2].sales ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {t('trending_down')}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('stable')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
