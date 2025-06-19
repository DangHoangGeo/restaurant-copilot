"use client";

import { Search, QrCode } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface EmptyStatesProps {
  hasData: boolean
  hasFilteredResults: boolean
  searchQuery: string
  statusFilter: string
  onAddTable: () => void
  onClearFilters: () => void
}

export function EmptyStates({
  hasData,
  hasFilteredResults,
  onAddTable,
  onClearFilters
}: EmptyStatesProps) {
  const t = useTranslations("owner.tables");

  // No data at all
  if (!hasData) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
        <QrCode className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
          {t('empty_state.title')}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('empty_state.description')}
        </p>
        <div className="mt-6">
          <Button onClick={onAddTable}>
            {t('empty_state.add_table_button')}
          </Button>
        </div>
      </div>
    );
  }

  // Has data but no filtered results
  if (!hasFilteredResults) {
    return (
      <div className="text-center py-12 border border-slate-200 dark:border-slate-700 rounded-lg">
        <Search className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          {t('search_results.no_tables_found')}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('search_results.adjust_search')}
        </p>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
          >
            {t('clear_filters_button')}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
