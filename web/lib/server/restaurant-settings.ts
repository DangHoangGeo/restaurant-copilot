import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

export async function getRestaurantSettingsFromSubdomain(subdomain: string) {
  if (!subdomain) return null;
  
  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, logo_url, subdomain, brand_color, default_language')
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      console.error(`Error fetching restaurant by subdomain ${subdomain}:`, error.message);
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
    console.error(`Exception fetching restaurant by subdomain ${subdomain}:`, e);
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
      console.error(`Error fetching restaurant ID for subdomain ${subdomain}:`, error.message);
      return null;
    }
    return data?.id || null;
  } catch (e) {
    console.error(`Exception fetching restaurant ID for subdomain ${subdomain}:`, e);
    return null;
  }
}
