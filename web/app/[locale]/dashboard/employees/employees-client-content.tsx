'use client';

import { useTranslations } from 'next-intl';
import { ComingSoon } from '@/components/common/coming-soon';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'; // Added for structure

export function EmployeesClientContent() {
  const t = useTranslations('AdminNav'); // Using AdminNav for the title as per previous pattern

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {t('admin_employees_title')}
        </h2>
      </div>
      <Card>
        <CardContent className="pt-6"> {/* Added pt-6 for padding */}
          <ComingSoon featureName="admin_sidebar_employees_schedules" />
        </CardContent>
      </Card>
    </div>
  );
}
