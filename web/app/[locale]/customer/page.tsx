import { headers } from 'next/headers'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'
import { fetchMenuAndTables } from '@/lib/server/customer-data'
import { CustomerClientContent } from './customer-client-content'
import type { SessionData } from '@/components/features/customer/screens/types';


export default async function CustomerHomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tableId?: string; code?: string }> }) {
  const { locale } = await params
  const { tableId, code } = await searchParams
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

  let resolvedTableId = tableId

  const sessionData: SessionData = { sessionStatus: 'new', canAddItems: false }

  if (code && subdomain) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/public/session-by-code?code=${encodeURIComponent(code)}&subdomain=${subdomain}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json() as { tableId: string; activeSessionId?: string; requirePasscode: boolean }
        resolvedTableId = data.tableId
        if (data.activeSessionId) {
          sessionData.pendingSessionId = data.activeSessionId
          sessionData.requirePasscode = data.requirePasscode
          sessionData.sessionStatus = 'join'
        }
      } else {
        sessionData.sessionStatus = 'invalid'
      }
    } catch {
      sessionData.sessionStatus = 'invalid'
    }
  }
  if (resolvedTableId && subdomain && sessionData.sessionStatus !== 'invalid') {
    const table = tables.find(t => t.id === resolvedTableId)
    if (table) {
      sessionData.tableNumber = table.name
    } else if (!code) {
      sessionData.sessionStatus = 'invalid'
    }
  }

  return (
    <CustomerClientContent
      restaurantSettings={restaurantSettings}
      categories={categories}
      tables={tables}
      tableId={resolvedTableId}
      sessionData={sessionData}
    />
  )
}
