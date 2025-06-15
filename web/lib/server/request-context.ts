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

// Cache configuration from environment variables
const CACHE_MENU_DURATION = parseInt(process.env.CACHE_MENU_DURATION || '300') * 1000; // 5 minutes default
const CACHE_RESTAURANT_DURATION = parseInt(process.env.CACHE_RESTAURANT_DURATION || '3600') * 1000; // 1 hour default
const CACHE_USER_DURATION = parseInt(process.env.CACHE_USER_DURATION || '1800') * 1000; // 30 minutes default

// In-memory cache for cross-request caching (for production optimization)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttl: number = CACHE_MENU_DURATION): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const memoryCache = new MemoryCache();

// Cache invalidation functions
export function invalidateMenuCache(restaurantId: string): void {
  memoryCache.invalidate(`menu:${restaurantId}`);
  memoryCache.invalidate(`tables:${restaurantId}`);
  memoryCache.invalidate(`restaurant:${restaurantId}`);
}

export function invalidateRestaurantCache(restaurantId: string): void {
  memoryCache.invalidate(`restaurant:${restaurantId}`);
}

export function invalidateUserCache(userId: string): void {
  memoryCache.invalidate(`user:${userId}`);
}

export function clearAllCache(): void {
  memoryCache.clear();
}

// Enhanced cache functions with cross-request caching (for future use)
export function getCachedWithMemory<T>(
  key: string, 
  fetchFn: () => Promise<T>, 
  ttl: number = CACHE_MENU_DURATION
): Promise<T> {
  // Try memory cache first
  const cached = memoryCache.get<T>(key);
  if (cached) {
    return Promise.resolve(cached);
  }

  // Use React cache for request-scoped caching and update memory cache
  return cache(async () => {
    const result = await fetchFn();
    memoryCache.set(key, result, ttl);
    return result;
  })();
}

// Helper to get appropriate TTL for different data types
export function getCacheTTL(type: 'user' | 'restaurant' | 'menu'): number {
  switch (type) {
    case 'user':
      return CACHE_USER_DURATION;
    case 'restaurant':
      return CACHE_RESTAURANT_DURATION;
    case 'menu':
      return CACHE_MENU_DURATION;
    default:
      return CACHE_MENU_DURATION;
  }
}
