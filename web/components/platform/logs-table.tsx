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
import { Search, RefreshCw, Download } from 'lucide-react';
import type { PlatformLog } from '@/shared/types/platform';

const LEVEL_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  info: 'default',
  warn: 'secondary',
  error: 'destructive',
  debug: 'outline'
};

export default function LogsTable() {
  const t = useTranslations('platform.logs');
  const tc = useTranslations('platform.common');

  const [logs, setLogs] = useState<PlatformLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const [levelFilter, setLevelFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const errorLabel = tc('error');

  const fetchLogs = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), limit: '25' });
      const normalizedSearch = debouncedSearch.trim();
      if (levelFilter !== 'all') params.set('level', levelFilter);
      if (normalizedSearch) params.set('search', normalizedSearch);

      const res = await fetch(`/api/v1/platform/logs?${params}`, {
        signal: controller.signal
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error || errorLabel);
      }

      if (requestId !== requestIdRef.current) return;

      setLogs(body.data || []);
      setTotalPages(body.pagination?.total_pages || 1);
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      console.error('Error fetching logs:', err);
      setError(err instanceof Error ? err.message : errorLabel);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [page, levelFilter, debouncedSearch, errorLabel]);

  useEffect(() => {
    fetchLogs();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchLogs]);

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
          value={levelFilter}
          onValueChange={(v) => {
            setLevelFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('filters.all_levels')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.all_levels')}</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          {t('actions.export')}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchLogs}
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
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            {tc('refresh')}
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{t('empty')}</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.timestamp')}</TableHead>
                <TableHead>{t('table.level')}</TableHead>
                <TableHead>{t('table.restaurant')}</TableHead>
                <TableHead>{t('table.endpoint')}</TableHead>
                <TableHead>{t('table.message')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={LEVEL_VARIANTS[log.level] ?? 'outline'}>
                      {log.level.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.restaurant_name ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {log.method && log.endpoint ? (
                      <span>
                        <span className="text-blue-600">{log.method}</span> {log.endpoint}
                        {log.status_code && (
                          <span
                            className={`ml-1 ${
                              log.status_code >= 400 ? 'text-red-500' : 'text-green-600'
                            }`}
                          >
                            {log.status_code}
                          </span>
                        )}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{log.message}</TableCell>
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
