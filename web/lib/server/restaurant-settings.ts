import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient as createSupabaseServerClient } from '@/utils/supabase/server';

export async function getRestaurantSettingsFromSubdomain(subdomain: string) {
  if (!subdomain) return null;
  
  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('name, logo_url, subdomain, brand_color, default_language')
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
      name: restaurant.name,
      logoUrl: restaurant.logo_url,
      subdomain: restaurant.subdomain,
      primaryColor: restaurant.brand_color || '#3B82F6', // Default to Tailwind blue
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
    console.log(`Fetching restaurant ID for subdomain: ${subdomain}`);
    const supabase = createSupabaseServerClient();
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
