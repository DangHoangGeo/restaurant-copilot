'use client';

// Period Selector Component

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('platform.overview.period_selector');
  const currentPeriod = useMemo(() => {
    const period = searchParams.get('period');
    return period === 'today' || period === '7days' || period === '30days' || period === '90days'
      ? period
      : '30days';
  }, [searchParams]);

  const handlePeriodChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={currentPeriod} onValueChange={handlePeriodChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today">{t('today')}</SelectItem>
        <SelectItem value="7days">{t('7days')}</SelectItem>
        <SelectItem value="30days">{t('30days')}</SelectItem>
        <SelectItem value="90days">{t('90days')}</SelectItem>
      </SelectContent>
    </Select>
  );
}
