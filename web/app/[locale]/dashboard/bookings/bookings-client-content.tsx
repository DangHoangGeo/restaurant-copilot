'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Eye } from 'lucide-react'

const MOCK_BOOKINGS_BASE = [
  { id: 'book1', customerName: 'David Lee', contact: 'david@example.com', date: '2024-07-20', time: '19:00', partySize: 4, status: 'pending', preOrderItems: [] },
  { id: 'book2', customerName: 'Sarah Chen', contact: '555-0202', date: '2024-07-21', time: '18:30', partySize: 2, status: 'confirmed', preOrderItems: [] },
  { id: 'book3', customerName: 'Mike Brown', contact: 'mike@example.com', date: '2024-07-22', time: '20:00', partySize: 5, status: 'canceled', preOrderItems: [] }
]

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
  restaurantSettings: {
    name: string;
    logoUrl: string | null;
    subdomain?: string;
    primaryColor?: string;
    defaultLocale?: string;
  };
}

export function BookingsClientContent({ restaurantSettings }: BookingsClientContentProps) {
  const t = useTranslations()
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS_BASE)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  if (!process.env.NEXT_PUBLIC_FEATURE_TABLEBOOKING) {
    console.warn('Table booking feature is not enabled.',restaurantSettings.name)
    return <Card className="p-4">Coming soon</Card>
  }

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  const handleUpdateStatus = (bookingId: string, status: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    if (selectedBooking?.id === bookingId) setSelectedBooking({ ...selectedBooking, status })
    if (status === 'confirmed' || status === 'canceled') setIsDetailModalOpen(false)
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
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('AdminBookings.details_title')}</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div>
              <p><strong>{t('AdminBookings.table.customer_name')}:</strong> {selectedBooking.customerName}</p>
              <p><strong>{t('AdminBookings.table.contact')}:</strong> {selectedBooking.contact}</p>
              <p><strong>{t('AdminBookings.table.date_time')}:</strong> {selectedBooking.date} @ {selectedBooking.time}</p>
              <p><strong>{t('AdminBookings.table.party_size')}:</strong> {selectedBooking.partySize}</p>
              <p><strong>{t('AdminBookings.table.status')}:</strong> {statusBadge(selectedBooking.status)}</p>
              {selectedBooking.preOrderItems.length === 0 && <p className="text-sm mt-2 text-slate-500">{t('AdminBookings.no_preorder_items')}</p>}
              {selectedBooking.status === 'pending' && (
                <div className="mt-6 flex justify-end space-x-2">
                  <Button onClick={() => handleUpdateStatus(selectedBooking.id, 'canceled')}>{t('Common.cancel_booking')}</Button>
                  <Button variant="secondary" onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}>{t('Common.confirm_booking')}</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
