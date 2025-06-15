import { headers } from 'next/headers'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'
import { fetchMenuAndTables } from '@/lib/server/customer-data'
import { BookingClientContent } from './booking-client-content'

export default async function BookingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'Customer.common' })
  
  const host = (await headers()).get('host') || ''
  const subdomain = getSubdomainFromHost(host)
  const restaurantSettings = subdomain ? await getRestaurantSettingsFromSubdomain(subdomain) : null
  
  // If no restaurant found, show error
  if (!restaurantSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('restaurant_not_found')}</h1>
          <p className="text-gray-600">{t('restaurant_not_found')}</p>
        </div>
      </div>
    )
  }

  const { categories, tables } = subdomain
    ? await fetchMenuAndTables(subdomain)
    : { categories: [], tables: [] }

  return (
    <BookingClientContent
      restaurantSettings={restaurantSettings}
      categories={categories}
      tables={tables}
    />
  )
}
