'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, SquarePen, QrCode, FileDown, Loader2, Layers, RotateCcw, Copy, Check, Search, X, ChevronLeft, ChevronRight, RefreshCw, Users, Trees, AlertTriangle, Filter, Calendar, User, Grid, List, Accessibility } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
// Shadcn Form components for Bulk Add
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { BrandedQRDisplay } from '@/components/ui/branded-qr-display'
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
  qrCodeCreatedAt: z.string().optional().nullable(),
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
      setRestaurantSettings(settingsData || null)
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
      qrCode: undefined,
      qrCodeCreatedAt: undefined
    },
  });

  const { reset: resetSingle } = formMethodsSingle;

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
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [selectedTableForQr, setSelectedTableForQr] = useState<Table | null>(null)
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // Responsive grid
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
        qrCode: table.qr_code ?? undefined,
        qrCodeCreatedAt: table.qr_code_created_at ?? undefined
      })
    } else {
      resetSingle({
        name: '',
        capacity: 1,
        status: 'available',
        isOutdoor: false,
        isAccessible: false,
        notes: null,
        qrCode: undefined,
        qrCodeCreatedAt: undefined
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

  const handleGenerateQr = async (table: Table, forceRefresh: boolean = false) => {
    console.log('handleGenerateQr called with table:', table);
    
    // If table doesn't have a QR code or we're forcing a refresh, generate one
    if (!table.qr_code || forceRefresh) {
      try {
        // Generate a unique QR code for this table
        const uniqueCode = `${table.name.toLowerCase().replace(/\s+/g, '')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Update the table with the new QR code and creation timestamp
        const res = await fetch(`/api/v1/owner/tables/${table.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            qrCode: uniqueCode,
            qrCodeCreatedAt: new Date().toISOString()
          }),
        });
        
        if (!res.ok) {
          throw new Error('Failed to generate QR code');
        }
        
        const updatedTable = await res.json();
        
        // Update the local state
        setTablesData(tablesData.map(t => t.id === table.id ? updatedTable.table : t));
        
        // Use the updated table for QR generation
        setSelectedTableForQr(updatedTable.table);
        toast.success(forceRefresh ? t('notifications.qr_refreshed') : t('notifications.qr_generated'));
      } catch (error) {
        console.error('Error generating QR code:', error);
        toast.error(t('errors.qr_generation_failed'));
        return;
      }
    } else {
      setSelectedTableForQr(table);
    }
    
    setIsQrModalOpen(true);
  }
  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'coorder.ai';
  const qrCodeUrl = selectedTableForQr && restaurantSettings
    ? `https://${restaurantSettings.name.toLowerCase().replace(/\s+/g, '')}.${ROOT_DOMAIN}/${locale}/menu?code=${selectedTableForQr.qr_code}`
    : ''

  const copyToClipboard = async () => {
    if (!qrCodeUrl) return;
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopied(true);
      toast.success(t('notifications.link_copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      toast.error(t('errors.copy_failed'));
    }
  };

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
  

  // Utility function to check if QR code needs refresh (older than 2 weeks)
  const isQrCodeOld = (qrCreatedAt: string | null): boolean => {
    if (!qrCreatedAt) return false;
    
    const createdDate = new Date(qrCreatedAt);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    return createdDate < twoWeeksAgo;
  };

  // Filter and pagination logic
  const filteredTables = tablesData.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTables.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTables = filteredTables.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

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
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('title')}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {filteredTables.length} of {tablesData.length} tables
              </span>
              {searchQuery && (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  <Search className="h-3 w-3" />
                  &ldquo;{searchQuery}&rdquo;
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs">
                  <Filter className="h-3 w-3" />
                  {statusFilter}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleOpenBulkAddModal} variant="outline" size="sm">
              <Layers className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('bulk_add.button_text')}</span>
              <span className="sm:hidden">Bulk</span>
            </Button>
            <Button onClick={() => handleOpenTableModal()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('add_table')}</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Available</p>
                <p className="text-lg font-bold text-green-800 dark:text-green-200">
                  {tablesData.filter(t => t.status === 'available').length}
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
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Occupied</p>
                <p className="text-lg font-bold text-red-800 dark:text-red-200">
                  {tablesData.filter(t => t.status === 'occupied').length}
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
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Reserved</p>
                <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                  {tablesData.filter(t => t.status === 'reserved').length}
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
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">QR Codes</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {tablesData.filter(t => t.qr_code).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Enhanced Search and Filter Bar */}
        <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search by table name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-10">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
              
              {/* View Mode Toggle */}
              <div className="flex border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none border-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-none border-l border-slate-200 dark:border-slate-700"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              {(searchQuery || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-2 h-10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Clear</span>
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 text-slate-400 animate-spin" />
        </div>
      )}

      {/* Empty States */}
      {!isLoading && !error && tablesData.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <QrCode className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-xl font-semibold text-slate-800 dark:text-slate-100">{t('empty_state.title')}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('empty_state.description')}</p>
          <div className="mt-6">
            <Button onClick={() => handleOpenTableModal()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('empty_state.add_table_button')}
            </Button>
          </div>
          <div className="mt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('empty_state.additional_info')}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && tablesData.length > 0 && filteredTables.length === 0 && (
        <div className="text-center py-12 border border-slate-200 dark:border-slate-700 rounded-lg">
          <Search className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">No tables found</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Try adjusting your search or filter criteria
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      )}

      {/* Tables Display */}
      {!isLoading && paginatedTables.length > 0 && (
        <div className="space-y-6">
          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {paginatedTables.map(table => (
                <Card key={table.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600">
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate pr-2">
                        {table.name}
                      </h3>
                      <Badge 
                        className={`${getStatusBadgeColor(table.status)} text-white shrink-0 text-xs`}
                        variant="secondary"
                      >
                        {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                      </Badge>
                    </div>

                    {/* Table Info */}
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{table.capacity || 1}</span>
                        </div>
                        {table.is_outdoor && (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Trees className="h-3 w-3" />
                            <span className="text-xs">Outdoor</span>
                          </div>
                        )}
                        {table.is_accessible && (
                          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Accessibility className="h-3 w-3" />
                            <span className="text-xs">Accessible</span>
                          </div>
                        )}
                      </div>

                      {/* QR Code Age Warning */}
                      {table.qr_code && table.qr_code_created_at && isQrCodeOld(table.qr_code_created_at) && (
                        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-700 dark:text-amber-300 text-xs">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>QR code is old - consider refreshing</span>
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
                        onClick={() => handleOpenTableModal(table)}
                        className="flex-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <SquarePen className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default" 
                        onClick={() => handleGenerateQr(table)}
                        className="flex-1 text-xs"
                      >
                        <QrCode className="mr-1 h-3 w-3" />
                        {t('view_qr')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* List View */
            <Card className="overflow-hidden">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedTables.map(table => (
                  <div key={table.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {table.name}
                            </h3>
                            <Badge 
                              className={`${getStatusBadgeColor(table.status)} text-white text-xs`}
                              variant="secondary"
                            >
                              {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>Capacity: {table.capacity || 1}</span>
                            </div>
                            {table.is_outdoor && (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Trees className="h-3 w-3" />
                                <span>Outdoor</span>
                              </div>
                            )}
                            {table.is_accessible && (
                              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <Accessibility className="h-3 w-3" />
                                <span>Accessible</span>
                              </div>
                            )}
                            {table.qr_code && (
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <QrCode className="h-3 w-3" />
                                <span>QR Created</span>
                                {table.qr_code_created_at && isQrCodeOld(table.qr_code_created_at) && (
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                )}
                              </div>
                            )}
                          </div>
                          {table.notes && (
                            <p className="text-xs italic text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                              {table.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleOpenTableModal(table)}
                          className="text-xs"
                        >
                          <SquarePen className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default" 
                          onClick={() => handleGenerateQr(table)}
                          className="text-xs"
                        >
                          <QrCode className="mr-1 h-3 w-3" />
                          {t('view_qr')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTables.length)} of {filteredTables.length} tables
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Previous</span>
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
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced QR Code Modal */}
      <Dialog open={isQrModalOpen} onOpenChange={(open) => {
        setIsQrModalOpen(open);
        if (!open) {
          setSelectedTableForQr(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code for {selectedTableForQr?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* QR Code Age Warning */}
            {selectedTableForQr?.qr_code_created_at && isQrCodeOld(selectedTableForQr.qr_code_created_at) && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('qr_refresh_reminder')}</p>
                  <p className="text-xs opacity-75">QR code is older than 2 weeks</p>
                </div>
              </div>
            )}
            
            {/* QR Code Display */}
            <div ref={qrCodeRef} className="flex justify-center">
              {qrCodeUrl && restaurantSettings && (
                <BrandedQRDisplay
                  value={qrCodeUrl}
                  restaurantName={restaurantSettings.name}
                  tableName={selectedTableForQr?.name || ''}
                  size={200}
                />
              )}
            </div>
            
            {/* URL Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Menu URL:</label>
              <div className="flex gap-2">
                <Input 
                  value={qrCodeUrl} 
                  readOnly 
                  className="flex-1 text-sm bg-slate-50 dark:bg-slate-800"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedTableForQr?.qr_code_created_at && isQrCodeOld(selectedTableForQr.qr_code_created_at) && (
              <Button 
                onClick={() => selectedTableForQr && handleGenerateQr(selectedTableForQr, true)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('refresh_qr')}
              </Button>
            )}
            <Button 
              onClick={async () => {
                if (!qrCodeRef.current) return;
                setIsDownloadingQr(true);
                try {
                  const dataUrl = await htmlToImage.toPng(qrCodeRef.current);
                  const link = document.createElement('a');
                  link.download = `qr-${selectedTableForQr?.name || 'table'}.png`;
                  link.href = dataUrl;
                  link.click();
                  toast.success(t('notifications.qr_downloaded'));
                } catch (error) {
                  console.error('Error downloading QR code:', error);
                  toast.error(t('errors.download_failed'));
                } finally {
                  setIsDownloadingQr(false);
                }
              }}
              disabled={isDownloadingQr}
              className="w-full sm:w-auto"
            >
              {isDownloadingQr ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              {isDownloadingQr ? t('downloading') : t('download_qr')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Modal */}
      <TableModal
        isOpen={isTableModalOpen}
        onClose={() => {
          setIsTableModalOpen(false);
          setEditingTable(null);
        }}
        editingTable={editingTable}
        form={formMethodsSingle}
        onSubmit={saveTable}
        isSaving={isSaving}
        t={t}
        tCommon={tCommon}
      />

      {/* Enhanced Bulk Add Modal */}
      <Dialog open={isBulkAddModalOpen} onOpenChange={(open) => {
        setIsBulkAddModalOpen(open);
        if (!open) {
          bulkAddForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {t('bulk_add.title')}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...bulkAddForm}>
            <form
              onSubmit={bulkAddForm.handleSubmit(async (data) => {
                setIsSaving(true);
                try {
                  const tables = Array.from({ length: data.count }, (_, i) => ({
                    name: `${data.namePrefix}${data.startIndex + i}`,
                    capacity: data.capacity,
                    status: data.status,
                    is_outdoor: data.isOutdoor,
                    is_accessible: data.isAccessible,
                  }));

                  const res = await fetch('/api/v1/owner/tables/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tables }),
                  });

                  if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || t('errors.bulk_create_failed'));
                  }

                  const resJson = await res.json();
                  setTablesData([...tablesData, ...resJson.tables]);
                  toast.success(t('notifications.bulk_create_success', { count: data.count }));
                  setIsBulkAddModalOpen(false);
                } catch (error) {
                  console.error('Failed to create tables:', error);
                  toast.error(error instanceof Error ? error.message : t('errors.bulk_create_failed'));
                } finally {
                  setIsSaving(false);
                }
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bulkAddForm.control}
                  name="count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bulk_add.count_label')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="20" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bulkAddForm.control}
                  name="startIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bulk_add.start_index_label')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={bulkAddForm.control}
                name="namePrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bulk_add.name_prefix_label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('bulk_add.name_prefix_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bulkAddForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('capacity_label')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bulkAddForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('status_label')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
                  control={bulkAddForm.control}
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
                  control={bulkAddForm.control}
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

              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsBulkAddModalOpen(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSaving ? tCommon('saving') : t('bulk_add.create_button')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
