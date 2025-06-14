import 'server-only'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getRestaurantIdFromSubdomain } from './restaurant-settings'
import { MenuItem, Category as MenuCategory } from '@/shared/types/menu'

// Re-export types for this module
export type { MenuItem, MenuCategory }



export async function fetchMenuAndTables(subdomain: string) {
  const restaurantId = await getRestaurantIdFromSubdomain(subdomain)
  if (!restaurantId) return { categories: [], tables: [] }
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select(
      `id, position, name_en, name_ja, name_vi,
         menu_items(
           id,name_en,name_ja,name_vi,description_en,description_ja,description_vi,price,image_url,available,weekday_visibility,position,
           menu_item_sizes(id,size_key,name_en,name_ja,name_vi,price,position),
           toppings(id,name_en,name_ja,name_vi,price,position)
         )`
    )
    .eq('restaurant_id', restaurantId)
    .order('position', { ascending: true })
    .order('position', { foreignTable: 'menu_items', ascending: true })
    .order('position', { foreignTable: 'menu_items.menu_item_sizes', ascending: true }) // Order for menu_item_sizes
    .order('position', { foreignTable: 'menu_items.toppings', ascending: true });     // Order for toppings

  const { data: tables } = await supabaseAdmin
    .from('tables')
    .select('id,name,status,is_outdoor,is_accessible, notes,capacity')
    .eq('restaurant_id', restaurantId)
    .order('name')

  return {
    categories: categories || [],
    tables: tables || []
  }
}
