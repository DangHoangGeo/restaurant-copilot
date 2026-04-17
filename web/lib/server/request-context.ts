// Request-scoped cache for user and restaurant context
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { AuthUser } from './getUserFromRequest';
import { ACTIVE_BRANCH_COOKIE } from './organizations/active-branch';

// Cache the user data for the duration of the request.
//
// Active-branch override (Phase 2):
//   Multi-branch org members can switch their active branch via the
//   x-coorder-active-branch cookie.  After resolving the base restaurantId from
//   users.restaurant_id, this function checks if the cookie is set to a different
//   restaurant the user is authorised to access.  If so, the cookie value becomes
//   the effective restaurantId for this request.
//
//   Validation uses the is_org_member_for_restaurant() DB function (SECURITY DEFINER,
//   reads auth.uid()) so the check is RLS-safe and a single round-trip.
export const getCachedUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();

  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !supabaseUser) {
    return null;
  }

  try {
    // Single query: join users → restaurants to avoid two sequential round-trips.
    // Select all restaurant fields needed by the layout so getRestaurantSettingsFromSubdomain
    // does not need to make a separate DB call.
    const { data: userRecords, error: userRecordError } = await supabase
      .from('users')
      .select('restaurant_id, role, restaurants(id, name, logo_url, subdomain, branch_code, brand_color, default_language, onboarded, owner_photo_url, owner_story_en, owner_story_ja, owner_story_vi, is_verified, is_active, suspended_at)')
      .eq('id', supabaseUser.id);

    if (userRecordError || !userRecords || userRecords.length === 0) {
      return {
        userId: supabaseUser.id,
        email: supabaseUser.email,
        restaurantId: supabaseUser.app_metadata?.restaurant_id || null,
        subdomain: null,
        role: supabaseUser.app_metadata?.role || null,
        restaurantSettings: null,
      };
    }

    if (userRecords.length > 1) {
      console.warn(`Multiple user records found for user ${supabaseUser.id} (${userRecords.length} records) - using first record`);
    }

    const userRecord = userRecords[0];

    // restaurants is a related row returned as an object (or array with one entry)
    const primaryRestaurant = Array.isArray(userRecord.restaurants)
      ? userRecord.restaurants[0]
      : userRecord.restaurants;

    // Type the joined restaurant row (Supabase returns it as a nested object)
    type RestaurantRow = {
      id: string;
      name: string;
      logo_url: string | null;
      subdomain: string;
      branch_code?: string | null;
      brand_color: string | null;
      default_language: string | null;
      onboarded: boolean | null;
      owner_photo_url: string | null;
      owner_story_en: string | null;
      owner_story_ja: string | null;
      owner_story_vi: string | null;
      is_verified: boolean;
      is_active: boolean;
      suspended_at: string | null;
    } | null;

    let restaurantId: string | null =
      userRecord?.restaurant_id ?? supabaseUser.app_metadata?.restaurant_id ?? null;
    let subdomain: string | null = (primaryRestaurant as RestaurantRow)?.subdomain ?? null;

    // Build restaurant settings from the already-joined row (no extra DB call).
    let restaurantSettings = primaryRestaurant
      ? buildRestaurantSettings(primaryRestaurant as RestaurantRow)
      : null;

    // ── Approval / suspension guard for owner accounts ────────────────────────
    // Owner APIs rely on a valid restaurantId to enforce RLS. If the restaurant
    // is not yet verified, has been deactivated, or is suspended, nulling out
    // restaurantId prevents those APIs from proceeding without a hard sign-out.
    const role = userRecord?.role ?? supabaseUser.app_metadata?.role ?? null;
    if (role === 'owner' && primaryRestaurant) {
      const row = primaryRestaurant as RestaurantRow & { is_verified: boolean; is_active: boolean; suspended_at: string | null };
      const blocked = row.suspended_at != null || !row.is_verified || !row.is_active;
      if (blocked) {
        restaurantId = null;
      }
    }

    // ── Active-branch cookie override ─────────────────────────────────────────
    // If the user has set an active-branch cookie pointing to a *different*
    // restaurant than their base restaurant_id, validate it and, if valid, use
    // it as the effective restaurantId for this request.
    const cookieStore = await cookies();
    const activeBranchCookie = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value;

    if (activeBranchCookie && activeBranchCookie !== restaurantId) {
      // is_org_member_for_restaurant() checks both all_shops scope and
      // selected_shops rows in a single SECURITY DEFINER call.
      const { data: hasAccess } = await supabase.rpc('is_org_member_for_restaurant', {
        p_restaurant_id: activeBranchCookie,
      });

      if (hasAccess === true) {
        restaurantId = activeBranchCookie;
        // Fetch the active branch's full settings so downstream callers have
        // everything they need (subdomain, name, logo, etc.) without an extra query.
        const { data: activeBranchRow } = await supabaseAdmin
          .from('restaurants')
          .select('id, name, logo_url, subdomain, branch_code, brand_color, default_language, onboarded, owner_photo_url, owner_story_en, owner_story_ja, owner_story_vi')
          .eq('id', activeBranchCookie)
          .single();
        subdomain = activeBranchRow?.subdomain ?? null;
        restaurantSettings = activeBranchRow
          ? buildRestaurantSettings(activeBranchRow as RestaurantRow)
          : null;
      }
      // If validation fails (access revoked, stale cookie), fall through to
      // the base restaurantId — the stale cookie is silently ignored.
    }

    if (restaurantId && restaurantSettings) {
      const { data: orgLink } = await supabaseAdmin
        .from('organization_restaurants')
        .select('owner_organizations(public_subdomain)')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      const ownerOrganization = Array.isArray(orgLink?.owner_organizations)
        ? orgLink?.owner_organizations[0]
        : orgLink?.owner_organizations;

      restaurantSettings = {
        ...restaurantSettings,
        company_public_subdomain: ownerOrganization?.public_subdomain ?? null,
      };
    }

    return {
      userId: supabaseUser.id,
      email: supabaseUser.email,
      restaurantId,
      subdomain,
      role: userRecord?.role ?? supabaseUser.app_metadata?.role ?? null,
      restaurantSettings,
    };
  } catch (error) {
    console.error('Error in getCachedUser:', error);
    return {
      userId: supabaseUser.id,
      email: supabaseUser.email,
      restaurantId: supabaseUser.app_metadata?.restaurant_id || null,
      subdomain: null,
      role: supabaseUser.app_metadata?.role || null,
      restaurantSettings: null,
    };
  }
});

function buildRestaurantSettings(row: {
  id: string;
  name: string;
  logo_url: string | null;
  subdomain: string;
  branch_code?: string | null;
  brand_color: string | null;
  default_language: string | null;
  onboarded: boolean | null;
  owner_photo_url: string | null;
  owner_story_en: string | null;
  owner_story_ja: string | null;
  owner_story_vi: string | null;
  is_verified?: boolean;
  is_active?: boolean;
  suspended_at?: string | null;
} | null) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    subdomain: row.subdomain,
    branch_code: row.branch_code ?? null,
    company_public_subdomain: null,
    primaryColor: row.brand_color || '#3B82F6',
    defaultLocale: row.default_language || 'en',
    onboarded: row.onboarded || false,
    owner_photo_url: row.owner_photo_url || null,
    owner_story_en: row.owner_story_en || '',
    owner_story_ja: row.owner_story_ja || '',
    owner_story_vi: row.owner_story_vi || '',
  };
}

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
