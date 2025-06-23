import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get restaurant data with homepage content using the existing function
    const { data: homepageData, error } = await supabaseAdmin
      .rpc('get_restaurant_homepage_data', { restaurant_id_param: user.restaurantId });

    if (error) {
      await logger.error('get_restaurant_homepage_data', 'Database error', {
        restaurantId: user.restaurantId,
        error: error.message
      });
      return NextResponse.json({ error: 'Failed to fetch homepage data' }, { status: 500 });
    }

    if (!homepageData || homepageData.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const result = homepageData[0];

    return NextResponse.json({
      restaurant: {
        id: result.restaurant_id,
        name: result.restaurant_name,
        subdomain: result.restaurant_subdomain,
        logo_url: result.restaurant_logo_url,
        brand_color: result.restaurant_brand_color,
        secondary_color: result.restaurant_secondary_color,
        tagline_en: result.restaurant_tagline_en,
        tagline_ja: result.restaurant_tagline_ja,
        tagline_vi: result.restaurant_tagline_vi,
        contact_info: result.restaurant_contact_info,
        address: result.restaurant_address,
        phone: result.restaurant_phone,
        email: result.restaurant_email,
        website: result.restaurant_website,
        opening_hours: result.restaurant_opening_hours,
        description_en: result.restaurant_description_en,
        description_ja: result.restaurant_description_ja,
        description_vi: result.restaurant_description_vi,
        social_links: result.restaurant_social_links,
        google_place_id: result.restaurant_google_place_id,
        google_rating: result.restaurant_google_rating,
        google_review_count: result.restaurant_google_review_count,
        owner_story_en: result.restaurant_owner_story_en,
        owner_story_ja: result.restaurant_owner_story_ja,
        owner_story_vi: result.restaurant_owner_story_vi,
      },
      owners: result.owners || [],
      gallery: result.gallery || [],
      signature_dishes: result.signature_dishes || [],
    });

  } catch (error) {
    await logger.error('get_restaurant_homepage_data', 'Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
