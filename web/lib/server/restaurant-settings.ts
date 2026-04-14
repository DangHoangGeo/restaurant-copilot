import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { RestaurantSettings } from '@/shared/types/customer';

export async function getRestaurantSettingsFromSubdomain(subdomain: string) {
  if (!subdomain) return null;
  
  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, logo_url, subdomain, brand_color, default_language, onboarded, owner_photo_url, owner_story_en, owner_story_ja, owner_story_vi')
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      await logger.error('getRestaurantSettingsFromSubdomain', 'Error fetching restaurant by subdomain', {
        subdomain,
        error: error.message
      });
      return null;
    }
    if (!restaurant) {
      return null;
    }
    return {
      id: restaurant.id,
      name: restaurant.name,
      logoUrl: restaurant.logo_url,
      subdomain: restaurant.subdomain,
      primaryColor: restaurant.brand_color || '#3B82F6',
      defaultLocale: restaurant.default_language || 'en',
      onboarded: restaurant.onboarded || false,
      owner_photo_url: restaurant.owner_photo_url || null,
      owner_story_en: restaurant.owner_story_en || '',
      owner_story_ja: restaurant.owner_story_ja || '',
      owner_story_vi: restaurant.owner_story_vi || ''
    };
  } catch (e) {
    await logger.error('getRestaurantSettingsFromSubdomain', 'Exception fetching restaurant by subdomain', {
      subdomain,
      error: e instanceof Error ? e.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Fetches the full set of customer-facing restaurant settings for a given subdomain.
 * Used by the customer layout server component to pre-populate CustomerDataContext,
 * eliminating the client-side fetch that previously caused a skeleton flash on every page.
 */
export async function getCustomerRestaurantFromSubdomain(
  subdomain: string
): Promise<RestaurantSettings | null> {
  if (!subdomain) return null;

  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, logo_url, subdomain, brand_color, default_language, address, phone, email, website, description_en, description_ja, description_vi, opening_hours, timezone')
      .eq('subdomain', subdomain)
      .single();

    if (error || !restaurant) {
      await logger.error('getCustomerRestaurantFromSubdomain', 'Error fetching customer restaurant', {
        subdomain,
        error: error?.message,
      });
      return null;
    }

    let parsedOpeningHours: Record<string, string> | undefined = undefined;
    try {
      if (restaurant.opening_hours && typeof restaurant.opening_hours === 'string') {
        parsedOpeningHours = JSON.parse(restaurant.opening_hours);
      } else if (restaurant.opening_hours) {
        parsedOpeningHours = restaurant.opening_hours as Record<string, string>;
      }
    } catch {
      parsedOpeningHours = undefined;
    }

    return {
      id: restaurant.id,
      name: restaurant.name,
      subdomain: restaurant.subdomain,
      logoUrl: restaurant.logo_url,
      primaryColor: restaurant.brand_color || '#3B82F6',
      defaultLocale: restaurant.default_language || 'en',
      address: restaurant.address,
      phone: restaurant.phone,
      email: restaurant.email,
      website: restaurant.website,
      description_en: restaurant.description_en,
      description_ja: restaurant.description_ja,
      description_vi: restaurant.description_vi,
      opening_hours: parsedOpeningHours,
      timezone: restaurant.timezone,
    };
  } catch (e) {
    await logger.error('getCustomerRestaurantFromSubdomain', 'Exception fetching customer restaurant', {
      subdomain,
      error: e instanceof Error ? e.message : 'Unknown error',
    });
    return null;
  }
}

export async function getRestaurantIdFromSubdomain(subdomain: string): Promise<string | null> {
  if (!subdomain) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();
    
    if (error) {
      await logger.error('getRestaurantIdFromSubdomain', 'Error fetching restaurant ID for subdomain', {
        subdomain,
        error: error.message
      });
      return null;
    }
    return data?.id || null;
  } catch (e) {
    await logger.error('getRestaurantIdFromSubdomain', 'Exception fetching restaurant ID for subdomain', {
      subdomain,
      error: e instanceof Error ? e.message : 'Unknown error'
    });
    return null;
  }
}
