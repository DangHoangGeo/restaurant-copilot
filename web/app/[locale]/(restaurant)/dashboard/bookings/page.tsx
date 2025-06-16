import { setRequestLocale } from 'next-intl/server'
import { BookingsClientContent } from './bookings-client-content'

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  
  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <BookingsClientContent />
    </div>
  );
}
