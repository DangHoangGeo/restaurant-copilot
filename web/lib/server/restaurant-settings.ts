import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function getRestaurantSettingsFromSubdomain(subdomain: string) {
  if (!subdomain) return null;
  
  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, logo_url, subdomain, brand_color, default_language')
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
    };
  } catch (e) {
    await logger.error('getRestaurantSettingsFromSubdomain', 'Exception fetching restaurant by subdomain', {
      subdomain,
      error: e instanceof Error ? e.message : 'Unknown error'
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
