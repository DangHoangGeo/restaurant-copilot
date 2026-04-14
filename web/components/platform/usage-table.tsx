'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import type { UsageSnapshot } from '@/shared/types/platform';

export default function UsageTable() {
  const t = useTranslations('platform.usage');
  const tc = useTranslations('platform.common');

  const [snapshots, setSnapshots] = useState<UsageSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantFilter, setRestaurantFilter] = useState('all');

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const errorLabel = tc('error');

  const fetchUsage = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: '25' });
      if (restaurantFilter !== 'all') params.set('restaurant_id', restaurantFilter);

      const res = await fetch(`/api/v1/platform/usage?${params}`, {
        signal: controller.signal
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error || errorLabel);
      }

      if (requestId !== requestIdRef.current) return;

      setSnapshots(body.data || []);
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      console.error('Error fetching usage:', err);
      setError(err instanceof Error ? err.message : errorLabel);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [restaurantFilter, errorLabel]);

  useEffect(() => {
    fetchUsage();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchUsage]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filters.all_restaurants')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.all_restaurants')}</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={fetchUsage} title={tc('refresh')}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">{t('loading')}</div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 space-y-3">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchUsage}>
            {tc('refresh')}
          </Button>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{t('empty')}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>{t('metrics.orders')}</TableHead>
              <TableHead>{t('metrics.ai_calls')}</TableHead>
              <TableHead>{t('metrics.api_calls')}</TableHead>
              <TableHead>{t('metrics.storage')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.restaurant_name ?? s.restaurant_id}</TableCell>
                <TableCell>{new Date(s.snapshot_date).toLocaleDateString()}</TableCell>
                <TableCell>{s.total_orders.toLocaleString()}</TableCell>
                <TableCell>{s.ai_calls_count.toLocaleString()}</TableCell>
                <TableCell>{s.api_calls_count.toLocaleString()}</TableCell>
                <TableCell>{(s.storage_used_mb / 1024).toFixed(2)} GB</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
