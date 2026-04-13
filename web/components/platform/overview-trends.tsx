'use client';

// Overview Trends Chart Component
// Note: Install recharts if not already: npm install recharts

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DashboardOverview } from '@/shared/types/platform';

// Placeholder for recharts - install with: npm install recharts
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function OverviewTrends() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '30days';

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/platform/overview?period=${period}`);
      const data = await response.json();
      setOverview(data);
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Loading trends...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!overview || !overview.trends.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No trend data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signups">
          <TabsList>
            <TabsTrigger value="signups">Signups</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="signups">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-center">
                <p className="text-gray-500 mb-2">Chart Placeholder</p>
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
                <p className="text-gray-500 mb-2">Chart Placeholder</p>
                <p className="text-sm text-gray-400">Install recharts to visualize order trends</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-center">
                <p className="text-gray-500 mb-2">Chart Placeholder</p>
                <p className="text-sm text-gray-400">Install recharts to visualize revenue trends</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary stats below chart */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-sm text-gray-500">Total Signups</p>
            <p className="text-2xl font-bold">{overview.trends.reduce((sum, t) => sum + t.signups, 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold">{overview.trends.reduce((sum, t) => sum + t.orders, 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold">${overview.trends.reduce((sum, t) => sum + t.revenue, 0).toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
