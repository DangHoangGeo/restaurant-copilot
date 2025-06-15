import 'server-only'
import { getCachedMenuData, getCachedTablesData } from './request-context'
import { getRestaurantIdFromSubdomain } from './restaurant-settings'
import { MenuItem, Category as MenuCategory } from '@/shared/types/menu'
import { logger, startPerformanceTimer, endPerformanceTimer } from '@/lib/logger'

// Re-export types for this module
export type { MenuItem, MenuCategory }

export async function fetchMenuAndTables(subdomain: string) {
  const restaurantId = await getRestaurantIdFromSubdomain(subdomain)
  if (!restaurantId) {
    await logger.warn('fetchMenuAndTables', 'No restaurant ID found for subdomain', { subdomain })
    return { categories: [], tables: [] }
  }

  const requestId = `fetchMenuAndTables-${Date.now()}-${Math.random()}`
  startPerformanceTimer(requestId)
  
  try {
    // Use cached data to prevent duplicate queries within the same request
    const [categories, tables] = await Promise.all([
      getCachedMenuData(restaurantId),
      getCachedTablesData(restaurantId)
    ])

    await endPerformanceTimer(
      requestId,
      'fetchMenuAndTables',
      restaurantId
    )

    return {
      categories: categories || [],
      tables: tables || []
    }
  } catch (error) {
    await logger.error('fetchMenuAndTables', 'Failed to fetch menu and tables', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      restaurantId, 
      subdomain 
    }, restaurantId)
    return { categories: [], tables: [] }
  }
}
