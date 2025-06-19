"use client";

import { Search, X, Grid, List } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ViewMode = 'grid' | 'list'

interface TableSearchFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export function TableSearchFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  viewMode,
  setViewMode
}: TableSearchFiltersProps) {
  const t = useTranslations("owner.tables");

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all';

  return (
    <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder={t('filter_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_status')}</SelectItem>
              <SelectItem value="available">{t('status_options.available')}</SelectItem>
              <SelectItem value="occupied">{t('status_options.occupied')}</SelectItem>
              <SelectItem value="reserved">{t('status_options.reserved')}</SelectItem>
            </SelectContent>
          </Select>
          
          {/* View Mode Toggle */}
          <div className="flex border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none border-none"
              title={t('view_mode.grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none border-none border-l border-slate-200 dark:border-slate-700"
              title={t('view_mode.list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="px-2 h-10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              title={t('clear_filters')}
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">{t('clear_filters')}</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
