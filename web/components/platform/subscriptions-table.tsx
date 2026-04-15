'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from 'use-debounce';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Search, RefreshCw } from 'lucide-react';
import type { TenantSubscription } from '@/shared/types/platform';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  trial: 'secondary',
  past_due: 'destructive',
  canceled: 'outline',
  paused: 'outline',
  expired: 'outline'
};

export default function SubscriptionsTable() {
  const t = useTranslations('platform.subscriptions');
  const tc = useTranslations('platform.common');

  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const errorLabel = tc('error');

  const fetchSubscriptions = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const normalizedSearch = debouncedSearch.trim();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (normalizedSearch) params.set('search', normalizedSearch);

      const res = await fetch(`/api/v1/platform/subscriptions?${params}`, {
        signal: controller.signal
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error || errorLabel);
      }

      if (requestId !== requestIdRef.current) return;

      setSubscriptions(body.data || []);
      setTotalPages(body.pagination?.total_pages || 1);
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      console.error('Error fetching subscriptions:', err);
      setError(err instanceof Error ? err.message : errorLabel);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [page, statusFilter, debouncedSearch, errorLabel]);

  useEffect(() => {
    fetchSubscriptions();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchSubscriptions]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('filters.search_placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('filters.all_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.all_status')}</SelectItem>
            <SelectItem value="trial">{t('status.trial')}</SelectItem>
            <SelectItem value="active">{t('status.active')}</SelectItem>
            <SelectItem value="past_due">{t('status.past_due')}</SelectItem>
            <SelectItem value="canceled">{t('status.canceled')}</SelectItem>
            <SelectItem value="paused">{t('status.paused')}</SelectItem>
            <SelectItem value="expired">{t('status.expired')}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchSubscriptions}
          title={tc('refresh')}
          aria-label={tc('refresh')}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">{t('loading')}</div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 space-y-3">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSubscriptions}>
            {tc('refresh')}
          </Button>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{t('empty')}</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.restaurant')}</TableHead>
                <TableHead>{t('table.plan')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.billing_cycle')}</TableHead>
                <TableHead>{t('table.current_period_end')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.restaurant_name ?? sub.restaurant_id}</TableCell>
                  <TableCell>{sub.plan_name ?? sub.plan_id}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[sub.status] ?? 'outline'}>
                      {t(`status.${sub.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                  <TableCell>{new Date(sub.current_period_end).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline">
                      {t('actions.view_details')}
                    </Button>
                    {sub.status === 'trial' && (
                      <Button size="sm" variant="outline">
                        {t('actions.extend_trial')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
