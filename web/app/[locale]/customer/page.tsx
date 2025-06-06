import { headers } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'
import { fetchMenuAndTables } from '@/lib/server/customer-data'
import { CustomerClientContent } from './customer-client-content'

export default async function CustomerHomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tableId?: string }> }) {
  const { locale } = await params
  const { tableId } = await searchParams
  setRequestLocale(locale)
  const host = (await headers()).get('host') || ''
  const subdomain = getSubdomainFromHost(host)
  const restaurantSettings = subdomain ? await getRestaurantSettingsFromSubdomain(subdomain) : null
  const { categories, tables } = subdomain
    ? await fetchMenuAndTables(subdomain)
    : { categories: [], tables: [] }
  return (
    <CustomerClientContent
      restaurantSettings={restaurantSettings ?? { name: 'Restaurant', logoUrl: null }}
      categories={categories}
      tables={tables}
      tableId={tableId}
    />
  )
}
