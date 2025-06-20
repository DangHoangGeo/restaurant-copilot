'use client';

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

export function MenuStatsBar({ categories, isLoading = false, locale }: MenuStatsBarProps) {
  const t = useTranslations('owner.menu.stats');

  // Calculate stats
  const totalItems = categories.reduce((acc, cat) => acc + cat.menu_items.length, 0);
  const availableItems = categories.reduce((acc, cat) => 
    acc + cat.menu_items.filter(item => item.available).length, 0
  );
  const unavailableItems = totalItems - availableItems;
  const lowStockItems = categories.reduce((acc, cat) => 
    acc + cat.menu_items.filter(item => 
      item.stock_level !== undefined && item.stock_level < 10
    ).length, 0
  );
  const topCategories = categories
    .sort((a, b) => b.menu_items.length - a.menu_items.length)
    .slice(0, 3);

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
              <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{availableItems}</p>
            </div>
          </div>

          {/* Unavailable Items */}
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unavailable</p>
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
}
