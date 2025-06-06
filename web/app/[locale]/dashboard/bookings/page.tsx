import { headers } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'
import { BookingsClientContent } from './bookings-client-content'

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const host = (await headers()).get('host') || ''
  const subdomain = getSubdomainFromHost(host)
  const restaurantSettings = subdomain ? await getRestaurantSettingsFromSubdomain(subdomain) : null

  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
  const apiUrl = `${baseUrl}/api/v1/bookings`
  let initialBookings = null
  try {
    const res = await fetch(apiUrl, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      initialBookings = data.bookings
    }
  } catch (e) {
    console.error('Failed to fetch bookings', e)
  }

  return (
    <BookingsClientContent
      restaurantSettings={restaurantSettings ?? { name: 'Restaurant', logoUrl: null }}
      initialBookings={initialBookings}
    />
  )
}
