import { setRequestLocale } from 'next-intl/server'
import { BookingClientContent } from './booking-client-content'

export default async function BookingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  
  return (
    <div className="min-h-screen bg-gray-50">
      <BookingClientContent />
    </div>
  )
}
