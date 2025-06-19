"use client";

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Table } from '@/shared/types'

// Components
import { TableHeader } from '@/components/features/tables/TableHeader'
import { TableStatsCards } from '@/components/features/tables/TableStatsCards'
import { TableSearchFilters } from '@/components/features/tables/TableSearchFilters'
import { TableCard } from '@/components/features/tables/TableCard'
import { TablePagination } from '@/components/features/tables/TablePagination'
import { EmptyStates } from '@/components/features/tables/EmptyStates'
import { QRCodeModal } from '@/components/features/tables/QRCodeModal'
import { TableModal, TableFormData } from '@/components/features/tables/TableModal'
import { TablesSkeleton } from '@/components/features/tables/TablesSkeleton'
import { ErrorState } from '@/components/features/tables/ErrorState'

// Define Zod schema for table form validation
const getTableSchema = (t: ReturnType<typeof useTranslations<'validation'>>) => z.object({
  name: z.string().min(1, t('name_required')).max(50, t('name_max_length', { maxLength: 50 })),
  capacity: z.number({ required_error: t('capacity_required') }).min(1, t('capacity_min', { min: 1 })),
  status: z.enum(['available', 'occupied', 'reserved'], { required_error: t('status_required') }),
  isOutdoor: z.boolean(),
  isAccessible: z.boolean(),
  notes: z.string().max(255, t('notes_max_length', { maxLength: 255 })).optional().nullable(),
  qrCode: z.string().url(t('qrCode_invalid_url')).optional().nullable(),
  qrCodeCreatedAt: z.string().optional().nullable(),
});

type ViewMode = 'grid' | 'list'

interface RestaurantSettings {
  name: string
  logoUrl: string | null
}

export function TablesClientContent() {
  const t = useTranslations("owner.tables");
  const tVal = useTranslations('owner.tables.validation');
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  // Data state
  const [tablesData, setTablesData] = useState<Table[]>([])
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [selectedTableForQr, setSelectedTableForQr] = useState<Table | null>(null)
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Form setup
  const tableSchema = getTableSchema(tVal);
  const form = useForm<TableFormData>({
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

  // Utility functions
  const isQrCodeOld = (qrCreatedAt: string | null): boolean => {
    if (!qrCreatedAt) return false;
    
    const createdDate = new Date(qrCreatedAt);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    return createdDate < twoWeeksAgo;
  };

  // Event handlers
  const handleOpenTableModal = (table: Table | null = null) => {
    setEditingTable(table)
    if (table) {
      form.reset({
        name: table.name,
        capacity: table.capacity ?? 1,
        status: table.status ?? 'available',
        isOutdoor: table.is_outdoor ?? false,
        isAccessible: table.is_accessible ?? false,
        notes: table.notes ?? null,
        qrCode: table.qr_code ?? undefined,
        qrCodeCreatedAt: table.qr_code_created_at ?? undefined
      })
    } else {
      form.reset({
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
    if (!table.qr_code || forceRefresh) {
      try {
        const uniqueCode = `${table.name.toLowerCase().replace(/\s+/g, '')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
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
        setTablesData(tablesData.map(t => t.id === table.id ? updatedTable.table : t));
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

  const handleOpenBulkAddModal = () => {
    toast.info('Bulk add functionality coming soon');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
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

  // QR Code URL generation
  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'coorder.ai';
  const qrCodeUrl = selectedTableForQr && restaurantSettings
    ? `https://${restaurantSettings.name.toLowerCase().replace(/\s+/g, '')}.${ROOT_DOMAIN}/${locale}/menu?code=${selectedTableForQr.qr_code}`
    : ''

  // Early returns for loading and error states
  if (isLoading) {
    return <TablesSkeleton />
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <TableHeader
        totalTables={tablesData.length}
        filteredCount={filteredTables.length}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onAddTable={() => handleOpenTableModal()}
        onBulkAdd={handleOpenBulkAddModal}
      />

      {/* Stats Cards */}
      <TableStatsCards tables={tablesData} />

      {/* Search and Filters */}
      <TableSearchFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Empty States */}
      <EmptyStates
        hasData={tablesData.length > 0}
        hasFilteredResults={filteredTables.length > 0}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onAddTable={() => handleOpenTableModal()}
        onClearFilters={clearFilters}
      />

      {/* Tables Grid/List */}
      {paginatedTables.length > 0 && (
        <div className="space-y-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {paginatedTables.map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  onEdit={handleOpenTableModal}
                  onViewQR={handleGenerateQr}
                  isQrCodeOld={isQrCodeOld}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedTables.map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  onEdit={handleOpenTableModal}
                  onViewQR={handleGenerateQr}
                  isQrCodeOld={isQrCodeOld}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredTables.length}
            startIndex={startIndex}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Modals */}
      <TableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        editingTable={editingTable}
        form={form}
        onSubmit={saveTable}
        isSaving={isSaving}
      />

      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        table={selectedTableForQr}
        restaurantName={restaurantSettings?.name || ''}
        qrCodeUrl={qrCodeUrl}
        onRefreshQR={(table) => handleGenerateQr(table, true)}
        isQrCodeOld={isQrCodeOld}
      />
    </div>
  )
}
