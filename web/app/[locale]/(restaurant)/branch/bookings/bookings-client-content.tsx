'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Eye, CalendarX, Loader2, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FEATURE_FLAGS } from '@/config/feature-flags'
import { ComingSoon } from '@/components/common/coming-soon'
import { toast } from 'sonner'

interface PreOrderItem {
  itemId: string
  quantity: number
}

interface Booking {
  id: string
  customerName: string
  contact: string
  date: string
  time: string
  partySize: number
  status: string
  preOrderItems: PreOrderItem[]
}

import { BookingsSkeleton } from '@/components/ui/skeletons';

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useTranslations("owner.bookings");
  
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export function BookingsClientContent() {
  const t = useTranslations("owner.bookings");
  const tCommon = useTranslations("common");
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadBookings = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/v1/owner/bookings', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(t('notifications.fetch_error'));
      }
      
      const data = await response.json();
      
      // Transform the data to match our interface
      const transformedBookings = data.bookings?.map((b: {
        id: string;
        customer_name: string;
        customer_contact?: string;
        booking_date: string;
        booking_time: string;
        party_size: number;
        status: string;
        preorder_items?: PreOrderItem[];
        pre_order_items?: PreOrderItem[];
      }) => ({
        id: b.id,
        customerName: b.customer_name,
        contact: b.customer_contact || '',
        date: new Date(b.booking_date).toLocaleDateString(),
        time: b.booking_time,
        partySize: b.party_size,
        status: b.status,
        preOrderItems: b.preorder_items || b.pre_order_items || []
      })) || [];
      
      setBookings(transformedBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : t('notifications.fetch_error'));
    } finally {
      setIsInitialLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  if (!FEATURE_FLAGS.tableBooking) {
    return <ComingSoon featureName="title" />;
  }

  if (isInitialLoading) return <BookingsSkeleton />;
  if (error) return <ErrorState error={error} onRetry={loadBookings} />;

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  const handleUpdateStatus = async (bookingId: string, status: 'confirmed' | 'canceled') => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/owner/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: updatedBooking.booking.status } : b));
        if (selectedBooking?.id === bookingId) setSelectedBooking({ ...selectedBooking, status: updatedBooking.booking.status });
        toast.success(t('notifications.update_success'));
        if (status === 'confirmed' || status === 'canceled') setIsDetailModalOpen(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(t('notifications.update_failed', { error: errorData.message || 'Unknown error' }));
      }
    } catch (e) {
      toast.error(t('notifications.update_failed', { error: e instanceof Error ? e.message : 'Unknown error' }));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      canceled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    }
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{t(`status.${status}`)}</span>
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#2E2117] dark:text-[#F7F1E9]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-[#8B6E5A] dark:text-[#B89078]">
          {t("subtitle")}
        </p>
      </header>

      {bookings.length === 0 ? (
        <Card className="border-dashed border-[#AB6E3C]/20 bg-[#FEFAF6]/70 p-8 text-center shadow-none dark:border-[#AB6E3C]/25 dark:bg-[#251810]/60">
          <CalendarX className="mx-auto h-12 w-12 text-[#AB6E3C]/45" />
          <h3 className="mt-4 text-lg font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
            {t('empty_state.title')}
          </h3>
          <p className="mt-2 text-sm text-[#8B6E5A] dark:text-[#B89078]">
            {t('empty_state.description')}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-[#AB6E3C]/10 bg-[#FEFAF6] shadow-sm shadow-[#AB6E3C]/5 dark:border-[#AB6E3C]/15 dark:bg-[#251810]/85">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5EAD8]/70 text-xs uppercase text-[#8B6E5A] dark:bg-[#170F0C]/60 dark:text-[#B89078]">
                <tr>
                  {['customer_name','contact','date_time','party_size','status','actions'].map(col => (
                    <th key={col} className="px-4 py-3">{t(`table.${col}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(booking => (
                  <tr key={booking.id} className="border-t border-[#AB6E3C]/10 bg-[#FEFAF6] text-[#2E2117] hover:bg-[#FAF3EA] dark:border-[#AB6E3C]/15 dark:bg-[#251810]/85 dark:text-[#F7F1E9] dark:hover:bg-[#2B1A10]">
                    <td className="px-4 py-3 font-medium">{booking.customerName}</td>
                    <td className="px-4 py-3">{booking.contact}</td>
                    <td className="px-4 py-3">{booking.date} @ {booking.time}</td>
                    <td className="px-4 py-3 text-center">{booking.partySize}</td>
                    <td className="px-4 py-3">{statusBadge(booking.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => handleViewDetails(booking)}>
                        <Eye className="h-4 w-4 mr-1" />
                      {t('actions.view_details')}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('details_title')}</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-2">
              <p><strong>{t('table.customer_name')}:</strong> {selectedBooking.customerName}</p>
              <p><strong>{t('table.contact')}:</strong> {selectedBooking.contact}</p>
              <p><strong>{t('table.date_time')}:</strong> {selectedBooking.date} @ {selectedBooking.time}</p>
              <p><strong>{t('table.party_size')}:</strong> {selectedBooking.partySize}</p>
              <p><strong>{t('table.status')}:</strong> {statusBadge(selectedBooking.status)}</p>
              {selectedBooking.preOrderItems?.length === 0 && <p className="text-sm mt-2 text-[#8B6E5A] dark:text-[#B89078]">{t('preorder.no_preorder_items')}</p>}
            </div>
          )}
           <DialogFooter className="mt-6">
            {selectedBooking && selectedBooking.status === 'pending' && (
              <>
                <Button variant="outline" onClick={() => handleUpdateStatus(selectedBooking.id, 'canceled')} disabled={isUpdatingStatus}>
                  {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {tCommon('cancel_booking')}
                </Button>
                <Button variant="default" onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')} disabled={isUpdatingStatus}>
                  {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {tCommon('confirm_booking')}
                </Button>
              </>
            )}
             <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>{tCommon('close_modal')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
