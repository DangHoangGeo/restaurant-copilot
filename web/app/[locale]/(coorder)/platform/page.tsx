import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import PeriodSelector from '@/components/platform/period-selector';
import OverviewMetrics from '@/components/platform/overview-metrics';
import OverviewTrends from '@/components/platform/overview-trends';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'platform.overview' });
  return { title: t('title') };
}

export default async function PlatformOverviewPage() {
  const t = await getTranslations('platform.overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
        <Suspense>
          <PeriodSelector />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        }
      >
        <OverviewMetrics />
      </Suspense>

      <Suspense fallback={<div className="h-80 bg-gray-100 rounded-lg animate-pulse" />}>
        <OverviewTrends />
      </Suspense>
    </div>
  );
}
