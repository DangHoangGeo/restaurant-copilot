import { headers } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'
import { fetchMenuAndTables } from '@/lib/server/customer-data'
import { CustomerClientContent } from './customer-client-content'

interface SessionData {
  sessionId?: string;
  tableNumber?: string;
  sessionStatus: 'valid' | 'expired' | 'invalid' | 'new';
  canAddItems: boolean;
  orderId?: string;
  isNewSession?: boolean;
}

async function validateTableAndCreateSession(tableId: string, subdomain: string): Promise<SessionData> {
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = process.env.VERCEL_URL || `${subdomain}.localhost:3000`
    const baseUrl = `${protocol}://${host}`
    
    console.log(`Validating table ${tableId} for subdomain ${subdomain}`);
    
    const response = await fetch(`${baseUrl}/api/v1/sessions/create?tableId=${tableId}`, {
      headers: {
        'host': host
      }
    })
    
    if (!response.ok) {
      console.error('Session creation failed:', response.status, response.statusText);
      return { sessionStatus: 'invalid', canAddItems: false }
    }
    
    const data = await response.json()
    console.log('Session creation response:', data);
    
    if (data.success) {
      return {
        sessionId: data.sessionId,
        tableNumber: data.tableNumber,
        sessionStatus: 'valid',
        canAddItems: true,
        orderId: data.orderId,
        isNewSession: data.isNewSession
      }
    }
    
    return { sessionStatus: 'invalid', canAddItems: false }
  } catch (error) {
    console.error('Session creation error:', error)
    return { sessionStatus: 'invalid', canAddItems: false }
  }
}

export default async function CustomerHomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tableId?: string }> }) {
  const { locale } = await params
  const { tableId } = await searchParams
  setRequestLocale(locale)
  
  const host = (await headers()).get('host') || ''
  const subdomain = getSubdomainFromHost(host)
  const restaurantSettings = subdomain ? await getRestaurantSettingsFromSubdomain(subdomain) : null
  
  // If no restaurant found, show error
  if (!restaurantSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Restaurant Not Found</h1>
          <p className="text-gray-600">The restaurant subdomain is invalid or not configured.</p>
        </div>
      </div>
    )
  }

  let sessionData: SessionData = { sessionStatus: 'new', canAddItems: false }
  
  // If tableId is provided, validate table and create/get session
  if (tableId && subdomain) {
    sessionData = await validateTableAndCreateSession(tableId, subdomain)
  }

  const { categories, tables } = subdomain
    ? await fetchMenuAndTables(subdomain)
    : { categories: [], tables: [] }

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
