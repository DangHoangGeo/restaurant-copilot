import { headers } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'
import { TablesClientContent } from './tables-client-content'
import { getRestaurantIdFromSubdomain } from '@/lib/server/restaurant-settings'
import { getTranslations } from 'next-intl/server'

export default async function TablesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const host = (await headers()).get('host') || ''
  const subdomain = getSubdomainFromHost(host)
  const t = await getTranslations({ locale, namespace: 'AdminTables' })

  const restaurantSettings = subdomain ? await getRestaurantSettingsFromSubdomain(subdomain) : null
  let restaurantId: string | null = null

  if (subdomain) {
    restaurantId = await getRestaurantIdFromSubdomain(subdomain)
  }

  if (!restaurantId) {
    return (
      <TablesClientContent
        restaurantSettings={restaurantSettings ?? { name: 'Restaurant', logoUrl: null }}
        initialData={null}
        error={t('errors.restaurant_not_found')}
      />
    )
  }

  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
    const apiUrl = `${baseUrl}/api/v1/tables`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to fetch tables')
    }

    const { tables } = await response.json()

    return (
      <TablesClientContent
        restaurantSettings={restaurantSettings ?? { name: 'Restaurant', logoUrl: null }}
        initialData={tables}
        error={null}
      />
    )
  } catch (error) {
    console.error('Error fetching tables data:', error)
    return (
      <TablesClientContent
        restaurantSettings={restaurantSettings ?? { name: 'Restaurant', logoUrl: null }}
        initialData={null}
        error={t('errors.data_fetch_error')}
      />
    )
  }
}
