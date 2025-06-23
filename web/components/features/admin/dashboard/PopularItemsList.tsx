
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { TrendingUp, Medal, Award, Trophy } from 'lucide-react';

// Define the interface for a single popular item
export interface PopularItem {
  menu_item_id: string;
  name: string;
  total_sold: number;
}

// Define the props for the PopularItemsList component
interface PopularItemsListProps {
  items: PopularItem[];
  isLoading: boolean;
}

export function PopularItemsList({ items, isLoading }: PopularItemsListProps) {
  const t = useTranslations('owner.dashboard.reports');

  // Get rank icon for top 3 items
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 1:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 2:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  // Get rank background color
  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 1:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      case 2:
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-emerald-500" />
          {t('popular_items_title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div 
                key={item.menu_item_id} 
                className={`flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 hover:shadow-sm ${getRankBg(index)}`}
              >
                {/* Rank indicator */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                  {getRankIcon(index) || (
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </span>
                  )}
                </div>
                
                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('sold_count', { count: item.total_sold })}
                  </p>
                </div>
                
                {/* Sales badge */}
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                    {item.total_sold}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('no_popular_items')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('complete_orders_to_see_popular_items')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
