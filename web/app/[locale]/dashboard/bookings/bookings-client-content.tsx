'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Eye, CalendarX, Loader2 } from 'lucide-react' // Added CalendarX for empty state, Loader2
import { FEATURE_FLAGS } from '@/config/feature-flags'
import { ComingSoon } from '@/components/common/coming-soon' // Import ComingSoon
import { toast } from 'sonner'; // Import toast


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

interface BookingsClientContentProps {
  initialBookings: Booking[] | null;
}

export function BookingsClientContent({ initialBookings }: BookingsClientContentProps) {
  const t = useTranslations()
  const [bookings, setBookings] = useState<Booking[]>(initialBookings || [])
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!FEATURE_FLAGS.tableBooking) {
    return <ComingSoon featureName="AdminNav.admin_bookings_title" />;
  }

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  const handleUpdateStatus = async (bookingId: string, status: 'confirmed' | 'canceled') => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}?bookingId=${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updatedBooking = await res.json(); // Assuming API returns updated booking
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: updatedBooking.booking.status } : b));
        if (selectedBooking?.id === bookingId) setSelectedBooking({ ...selectedBooking, status: updatedBooking.booking.status });
        toast.success(t('AdminBookings.notifications.update_success'));
        if (status === 'confirmed' || status === 'canceled') setIsDetailModalOpen(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(t('AdminBookings.notifications.update_failed', { error: errorData.message || 'Unknown error' }));
      }
    } catch (e) {
      toast.error(t('AdminBookings.notifications.update_failed', { error: e instanceof Error ? e.message : 'Unknown error' }));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300',
      confirmed: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300',
      canceled: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300'
    }
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>{t(`Bookings.status.${status}`)}</span>
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">{t('AdminNav.admin_bookings_title')}</h2>

      {bookings.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarX className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
            {t('AdminBookings.empty_state.title')}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t('AdminBookings.empty_state.description')}
          </p>
        </Card>
      ) : (
        <Card className="p-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                <tr>
                  {['customer_name','contact','date_time','party_size','status','actions'].map(col => (
                    <th key={col} className="px-4 py-3">{t(`AdminBookings.table.${col}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(booking => (
                  <tr key={booking.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                    <td className="px-4 py-3 font-medium">{booking.customerName}</td>
                    <td className="px-4 py-3">{booking.contact}</td>
                    <td className="px-4 py-3">{booking.date} @ {booking.time}</td>
                    <td className="px-4 py-3 text-center">{booking.partySize}</td>
                    <td className="px-4 py-3">{statusBadge(booking.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => handleViewDetails(booking)}>
                        <Eye className="h-4 w-4 mr-1" />
                      {t('Common.view_details')}</Button>
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
            <DialogTitle>{t('AdminBookings.details_title')}</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-2">
              <p><strong>{t('AdminBookings.table.customer_name')}:</strong> {selectedBooking.customerName}</p>
              <p><strong>{t('AdminBookings.table.contact')}:</strong> {selectedBooking.contact}</p>
              <p><strong>{t('AdminBookings.table.date_time')}:</strong> {selectedBooking.date} @ {selectedBooking.time}</p>
              <p><strong>{t('AdminBookings.table.party_size')}:</strong> {selectedBooking.partySize}</p>
              <p><strong>{t('AdminBookings.table.status')}:</strong> {statusBadge(selectedBooking.status)}</p>
              {/* TODO: Display preOrderItems if available and structure is known */}
              {selectedBooking.preOrderItems?.length === 0 && <p className="text-sm mt-2 text-slate-500">{t('AdminBookings.no_preorder_items')}</p>}

            </div>
          )}
           <DialogFooter className="mt-6">
            {selectedBooking && selectedBooking.status === 'pending' && (
              <>
                <Button variant="outline" onClick={() => handleUpdateStatus(selectedBooking.id, 'canceled')} disabled={isUpdatingStatus}>
                  {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('Common.cancel_booking')}
                </Button>
                <Button variant="default" onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')} disabled={isUpdatingStatus}>
                  {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('Common.confirm_booking')}
                </Button>
              </>
            )}
             <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>{t('Common.close_modal')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
