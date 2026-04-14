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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, RefreshCw } from 'lucide-react';
import type { RestaurantSummary } from '@/shared/types/platform';

export default function AccountsTable() {
  const t = useTranslations('platform.accounts');
  const tc = useTranslations('platform.common');

  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantSummary | null>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const errorLabel = tc('error');

  const fetchRestaurants = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const normalizedSearch = debouncedSearch.trim();
      if (normalizedSearch) params.set('search', normalizedSearch);

      const res = await fetch(`/api/v1/platform/restaurants?${params}`, {
        signal: controller.signal
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error || errorLabel);
      }

      if (requestId !== requestIdRef.current) return;

      setRestaurants(body.data || []);
      setTotalPages(body.pagination?.total_pages || 1);
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      console.error('Error fetching accounts:', err);
      setError(err instanceof Error ? err.message : errorLabel);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [page, debouncedSearch, errorLabel]);

  useEffect(() => {
    fetchRestaurants();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchRestaurants]);

  const handleSuspend = async () => {
    if (!selectedRestaurant || !suspendReason) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/platform/restaurants/${selectedRestaurant.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason })
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error || errorLabel);
      }

      setSuspendDialogOpen(false);
      setSuspendReason('');
      setSelectedRestaurant(null);
      fetchRestaurants();
    } catch (err) {
      console.error('Error suspending restaurant:', err);
      setError(err instanceof Error ? err.message : errorLabel);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={tc('search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={fetchRestaurants} title={tc('refresh')}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">{t('loading')}</div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 space-y-3">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchRestaurants}>
            {tc('refresh')}
          </Button>
        </div>
      ) : restaurants.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{t('empty')}</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.restaurant')}</TableHead>
                <TableHead>{t('table.staff_count')}</TableHead>
                <TableHead>{t('table.last_active')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.subdomain}</p>
                    </div>
                  </TableCell>
                  <TableCell>{r.total_staff}</TableCell>
                  <TableCell>
                    {r.last_order_at ? new Date(r.last_order_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    {r.suspended_at ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : r.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline">
                      {t('actions.view_details')}
                    </Button>
                    {r.suspended_at ? (
                      <Button size="sm" variant="outline">
                        {t('actions.unsuspend')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRestaurant(r);
                          setSuspendDialogOpen(true);
                        }}
                      >
                        {t('actions.suspend')}
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

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {selectedRestaurant?.name}</DialogTitle>
            <DialogDescription>Provide a reason for suspending this account.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="suspend-reason">Reason</Label>
            <Textarea
              id="suspend-reason"
              placeholder="Enter suspension reason..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={submitting || !suspendReason}>
              {submitting ? 'Suspending...' : t('actions.suspend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
