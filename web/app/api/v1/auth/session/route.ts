import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Get additional user profile information
    const supabase = await createClient();
    
    // Fetch user details from the users table - handle potential duplicates
    const { data: userProfiles, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, role, restaurant_id')
      .eq('id', user.userId);

    if (profileError || !userProfiles || userProfiles.length === 0) {
      console.error('Error fetching user profile:', profileError);
      // Return basic user info if profile fetch fails
      return NextResponse.json({ 
        authenticated: true, 
        user: {
          id: user.userId,
          email: user.email,
          restaurantId: user.restaurantId,
          subdomain: user.subdomain,
          role: user.role
        }
      });
    }

    if (userProfiles.length > 1) {
      console.warn(`Multiple user profiles found for user ${user.userId} (${userProfiles.length} records) - using first record`);
    }

    // Use the first record (or only record if there's just one)
    const userProfile = userProfiles[0];

    // Fetch restaurant information for the effective branch context.
    let restaurant = null;
    if (user.restaurantId) {
      const { data: restaurantData, error: restaurantError } = await supabaseAdmin
        .from('restaurants')
        .select('id, name, subdomain, logo_url, brand_color, default_language, onboarded')
        .eq('id', user.restaurantId)
        .single();

      if (!restaurantError && restaurantData) {
        restaurant = {
          id: restaurantData.id,
          name: restaurantData.name,
          subdomain: restaurantData.subdomain,
          logoUrl: restaurantData.logo_url,
          brandColor: restaurantData.brand_color,
          defaultLanguage: restaurantData.default_language,
          onboarded: restaurantData.onboarded
        };
      }
    }

    return NextResponse.json({ 
      authenticated: true, 
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role,
        restaurantId: user.restaurantId,
        subdomain: restaurant?.subdomain ?? user.subdomain,
        restaurant
      }
    });
  } catch (error) {
    console.error('Error in session API:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Session validation failed' }, 
      { status: 500 }
    );
  }
}
