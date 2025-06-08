import { headers } from 'next/headers'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'
import { fetchMenuAndTables } from '@/lib/server/customer-data'
import { CustomerClientContent } from './customer-client-content'
import type { SessionData } from '@/components/features/customer/screens/types';


export default async function CustomerHomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tableId?: string }> }) {
  const { locale } = await params
  const { tableId } = await searchParams
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

  const sessionData: SessionData = { sessionStatus: 'new', canAddItems: false }

  if (tableId && subdomain) {
    const table = tables.find(t => t.id === tableId)
    if (table) {
      sessionData.tableNumber = table.name
    } else {
      sessionData.sessionStatus = 'invalid'
    }
  }

  return (
    <CustomerClientContent
      restaurantSettings={restaurantSettings}
      categories={categories}
      tables={tables}
      tableId={tableId}
      sessionData={sessionData}
    />
  )
}
