"use client";

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  startIndex: number
  onPageChange: (page: number) => void
}

export function TablePagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startIndex,
  onPageChange
}: TablePaginationProps) {
  const t = useTranslations("owner.tables");

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
      <div className="text-sm text-slate-500 dark:text-slate-400">
        {t('pagination.showing', {
          start: startIndex + 1,
          end: Math.min(startIndex + itemsPerPage, totalItems),
          total: totalItems
        })}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">{t('pagination.previous')}</span>
        </Button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="w-8 h-8 p-0"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <span className="hidden sm:inline mr-1">{t('pagination.next')}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
