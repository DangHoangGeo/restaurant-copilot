'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, SquarePen, QrCode, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'
import { Input } from '@/components/ui/input'

const tableSchema = z.object({
  name: z.string().min(1).max(50),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
})

type TableFormData = z.infer<typeof tableSchema>

interface RestaurantSettings {
  name: string
  logoUrl: string | null
}

interface Table {
  id: string
  name: string
  position_x?: number | null
  position_y?: number | null
}

interface TablesClientContentProps {
  restaurantSettings: RestaurantSettings
  initialData: Table[] | null
  error: string | null
}

export function TablesClientContent({ restaurantSettings, initialData, error }: TablesClientContentProps) {
  const t = useTranslations()
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const [tablesData, setTablesData] = useState<Table[]>(initialData || [])
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [selectedTableForQr, setSelectedTableForQr] = useState<Table | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: { name: '', positionX: undefined, positionY: undefined },
  })

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-300 rounded-md">
        {error}
      </div>
    )
  }

  const handleOpenTableModal = (table: Table | null = null) => {
    setEditingTable(table)
    if (table) {
      reset({ name: table.name, positionX: table.position_x ?? undefined, positionY: table.position_y ?? undefined })
    } else {
      reset({ name: '', positionX: undefined, positionY: undefined })
    }
    setIsTableModalOpen(true)
  }

  const saveTable = async (data: TableFormData) => {
    const url = editingTable ? `/api/v1/tables/${editingTable.id}` : '/api/v1/tables'
    const method = editingTable ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const resJson = await res.json()
      if (editingTable) {
        setTablesData(tablesData.map(t => t.id === resJson.table.id ? resJson.table : t))
      } else {
        setTablesData([...tablesData, resJson.table])
      }
      setIsTableModalOpen(false)
    } else {
      console.error('Failed to save table')
    }
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
        <Button onClick={() => handleOpenTableModal()}> 
          <PlusCircle className="mr-2" />
          {t('AdminTables.add_table')}</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tablesData.map(table => (
          <Card key={table.id} className="p-4 space-y-2">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{table.name}</h3>
            {(table.position_x !== undefined && table.position_x !== null) && (
              <p className="text-sm text-slate-500 dark:text-slate-400">X: {table.position_x}, Y: {table.position_y}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleOpenTableModal(table)}>
                <SquarePen className="mr-1" />
                {t('Common.edit')}</Button>
              <Button size="sm" variant="primary" onClick={() => handleGenerateQr(table)}>
                <QrCode className="mr-1" />
                {t('AdminTables.generate_qr')}</Button>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? t('AdminTables.edit_table') : t('AdminTables.add_table')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(saveTable)} className="space-y-4">
            <div>
              <Input placeholder={t('AdminTables.table_name')} {...register('name')} />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div className="flex space-x-2">
              <Input type="number" placeholder="X" {...register('positionX', { valueAsNumber: true })} />
              <Input type="number" placeholder="Y" {...register('positionY', { valueAsNumber: true })} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('Common.zod_form_hint')}</p>
            <DialogFooter className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={() => setIsTableModalOpen(false)}>{t('Common.cancel')}</Button>
              <Button type="submit" variant="primary">{t('Common.save')}</Button>
            </DialogFooter>
          </form>
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
              <Button variant="primary" className="mt-6 w-full" onClick={() => alert(t('AdminTables.download_png_action'))}>
                <FileDown className="mr-2" />
                {t('AdminTables.download_png')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
