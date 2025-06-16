import { headers } from 'next/headers'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'
import { fetchMenuAndTables } from '@/lib/server/customer-data'
import { CustomerClientContent } from './menu-client-content'
import type { SessionData } from '@/components/features/customer/screens/types'
import { supabaseAdmin } from '@/lib/supabaseAdmin'


export default async function CustomerHomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tableId?: string; code?: string; sessionId?: string }> }) {
  const { locale } = await params
  const { code, sessionId } = await searchParams
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

  let resolvedTableId = null
  const sessionData: SessionData = { sessionStatus: 'new', canAddItems: false }
  
  // Handle existing sessionId parameter (direct session access)
  if (sessionId && subdomain) {
    try {
      //const restaurantId = await getRestaurantIdFromSubdomain(subdomain);
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(`
          id,
          session_id,
          status,
          table_id,
          guest_count,
          tables (
            name
          )
        `)
        .eq("session_id", sessionId)
        .eq("restaurant_id", restaurantSettings.id)
        .single();

      if (error || !data) {
        console.error('Error fetching session data:', error)
        sessionData.sessionStatus = 'invalid'
      } else {
        resolvedTableId = data.table_id
        sessionData.sessionId = data.session_id
        sessionData.sessionStatus = data.status === 'completed' ? 'expired' : 'active'
        sessionData.canAddItems = data.status !== 'completed' && data.status !== 'cancelled' && data.status !== 'expired'
        sessionData.tableNumber = data.tables?.[0]?.name
        sessionData.guestCount = data.guest_count
        sessionData.orderId = data.id
      }
    } catch (error) {
      console.error('Error fetching session data:', error)
      sessionData.sessionStatus = 'invalid'
    }
  }
  // Handle QR code scanning (code parameter)
  else if (code && subdomain) {
    try {
      const req = await supabaseAdmin.rpc('get_table_session_by_code', {
        input_code: code,
        input_restaurant_id: restaurantSettings.id
      })
      const { data, error } = req
      if (error) {
        sessionData.sessionStatus = 'invalid'
      } else {
        const row = data[0] as {
          table_id: string;
          restaurant_id: string;
          active_session_id: string | null;
          require_passcode: boolean;
        }
        resolvedTableId = row.table_id
        if (row.active_session_id) {
          sessionData.pendingSessionId = row.active_session_id
          sessionData.requirePasscode = row.require_passcode
          sessionData.sessionStatus = 'join'
        }
      } 
    } catch (error) {
      console.error('Error fetching session data by code:', error)
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
    } else if (!code && !sessionId) {
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