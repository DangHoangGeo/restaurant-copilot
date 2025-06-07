import 'server-only'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getRestaurantIdFromSubdomain } from './restaurant-settings'

export interface MenuItem {
  id: string
  name_en: string
  name_ja: string
  name_vi: string
  description_en: string | null
  description_ja: string | null
  description_vi: string | null
  price: number
  image_url: string | null
  available: boolean
  weekday_visibility: number[]
}

export interface MenuCategory {
  id: string
  position: number
  name_en: string
  name_ja: string
  name_vi: string
  menu_items: MenuItem[]
}

export interface TableInfo {
  id: string
  name: string
  position_x: number | null
  position_y: number | null
  capacity: number | null
}

export async function fetchMenuAndTables(subdomain: string) {
  const restaurantId = await getRestaurantIdFromSubdomain(subdomain)
  if (!restaurantId) return { categories: [], tables: [] }
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select(
      `id, position, name_en, name_ja, name_vi,
       menu_items(id,name_en,name_ja,name_vi,description_en,description_ja,description_vi,price,image_url,available,weekday_visibility)`
    )
    .eq('restaurant_id', restaurantId)
    .order('position', { ascending: true })
    .order('position', { foreignTable: 'menu_items', ascending: true })

  const { data: tables } = await supabaseAdmin
    .from('tables')
    .select('id,name,position_x,position_y,capacity')
    .eq('restaurant_id', restaurantId)
    .order('name')

  return {
    categories: categories || [],
    tables: tables || []
  }
}
