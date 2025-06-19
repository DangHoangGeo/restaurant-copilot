'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, SquarePen, QrCode, FileDown, Loader2, Layers, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
// Shadcn Form components for Bulk Add
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { QRCodeDisplay } from '@/components/ui/qr-code-display' // Ensure this component renders an element that can be captured
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import * as htmlToImage from 'html-to-image'
import { Table } from '@/shared/types'

// Define Zod schema for table form validation
const getTableSchema = (t: ReturnType<typeof useTranslations<'validation'>>) => z.object({
  name: z.string().min(1, t('name_required')).max(50, t('name_max_length', { maxLength: 50 })),
  positionX: z.number().optional(), // Not used in form currently
  positionY: z.number().optional(), // Not used in form currently
  capacity: z.number({ required_error: t('capacity_required') }).min(1, t('capacity_min', { min: 1 })),
  status: z.enum(['available', 'occupied', 'reserved'], { required_error: t('status_required') }),
  isOutdoor: z.boolean(),
  isAccessible: z.boolean(),
  notes: z.string().max(255, t('notes_max_length', { maxLength: 255 })).optional().nullable(), // allow nullable for notes
  qrCode: z.string().url(t('qrCode_invalid_url')).optional().nullable(),
});
type TableFormData = z.infer<ReturnType<typeof getTableSchema>>;

// Schema for Bulk Add Tables form
const getBulkAddTableSchema = (t: ReturnType<typeof useTranslations<'validation'>>) => z.object({
  count: z.number({ required_error: t('bulk_count_required') }).min(1, t('bulk_count_min', { min: 1 })).max(20, t('bulk_count_max', { max: 20 })), // Max 20 for sanity
  namePrefix: z.string().min(1, t('bulk_name_prefix_required')).max(20, t('bulk_name_prefix_max_length', { maxLength: 20 })),
  startIndex: z.number({ required_error: t('bulk_start_index_required') }).min(1, t('bulk_start_index_min', { min: 1 })).max(1000, t('bulk_start_index_max', { max: 1000 })),
  capacity: z.number({ required_error: t('capacity_required') }).min(1, t('capacity_min', { min: 1 })),
  status: z.enum(['available', 'occupied', 'reserved'], { required_error: t('status_required') }),
  isOutdoor: z.boolean(),
  isAccessible: z.boolean(),
});
type BulkAddTableFormData = z.infer<ReturnType<typeof getBulkAddTableSchema>>;

// Loading skeleton component
function TablesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useTranslations("common")
  
  return (
    <div className="p-8 text-center">
      <div className="p-4 text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-300 rounded-md">
        <h3 className="font-semibold text-lg mb-2">{t('alert.error.title')}</h3>
        <p className="mb-4">{error}</p>
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t('retry')}
        </Button>
      </div>
    </div>
  )
}

// TableModal component for adding/editing tables
function TableModal({
  isOpen,
  onClose,
  editingTable,
  form,
  onSubmit,
  isSaving,
  t,
  tCommon
}: {
  isOpen: boolean;
  onClose: () => void;
  editingTable: Table | null;
  form: ReturnType<typeof useForm<TableFormData>>;
  onSubmit: (data: TableFormData) => Promise<void>;
  isSaving: boolean;
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}) {
  const { control, handleSubmit } = form;
  
  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => { 
      if (!isOpen) {
        form.reset(); 
        onClose();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTable ? t('edit_table') : t('add_table')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('table_name_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('table_name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('capacity_label')}</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder={t('capacity_placeholder')} {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('status_label')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_status_placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">{t('status_options.available')}</SelectItem>
                        <SelectItem value="occupied">{t('status_options.occupied')}</SelectItem>
                        <SelectItem value="reserved">{t('status_options.reserved')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center space-x-4">
              <FormField
                control={control}
                name="isOutdoor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('is_outdoor_label')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="isAccessible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('is_accessible_label')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('notes_label')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('notes_placeholder')} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-slate-500 dark:text-slate-400">{tCommon('zod_form_hint')}</p>
            <DialogFooter className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={onClose}>{tCommon('cancel')}</Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSaving ? tCommon('saving') : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface RestaurantSettings {
  name: string
  logoUrl: string | null
}

export function TablesClientContent() {
  const t = useTranslations("owner.tables");
  const tVal = useTranslations('owner.tables.validation');
  const tCommon = useTranslations('common');
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  // Progressive loading state
  const [tablesData, setTablesData] = useState<Table[]>([])
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [tablesRes, settingsRes] = await Promise.all([
        fetch('/api/v1/owner/tables'),
        fetch('/api/v1/restaurant/settings')
      ])

      if (!tablesRes.ok) {
        throw new Error(`Failed to fetch tables: ${tablesRes.status}`)
      }
      if (!settingsRes.ok) {
        throw new Error(`Failed to fetch settings: ${settingsRes.status}`)
      }

      const [tablesData, settingsData] = await Promise.all([
        tablesRes.json(),
        settingsRes.json()
      ])

      setTablesData(tablesData.tables || [])
      setRestaurantSettings(settingsData.settings || null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Moved hook declarations to the top
  const tableSchema = getTableSchema(tVal);
  const bulkAddTableSchema = getBulkAddTableSchema(tVal);

  const formMethodsSingle = useForm<TableFormData>({
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
  });

  const {
    handleSubmit: handleSubmitSingle,
    reset: resetSingle,
    control: controlSingle
  } = formMethodsSingle;

  const bulkAddForm = useForm<BulkAddTableFormData>({
    resolver: zodResolver(bulkAddTableSchema),
    defaultValues: {
      count: 5,
      namePrefix: t('bulk_add.default_name_prefix') || "Table ",
      startIndex: 1,
      capacity: 4,
      status: 'available',
      isOutdoor: false,
      isAccessible: false,
    }
  });

  // UI state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false); // Kept for now
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [selectedTableForQr, setSelectedTableForQr] = useState<Table | null>(null)
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const handleOpenTableModal = (table: Table | null = null) => {
    setEditingTable(table)
    if (table) {
      resetSingle({
        name: table.name,
        capacity: table.capacity ?? 1,
        status: table.status ?? 'available',
        isOutdoor: table.is_outdoor ?? false,
        isAccessible: table.is_accessible ?? false,
        notes: table.notes ?? null, // Ensure null for optional text
        qrCode: table.qr_code ?? undefined
      })
    } else {
      resetSingle({
        name: '',
        capacity: 1,
        status: 'available',
        isOutdoor: false,
        isAccessible: false,
        notes: null,
        qrCode: undefined
      })
    }
    setIsTableModalOpen(true)
  }

  const saveTable = async (data: TableFormData) => {
    setIsSaving(true);
    const url = editingTable ? `/api/v1/owner/tables/${editingTable.id}` : '/api/v1/owner/tables'
    const method = editingTable ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || t('errors.save_failed'));
      }
      const resJson = await res.json()
      if (editingTable) {
        setTablesData(tablesData.map(t => t.id === resJson.table.id ? resJson.table : t))
        toast.success(t('notifications.update_success'));
      } else {
        setTablesData([...tablesData, resJson.table])
        toast.success(t('notifications.create_success'));
      }
      setIsTableModalOpen(false)
    } catch (error) {
      console.error('Failed to save table:', error);
      toast.error(error instanceof Error ? error.message : t('errors.save_failed'));
    } finally {
      setIsSaving(false);
    }
  }

  const handleGenerateQr = (table: Table) => {
    // TODO: Ensure table has a qr_code field in the DB
    if (!table.qr_code) {
      // Create a random QR code if not set, then save it into the table
      // This is a placeholder, you might want to generate a proper QR code
      // or handle it differently based on your requirements
      // For now, we just show an error
      toast.error(t('errors.qr_code_not_set'));
      return;
    }
    setSelectedTableForQr(table)
    setIsQrModalOpen(true)
  }
  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'coorder.ai';
  const qrCodeUrl = selectedTableForQr && restaurantSettings
    ? `https://${restaurantSettings.name.toLowerCase().replace(/\s+/g, '')}.${ROOT_DOMAIN}/${locale}/menu?code=${selectedTableForQr.qr_code}`
    : ''

  const handleOpenBulkAddModal = () => {
    bulkAddForm.reset({
      count: 5,
      namePrefix: t('bulk_add.default_name_prefix') || "Table ",
      startIndex: 1,
      capacity: 4,
      status: 'available',
      isOutdoor: false,
      isAccessible: false,
    });
    console.log('Opening bulk add modal',isBulkAddModalOpen);
    setIsBulkAddModalOpen(true);
  };
  /**
   * handleBulkAddSubmit is kept for now, but you can remove it if you don't need bulk add functionality.
   * It currently loops through the count and creates tables with the specified prefix and index.
  const handleBulkAddSubmit = async (data: BulkAddTableFormData) => { // Kept for now
    setIsSaving(true);
    let successCount = 0;
    const errorMessages: string[] = [];

    for (let i = 0; i < data.count; i++) {
      const tableName = `${data.namePrefix}${data.startIndex + i}`;
      // Construct payload for the single table API endpoint
      const tablePayload: Omit<TableFormData, 'qrCode' | 'positionX' | 'positionY' | 'notes'> & { notes?: string | null } = {
        name: tableName,
        capacity: data.capacity,
        status: data.status,
        isOutdoor: data.isOutdoor,
        isAccessible: data.isAccessible,
        notes: null, // Default notes to null for bulk add
      };

      try {
        const res = await fetch('/api/v1/owner/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tablePayload),
        });
        if (!res.ok) {
          const errorData = await res.json();
          errorMessages.push(`${tableName}: ${errorData.message || 'Failed'}`);
          continue;
        }
        successCount++;
      } catch (error) {
        errorMessages.push(`${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    setIsSaving(false);
    if (successCount > 0) {
      toast.success(t('bulk_add.notification_success', { count: successCount }));
      router.refresh();
    }
    if (errorMessages.length > 0) {
      toast.error(t('bulk_add.notification_error', { count: errorMessages.length, errors: errorMessages.join(', ') }));
    }
    if (successCount > 0 && errorMessages.length === 0) {
      setIsBulkAddModalOpen(false);
    }
  }; */

  // Helper for status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'occupied': return 'bg-red-500 hover:bg-red-600';
      case 'reserved': return 'bg-amber-500 hover:bg-amber-600';
      default: return 'bg-slate-500';
    }
  }

  // Early return for loading state
  if (isLoading) {
    return <TablesSkeleton />
  }

  // Early return for error state
  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('title')}</h2>
        <div className="flex gap-2">
          <Button onClick={handleOpenBulkAddModal}>
            <Layers className="mr-2 h-4 w-4" />
            {t('bulk_add.button_text')}
          </Button>
          <Button onClick={() => handleOpenTableModal()}>
            <PlusCircle className="mr-2" />
            {t('add_table')}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 text-slate-400 animate-spin" />
        </div>
      )}

      {!isLoading && !error && tablesData.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <QrCode className="mx-auto h-12 w-12 text-slate-400" /> {/* Using QrCode icon as a placeholder for tables */}
          <h3 className="mt-2 text-xl font-semibold text-slate-800 dark:text-slate-100">{t('empty_state.title')}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('empty_state.description')}</p>
          <div className="mt-6 space-x-2">
            <Button onClick={() => handleOpenTableModal()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('empty_state.add_table_button')}
            </Button>
            <Button variant="outline" onClick={handleOpenBulkAddModal}>
              <Layers className="mr-2 h-4 w-4" />
              {t('empty_state.bulk_add_button')}
            </Button>
          </div>
          <div className="mt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('empty_state.additional_info')}</p>
          </div>
          <TableModal isOpen={isTableModalOpen}
            onClose={() => setIsTableModalOpen(false)}
            editingTable={editingTable}
            form={formMethodsSingle}
            onSubmit={saveTable}
            isSaving={isSaving}
            t={t}
            tCommon={tCommon} />

        </div>
      )}

      {!isLoading && tablesData.length > 0 && (
        <div>
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
                    {t('capacity')}: {table.capacity || 1}
                    {table.is_outdoor && <span className="ml-2">{t('outdoor')}</span>}
                    {table.is_accessible && <span className="ml-2">{t('accessible')}</span>}
                  </p>


                  {table.notes && (
                    <p className="mt-2 italic">{table.notes}</p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleOpenTableModal(table)}>
                    <SquarePen className="mr-1" />
                    {tCommon('edit')}</Button>
                  <Button size="sm" variant="primary" onClick={() => handleGenerateQr(table)}>
                    <QrCode className="mr-1" />
                    {t('generate_qr')}</Button>
                </div>
              </Card>
            ))}
          </div>
          <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTable ? t('edit_table') : t('add_table')}</DialogTitle>
              </DialogHeader>
                <Form {...formMethodsSingle}>
                  <form onSubmit={handleSubmitSingle(saveTable)} className="space-y-4">
                    <FormField
                      control={controlSingle}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('table_name_label')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('table_name_placeholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={controlSingle}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('capacity_label')}</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" placeholder={t('capacity_placeholder')} {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={controlSingle}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('status_label')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('select_status_placeholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="available">{t('status_options.available')}</SelectItem>
                                <SelectItem value="occupied">{t('status_options.occupied')}</SelectItem>
                                <SelectItem value="reserved">{t('status_options.reserved')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <FormField
                        control={controlSingle}
                        name="isOutdoor"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>{t('is_outdoor_label')}</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={controlSingle}
                        name="isAccessible"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>{t('is_accessible_label')}</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={controlSingle}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('notes_label')}</FormLabel>
                          <FormControl>
                            <Textarea placeholder={t('notes_placeholder')} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <p className="text-xs text-slate-500 dark:text-slate-400">{tCommon('zod_form_hint')}</p>
                    <DialogFooter className="flex justify-end space-x-2 mt-6">
                      <Button type="button" variant="secondary" onClick={() => setIsTableModalOpen(false)}>{tCommon('cancel')}</Button>
                      <Button type="submit" variant="primary" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? tCommon('saving') : tCommon('save')}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('qr_for_table')} {selectedTableForQr?.name || ''}</DialogTitle>
              </DialogHeader>
              {selectedTableForQr && (
                <div className="text-center">
                  <div ref={qrCodeRef} className="inline-block p-4 bg-white"> {/* Wrapper for html-to-image */}
                    <QRCodeDisplay value={qrCodeUrl} size={256} />
                  </div>
                  <Button
                    variant="primary"
                    className="mt-6 w-full"
                    disabled={isDownloadingQr}
                    onClick={async () => {
                      if (!selectedTableForQr || !qrCodeRef.current) return;
                      setIsDownloadingQr(true);
                      try {
                        // Save QR code URL to DB
                        const res = await fetch(`/api/v1/owner/tables/${selectedTableForQr.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ qr_code: qrCodeUrl }), // Ensure field name matches DB
                        });
                        if (!res.ok) {
                          const errorData = await res.json();
                          throw new Error(errorData.message || t('errors.qr_save_failed'));
                        }
                        // Update local state with new QR code URL
                        setTablesData(prevTables => prevTables.map(table =>
                          table.id === selectedTableForQr.id ? { ...table, qr_code: qrCodeUrl } : table
                        ));
                        toast.success(t('notifications.qr_saved_success'));

                        // Download as PNG
                        const dataUrl = await htmlToImage.toPng(qrCodeRef.current);
                        const link = document.createElement('a');
                        link.download = `${selectedTableForQr.name.replace(/\s+/g, '_')}-qr-code.png`;
                        link.href = dataUrl;
                        link.click();
                      } catch (error) {
                        console.error('Error processing QR code:', error);
                        toast.error(error instanceof Error ? error.message : t('errors.qr_download_failed'));
                      } finally {
                        setIsDownloadingQr(false);
                      }
                    }}>
                    {isDownloadingQr ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2" />}
                    {isDownloadingQr ? t('downloading_qr') : t('download_png')}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )
      }
    </div>
  )
}
