'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PlusCircle, SquarePen, QrCode, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'

const MOCK_TABLES_BASE = [
  { id: 't1', name: 'Table 1', position: 'Window', capacity: 4 },
  { id: 't2', name: 'Table 2', position: 'Center', capacity: 2 },
  { id: 't3', name: 'Patio 1', position: 'Outside', capacity: 6 }
]

interface RestaurantSettings {
  name: string
  logoUrl: string | null
}

interface Table {
  id: string
  name: string
  position?: string
  capacity: number
}

export function TablesClientContent({ restaurantSettings }: { restaurantSettings: RestaurantSettings }) {
  const t = useTranslations()
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const tables: Table[] = MOCK_TABLES_BASE
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [selectedTableForQr, setSelectedTableForQr] = useState<Table | null>(null)

  const handleOpenTableModal = (table: Table | null = null) => {
    setEditingTable(table)
    setIsTableModalOpen(true)
  }
  const handleSaveTable = () => {
    setIsTableModalOpen(false)
  }

  const handleGenerateQr = (table: Table) => {
    setSelectedTableForQr(table)
    setIsQrModalOpen(true)
  }

  const qrCodeUrl = selectedTableForQr
    ? `https://${restaurantSettings.name.toLowerCase().replace(/\s+/g, '')}.shop-copilot.com/${locale}/customer/order?tableId=${selectedTableForQr.id}`
    : ''

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('AdminNav.admin_tables_title')}</h2>
        <Button onClick={() => handleOpenTableModal()} iconLeft={PlusCircle}>{t('AdminTables.add_table')}</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => (
          <Card key={table.id} className="p-4 space-y-2">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{table.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('AdminTables.capacity')}: {table.capacity}</p>
            {table.position && <p className="text-sm text-slate-500 dark:text-slate-400">{t('AdminTables.position')}: {table.position}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" iconLeft={SquarePen} onClick={() => handleOpenTableModal(table)}>{t('Common.edit')}</Button>
              <Button size="sm" variant="primary" iconLeft={QrCode} onClick={() => handleGenerateQr(table)}>{t('AdminTables.generate_qr')}</Button>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? t('AdminTables.edit_table') : t('AdminTables.add_table')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('Common.form_placeholder')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">{t('Common.zod_form_hint')}</p>
          <DialogFooter className="flex justify-end space-x-2 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsTableModalOpen(false)}>{t('Common.cancel')}</Button>
            <Button type="submit" variant="primary" onClick={handleSaveTable}>{t('Common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('AdminTables.qr_for_table')} {selectedTableForQr?.name || ''}</DialogTitle>
          </DialogHeader>
          {selectedTableForQr && (
            <div className="text-center">
              <QRCodeDisplay value={qrCodeUrl} size={256} />
              <Button variant="primary" iconLeft={FileDown} className="mt-6 w-full" onClick={() => alert(t('AdminTables.download_png_action'))}>
                {t('AdminTables.download_png')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
