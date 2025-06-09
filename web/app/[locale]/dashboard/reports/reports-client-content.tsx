'use client';

import { useTranslations } from 'next-intl';
import { ComingSoon } from '@/components/common/coming-soon';
import { Card, CardContent } from '@/components/ui/card';

export function ReportsClientContent() {
  const t = useTranslations('AdminNav');

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {t('admin_reports_title')}
        </h2>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ComingSoon featureName="admin_sidebar_reports_analytics" />
        </CardContent>
      </Card>
    </div>
  );
}
