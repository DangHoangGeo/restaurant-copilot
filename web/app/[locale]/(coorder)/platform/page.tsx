// Platform Admin Overview Page

import { useTranslations } from 'next-intl';
import OverviewMetrics from '@/components/platform/overview-metrics';
import OverviewTrends from '@/components/platform/overview-trends';
import PeriodSelector from '@/components/platform/period-selector';

export default function PlatformOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Platform Overview
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor platform health and key metrics
          </p>
        </div>
        <PeriodSelector />
      </div>

      {/* Metrics Cards */}
      <OverviewMetrics />

      {/* Trends Chart */}
      <OverviewTrends />
    </div>
  );
}
