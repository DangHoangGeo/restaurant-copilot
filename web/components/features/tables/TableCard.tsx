"use client";

import { Users, Trees, AlertTriangle, SquarePen, QrCode } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table } from '@/shared/types'

interface TableCardProps {
  table: Table
  onEdit: (table: Table) => void
  onViewQR: (table: Table) => void
  isQrCodeOld: (qrCreatedAt: string | null) => boolean
}

export function TableCard({ table, onEdit, onViewQR, isQrCodeOld }: TableCardProps) {
  const t = useTranslations("owner.tables");

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'occupied': return 'bg-red-500 hover:bg-red-600';
      case 'reserved': return 'bg-amber-500 hover:bg-amber-600';
      default: return 'bg-slate-500';
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-slate-200 dark:border-slate-700 h-full">
      <div className="p-4 space-y-3 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate pr-2">
            {table.name}
          </h3>
          <Badge 
            className={`${getStatusBadgeColor(table.status)} text-white shrink-0 text-xs`}
            variant="secondary"
          >
            {t(`status_options.${table.status}`)}
          </Badge>
        </div>

        {/* Table Info */}
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 flex-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{table.capacity || 1}</span>
            </div>
            {table.is_outdoor && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Trees className="h-3 w-3" />
                <span className="text-xs">{t('table_info.outdoor_badge')}</span>
              </div>
            )}
            {table.is_accessible && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <span className="text-xs">{t('table_info.accessible_badge')}</span>
              </div>
            )}
          </div>

          {/* QR Code Age Warning */}
          {table.qr_code && table.qr_code_created_at && isQrCodeOld(table.qr_code_created_at) && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-700 dark:text-amber-300 text-xs">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{t('table_info.qr_old_warning')}</span>
            </div>
          )}

          {/* Notes */}
          {table.notes && (
            <p className="text-xs italic text-slate-500 dark:text-slate-400 line-clamp-2">
              {table.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onEdit(table)}
            className="flex-1 text-xs"
          >
            <SquarePen className="mr-1 h-3 w-3" />
            {t('actions.edit')}
          </Button>
          <Button 
            size="sm" 
            variant="default" 
            onClick={() => onViewQR(table)}
            className="flex-1 text-xs"
          >
            <QrCode className="mr-1 h-3 w-3" />
            {t('actions.view_qr_code')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
