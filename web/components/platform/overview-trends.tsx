'use client';

// Overview Trends Chart Component
// Note: Install recharts if not already: npm install recharts

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DashboardOverview } from '@/shared/types/platform';

// Placeholder for recharts - install with: npm install recharts
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to load overview trends');
  }
  return response.json();
};

export default function OverviewTrends() {
  const t = useTranslations('platform.overview');
  const tc = useTranslations('platform.common');
  const searchParams = useSearchParams();
  const period = useMemo(() => {
    const value = searchParams.get('period');
    return value === 'today' || value === '7days' || value === '30days' || value === '90days'
      ? value
      : '30days';
  }, [searchParams]);

  const { data: overview, isLoading, error } = useSWR<DashboardOverview>(
    `/api/v1/platform/overview?period=${period}`,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('trends.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">{tc('loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !overview || !overview.trends.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('trends.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">{error ? tc('error') : t('trends.empty')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('trends.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signups">
          <TabsList>
            <TabsTrigger value="signups">{t('trends.signups')}</TabsTrigger>
            <TabsTrigger value="orders">{t('trends.orders')}</TabsTrigger>
            <TabsTrigger value="revenue">{t('trends.revenue')}</TabsTrigger>
          </TabsList>

          <TabsContent value="signups">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-center">
                <p className="text-gray-500 mb-2">{t('trends.signups')}</p>
                <p className="text-sm text-gray-400">Install recharts to visualize signup trends</p>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded mt-2 inline-block">
                  npm install recharts
                </code>
              </div>
              {/*
                Uncomment after installing recharts:
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overview.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="signups" stroke="#3b82f6" />
                  </LineChart>
                </ResponsiveContainer>
              */}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-center">
                <p className="text-gray-500 mb-2">{t('trends.orders')}</p>
                <p className="text-sm text-gray-400">Install recharts to visualize order trends</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-center">
                <p className="text-gray-500 mb-2">{t('trends.revenue')}</p>
                <p className="text-sm text-gray-400">Install recharts to visualize revenue trends</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary stats below chart */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-sm text-gray-500">{t('trends.signups')}</p>
            <p className="text-2xl font-bold">{overview.trends.reduce((sum, t) => sum + t.signups, 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('trends.orders')}</p>
            <p className="text-2xl font-bold">{overview.trends.reduce((sum, t) => sum + t.orders, 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('trends.revenue')}</p>
            <p className="text-2xl font-bold">${overview.trends.reduce((sum, t) => sum + t.revenue, 0).toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
