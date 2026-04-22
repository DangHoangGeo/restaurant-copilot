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

    const restaurantSubdomain = user.subdomain ?? user.restaurantSettings?.subdomain;
    if (!restaurantSubdomain) {
      return NextResponse.json({ error: 'Restaurant subdomain is unavailable' }, { status: 400 });
    }

    // Get restaurant data with homepage content using the canonical homepage RPC.
    const { data: homepageData, error } = await supabaseAdmin
      .rpc('get_restaurant_homepage_data', { restaurant_subdomain: restaurantSubdomain });

    if (error) {
      await logger.error('get_restaurant_homepage_data', 'Database error', {
        restaurantId: user.restaurantId,
        error: error.message
      });
      return NextResponse.json({ error: 'Failed to fetch homepage data' }, { status: 500 });
    }

    if (!homepageData || homepageData.error) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(homepageData);

  } catch (error) {
    await logger.error('get_restaurant_homepage_data', 'Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
