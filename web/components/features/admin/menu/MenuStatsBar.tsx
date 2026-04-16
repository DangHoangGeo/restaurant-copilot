'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MenuIcon, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Category } from '@/shared/types/menu';
import { getLocalizedText } from '@/lib/utils';

interface MenuStatsBarProps {
  categories: Category[];
  isLoading?: boolean;
  locale: string;
}

/**
 * ⚡ Bolt: Optimized MenuStatsBar component
 * - Memoized component to prevent re-renders when parent's search/filter state changes
 * - Memoized statistics calculations to avoid redundant O(N) processing
 * - Fixed state mutation bug by copying categories array before sorting
 */
export const MenuStatsBar = memo(function MenuStatsBar({
  categories,
  isLoading = false,
  locale
}: MenuStatsBarProps) {
  const t = useTranslations('owner.menu.stats');

  // Calculate stats efficiently in a single pass
  const { totalItems, availableItems, lowStockItems, topCategories } = useMemo(() => {
    let total = 0;
    let available = 0;
    let lowStock = 0;

    categories.forEach(cat => {
      total += cat.menu_items.length;
      cat.menu_items.forEach(item => {
        if (item.available) available++;
        // Ensure we only count items where stock_level is explicitly set as a number
        if (typeof item.stock_level === 'number' && item.stock_level < 10) {
          lowStock++;
        }
      });
    });

    // Create a copy to avoid mutating the original categories prop
    const top = [...categories]
      .sort((a, b) => b.menu_items.length - a.menu_items.length)
      .slice(0, 3);

    return {
      totalItems: total,
      availableItems: available,
      lowStockItems: lowStock,
      topCategories: top
    };
  }, [categories]);

  const unavailableItems = totalItems - availableItems;

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Items */}
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <MenuIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalItems}</p>
            </div>
          </div>

          {/* Available Items */}
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('available')}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{availableItems}</p>
            </div>
          </div>

          {/* Unavailable Items */}
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('unavailable')}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{unavailableItems}</p>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('low_stock')}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{lowStockItems}</p>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('top_categories')}</p>
            <div className="flex flex-wrap gap-2">
              {topCategories.map((category, index) => (
                <Badge 
                  key={category.id} 
                  variant={index === 0 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {getLocalizedText({
    name_en: category.name_en,
    name_ja: category.name_ja || undefined,
    name_vi: category.name_vi || undefined
  }, locale)} ({category.menu_items.length})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
