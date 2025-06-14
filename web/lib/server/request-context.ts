// Request-scoped cache for user and restaurant context
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { AuthUser } from './getUserFromRequest';

// Cache the user data for the duration of the request
export const getCachedUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  
  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !supabaseUser) {
    return null;
  }

  // Fetch user record and restaurant data in a single optimized query
  const { data: userRecord, error: userRecordError } = await supabase
    .from('users')
    .select(`
      restaurant_id,
      role,
      restaurants!inner(
        id,
        subdomain,
        name
      )
    `)
    .eq('id', supabaseUser.id)
    .single();

  if (userRecordError || !userRecord) {
    // Fallback to user metadata if record not found
    return {
      userId: supabaseUser.id,
      email: supabaseUser.email,
      restaurantId: supabaseUser.user_metadata?.restaurant_id || null,
      subdomain: null,
      role: supabaseUser.user_metadata?.role || null,
    };
  }

  return {
    userId: supabaseUser.id,
    email: supabaseUser.email,
    restaurantId: userRecord.restaurant_id,
    subdomain: userRecord.restaurants[0].subdomain,
    role: userRecord.role,
  };
});

// Cache restaurant context for the request
export const getCachedRestaurantContext = cache(async (subdomain: string) => {
  const supabase = await createClient();
  
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('id, name, subdomain')
    .eq('subdomain', subdomain)
    .single();
    
  if (error) {
    return null;
  }
    
  return restaurant;
});

// Cache menu data for a specific restaurant (request-scoped)
export const getCachedMenuData = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  
  const { data: categories, error } = await supabase
    .from('categories')
    .select(`
      id, position, name_en, name_ja, name_vi,
      menu_items(
        id, name_en, name_ja, name_vi, description_en, description_ja, description_vi,
        price, image_url, available, weekday_visibility, position,
        menu_item_sizes(id, size_key, name_en, name_ja, name_vi, price, position),
        toppings(id, name_en, name_ja, name_vi, price, position)
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('position', { ascending: true })
    .order('position', { foreignTable: 'menu_items', ascending: true });

  if (error) {
    return [];
  }

  return categories || [];
});

// Cache tables data for a specific restaurant (request-scoped)
export const getCachedTablesData = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  
  const { data: tables, error } = await supabase
    .from('tables')
    .select('id, name, status, is_outdoor, is_accessible, notes, capacity')
    .eq('restaurant_id', restaurantId)
    .order('name');

  if (error) {
    return [];
  }

  return tables || [];
});

// Cache restaurant settings (request-scoped)
export const getCachedRestaurantSettings = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  
  const { data: settings, error } = await supabase
    .from('restaurants')
    .select('name, logo_url, default_language, brand_color')
    .eq('id', restaurantId)
    .single();

  if (error) {
    return null;
  }

  return settings;
});
