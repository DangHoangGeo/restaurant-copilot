'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Package, TrendingDown, AlertCircle, Minus } from 'lucide-react';

export interface LowStockItem {
  id: string;
  name: string;
  stock_level: number;
  threshold: number;
  category: string;
  severity: 'critical' | 'warning' | 'low';
  price?: number;
}

interface LowStockAlertsProps {
  items: LowStockItem[];
  isLoading: boolean;
  onRefresh?: () => void;
  currency?: string;
}

export function LowStockAlerts({ 
  items, 
  isLoading 
}: LowStockAlertsProps) {
  const t = useTranslations('owner.dashboard.low_stock');

  const getSeverityColor = (severity: 'critical' | 'warning' | 'low') => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-orange-500';
      case 'low':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'low') => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <TrendingDown className="h-4 w-4" />;
      case 'low':
        return <Minus className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('no_alerts')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t('all_items_stocked')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(item.severity)}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                        {item.name}
                      </p>
                      <Badge 
                        variant={item.severity === 'critical' ? 'destructive' : 
                                item.severity === 'warning' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {getSeverityIcon(item.severity)}
                        <span className="ml-1">{t(`severity.${item.severity}`)}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.category}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {t('stock_level')}: {item.stock_level}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('threshold')}: {item.threshold}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
