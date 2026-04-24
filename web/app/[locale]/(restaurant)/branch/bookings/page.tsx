import { setRequestLocale } from 'next-intl/server'
import { BookingsClientContent } from './bookings-client-content'

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <BookingsClientContent />
    </div>
  );
}
