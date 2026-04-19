"use client";

import { Users, Filter, Search, PlusCircle, Layers } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface TableHeaderProps {
  totalTables: number
  filteredCount: number
  searchQuery: string
  statusFilter: string
  onAddTable: () => void
  onBulkAdd?: () => void
}

export function TableHeader({
  totalTables,
  filteredCount,
  searchQuery,
  statusFilter,
  onAddTable,
  onBulkAdd
}: TableHeaderProps) {
  const t = useTranslations("owner.tables");

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {t('title')}
        </h2>
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {t('status_count', { count: filteredCount, total: totalTables })}
          </span>
          {searchQuery && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs">
              <Search className="h-3 w-3" />
              {t("searchQuery", { query: searchQuery })}
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs">
              <Filter className="h-3 w-3" />
              {t("statusFilter", { filter: statusFilter })}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 w-full sm:w-auto">
        {onBulkAdd ? (
          <Button onClick={onBulkAdd} variant="outline" size="sm">
            <Layers className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('bulk_add.button_text')}</span>
          </Button>
        ) : null}
        <Button onClick={onAddTable}>
          <PlusCircle className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t('add_table')}</span>
        </Button>
      </div>
    </div>
  );
}
