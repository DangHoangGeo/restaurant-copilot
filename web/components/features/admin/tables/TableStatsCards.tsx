"use client";

import { Card } from '@/components/ui/card'
import { Users, User, Calendar, QrCode } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Table } from '@/shared/types'

interface TableStatsCardsProps {
  tables: Table[]
}

export function TableStatsCards({ tables }: TableStatsCardsProps) {
  const t = useTranslations("owner.tables");

  const availableCount = tables.filter(t => t.status === 'available').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const reservedCount = tables.filter(t => t.status === 'reserved').length;
  const qrCodeCount = tables.filter(t => t.qr_code).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card className="p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {t('stats.available')}
            </p>
            <p className="text-lg font-bold text-green-800 dark:text-green-200">
              {availableCount}
            </p>
          </div>
        </div>
      </Card>
      
      <Card className="p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {t('stats.occupied')}
            </p>
            <p className="text-lg font-bold text-red-800 dark:text-red-200">
              {occupiedCount}
            </p>
          </div>
        </div>
      </Card>
      
      <Card className="p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {t('stats.reserved')}
            </p>
            <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
              {reservedCount}
            </p>
          </div>
        </div>
      </Card>
      
      <Card className="p-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">
            <QrCode className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('stats.qr_codes')}
            </p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {qrCodeCount}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
