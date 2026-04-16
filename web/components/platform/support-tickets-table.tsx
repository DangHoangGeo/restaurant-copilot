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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, RefreshCw } from 'lucide-react';
import type { SupportTicket } from '@/shared/types/platform';

const PRIORITY_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive'
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'destructive',
  investigating: 'default',
  waiting_customer: 'secondary',
  resolved: 'outline',
  closed: 'outline'
};

export default function SupportTicketsTable() {
  const t = useTranslations('platform.support');
  const tc = useTranslations('platform.common');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const [statusTab, setStatusTab] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const errorLabel = tc('error');

  const fetchTickets = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const normalizedSearch = debouncedSearch.trim();
      if (statusTab !== 'all') params.set('status', statusTab);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (normalizedSearch) params.set('search', normalizedSearch);

      const res = await fetch(`/api/v1/platform/support-tickets?${params}`, {
        signal: controller.signal
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error || errorLabel);
      }

      if (requestId !== requestIdRef.current) return;

      setTickets(body.data || []);
      setTotalPages(body.pagination?.total_pages || 1);
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      console.error('Error fetching support tickets:', err);
      setError(err instanceof Error ? err.message : errorLabel);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [page, statusTab, priorityFilter, debouncedSearch, errorLabel]);

  useEffect(() => {
    fetchTickets();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchTickets]);

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="px-4 pt-4">
        <Tabs
          value={statusTab}
          onValueChange={(v) => {
            setStatusTab(v);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
            <TabsTrigger value="new">{t('tabs.new')}</TabsTrigger>
            <TabsTrigger value="investigating">{t('tabs.investigating')}</TabsTrigger>
            <TabsTrigger value="waiting_customer">{t('tabs.waiting')}</TabsTrigger>
            <TabsTrigger value="resolved">{t('tabs.resolved')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-4 pb-4 border-b border-gray-200">
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
          value={priorityFilter}
          onValueChange={(v) => {
            setPriorityFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('filters.all_priorities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.all_priorities')}</SelectItem>
            <SelectItem value="low">{t('priority.low')}</SelectItem>
            <SelectItem value="medium">{t('priority.medium')}</SelectItem>
            <SelectItem value="high">{t('priority.high')}</SelectItem>
            <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchTickets}
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
          <Button variant="outline" size="sm" onClick={fetchTickets}>
            {tc('refresh')}
          </Button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{t('empty')}</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.ticket_number')}</TableHead>
                <TableHead>{t('table.subject')}</TableHead>
                <TableHead>{t('table.restaurant')}</TableHead>
                <TableHead>{t('table.priority')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.created_at')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-sm">#{ticket.ticket_number}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{ticket.subject}</TableCell>
                  <TableCell className="text-sm">{ticket.restaurant_name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANTS[ticket.priority] ?? 'outline'}>
                      {t(`priority.${ticket.priority}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[ticket.status] ?? 'outline'}>
                      {t(`status.${ticket.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline">
                      {t('actions.reply')}
                    </Button>
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
