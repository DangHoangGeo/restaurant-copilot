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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

const tableSchema = z.object({
  name: z.string().min(1).max(50),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  capacity: z.number().min(1),
  status: z.enum(['available', 'occupied', 'reserved']),
  isOutdoor: z.boolean(),
  isAccessible: z.boolean(),
  notes: z.string().optional(),
  qrCode: z.string().optional(),
})

type TableFormData = z.infer<typeof tableSchema>

interface RestaurantSettings {
  name: string
  logoUrl: string | null
}

interface Table {
  id: string
  name: string
  capacity: number
  status: 'available' | 'occupied' | 'reserved'
  is_outdoor: boolean
  is_accessible: boolean
  notes?: string | null
  qr_code?: string | null
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

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: { 
      name: '',
      capacity: 1,
      status: 'available',
      isOutdoor: false,
      isAccessible: false,
      notes: '',
      qrCode: undefined
    },
  })
  
  const watchStatus = watch('status')
  
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
      reset({
        name: table.name,
        capacity: table.capacity ?? 1,
        status: table.status ?? 'available',
        isOutdoor: table.is_outdoor ?? false,
        isAccessible: table.is_accessible ?? false,
        notes: table.notes ?? '',
        qrCode: table.qr_code ?? undefined
      })
    } else {
      reset({
        name: '',
        capacity: 1,
        status: 'available',
        isOutdoor: false,
        isAccessible: false,
        notes: '',
        qrCode: undefined
      })
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
  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'baoan.jp';
  const qrCodeUrl = selectedTableForQr
    ? `https://${restaurantSettings.name.toLowerCase().replace(/\s+/g, '')}.${ROOT_DOMAIN}/${locale}/customer/order?tableId=${selectedTableForQr.id}`
    : ''

  // Helper for status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'occupied': return 'bg-red-500 hover:bg-red-600';
      case 'reserved': return 'bg-amber-500 hover:bg-amber-600';
      default: return 'bg-slate-500';
    }
  }

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
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{table.name}</h3>
              <Badge className={getStatusBadgeColor(table.status)}>
                {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
              </Badge>
            </div>
            
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <p>
                {t('AdminTables.capacity')}: {table.capacity || 1}
                {table.is_outdoor && <span className="ml-2">{t('AdminTables.outdoor')}</span>}
                {table.is_accessible && <span className="ml-2">{t('AdminTables.accessible')}</span>}
              </p>
            
              
              {table.notes && (
                <p className="mt-2 italic">{table.notes}</p>
              )}
            </div>
            
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
              <Label htmlFor="name">{t('AdminTables.table_name')}</Label>
              <Input id="name" placeholder={t('AdminTables.table_name')} {...register('name')} />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity">{t('AdminTables.capacity')}</Label>
                <Input 
                  id="capacity"
                  type="number"
                  min="1"
                  placeholder="1"
                  {...register('capacity', { valueAsNumber: true })} 
                />
                {errors.capacity && <p className="text-sm text-red-500 mt-1">{errors.capacity.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="status">{t('AdminTables.status')}</Label>
                <Select 
                  defaultValue={watchStatus} 
                  onValueChange={(value) => setValue('status', value as 'available' | 'occupied' | 'reserved')}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder={t('AdminTables.select_status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">{t('AdminTables.available')}</SelectItem>
                    <SelectItem value="occupied">{t('AdminTables.occupied')}</SelectItem>
                    <SelectItem value="reserved">{t('AdminTables.reserved')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isOutdoor"
                  checked={watch('isOutdoor')}
                  onCheckedChange={(checked) => setValue('isOutdoor', !!checked)}
                />
                <Label htmlFor="isOutdoor">{t('AdminTables.outdoor')}</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAccessible"
                  checked={watch('isAccessible')}
                  onCheckedChange={(checked) => setValue('isAccessible', !!checked)}
                />
                <Label htmlFor="isAccessible">{t('AdminTables.accessible')}</Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">{t('AdminTables.notes')}</Label>
              <Textarea id="notes" placeholder={t('AdminTables.notes_placeholder')} {...register('notes')} />
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
              <Button variant="primary" className="mt-6 w-full" onClick={() => {
                // Update QR code in database
                if (selectedTableForQr) {
                  fetch(`/api/v1/tables/${selectedTableForQr.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qrCode: qrCodeUrl }),
                  }).then(res => {
                    if (res.ok) {
                      alert(t('AdminTables.qr_saved'));
                    } else {
                      console.error('Failed to save QR code');
                    }
                  });
                }
                alert(t('AdminTables.download_png_action'));
              }}>
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
