'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface StatCardProps {
  titleKey: string; // i18n key
  value: string | number;
  icon: LucideIcon;
  trend?: string; // i18n key for trend, or pre-formatted string
  trendDirection?: 'up' | 'down' | 'neutral';
  colorClass?: string; // e.g., 'text-blue-600 dark:text-blue-400'
  bgColorClass?: string; // e.g., 'bg-blue-100 dark:bg-blue-900/30'
  isAlert?: boolean;
  isLoading?: boolean;
}

export function StatCard({
  titleKey,
  value,
  icon: IconComponent,
  trend,
  trendDirection = 'neutral',
  colorClass = 'text-primary',
  bgColorClass = 'bg-primary/10',
  isAlert = false,
  isLoading = false,
}: StatCardProps) {
  const t = useTranslations('AdminDashboard.cards'); // Specific namespace for card titles
  const tCommon = useTranslations('Common');

  if (isLoading) {
    return (
      <Card className={cn(isAlert && 'border-2 border-destructive dark:border-destructive')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t(titleKey)}</CardTitle>
          <div className={cn("p-2 rounded-md", bgColorClass)}>
            <IconComponent className={cn("h-5 w-5 animate-pulse", colorClass)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold animate-pulse bg-muted h-9 w-24 rounded-md"></div>
          {trend && <div className="text-xs text-muted-foreground mt-2 animate-pulse bg-muted h-4 w-32 rounded-md"></div>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(isAlert && 'border-2 border-destructive dark:border-destructive')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t(titleKey)}</CardTitle>
        <div className={cn("p-2 rounded-md", bgColorClass)}>
          <IconComponent className={cn("h-5 w-5", colorClass)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {trend && (
          <p
            className={cn(
              "text-xs text-muted-foreground mt-2",
              trendDirection === 'up' && 'text-green-600 dark:text-green-400',
              trendDirection === 'down' && 'text-red-600 dark:text-red-400'
            )}
          >
            {/* Assuming trend is a pre-formatted string or an i18n key */}
            {trend.startsWith('+') || trend.startsWith('-') ? trend : tCommon(trend || 'trend.neutral')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
