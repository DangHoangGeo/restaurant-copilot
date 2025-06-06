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
  return <BookingsClientContent restaurantSettings={restaurantSettings ?? { name: 'Restaurant', logoUrl: null }} />
}
