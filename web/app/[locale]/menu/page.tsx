import { headers } from 'next/headers'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { getRestaurantIdFromSubdomain, getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'
import { fetchMenuAndTables } from '@/lib/server/customer-data'
import { CustomerClientContent } from './menu-client-content'
import type { SessionData } from '@/components/features/customer/screens/types';
import { supabaseAdmin } from '@/lib/supabaseAdmin'


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

  let resolvedTableId = tableId

  const sessionData: SessionData = { sessionStatus: 'new', canAddItems: false }
  
  if (code && subdomain) {
    try {
      const host = (await headers()).get("host") || "";
	      const subdomain = getSubdomainFromHost(host);
        const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;
      const req = await supabaseAdmin.rpc('get_table_session_by_code', {
        input_code: code,
        input_restaurant_id: restaurantId
      })
      const { data, error } = req
      if (error) {
        sessionData.sessionStatus = 'invalid'
      }else{
        const row = data[0] as {
          table_id: string;
          restaurant_id: string;
          activeSessionId: string | null;
          requirePasscode: boolean;
        }
        resolvedTableId = row.table_id
        if (row.activeSessionId) {
          sessionData.pendingSessionId = row.activeSessionId
          sessionData.requirePasscode = row.requirePasscode
          sessionData.sessionStatus = 'join'
        }
      } 
    } catch (error) {
      sessionData.sessionStatus = 'invalid'
    }
  }

  const { categories, tables } = subdomain
    ? await fetchMenuAndTables(subdomain)
    : { categories: [], tables: [] }

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
