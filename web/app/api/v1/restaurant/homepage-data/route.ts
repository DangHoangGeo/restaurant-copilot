import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/lib/logger';
import { cacheOrFetch } from '@/lib/server/cache';
import {
  CUSTOMER_MENU_TTL_SECONDS,
  customerRestaurantHomepageCacheKey,
} from '@/lib/server/customer-cache';

class HomepageDataNotFoundError extends Error {}

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

    const homepageData = await cacheOrFetch<unknown>(
      customerRestaurantHomepageCacheKey(user.restaurantId),
      async () => {
        // Get restaurant data with homepage content using the canonical homepage RPC.
        const { data, error } = await supabaseAdmin
          .rpc('get_restaurant_homepage_data', { restaurant_subdomain: restaurantSubdomain });

        if (error) {
          await logger.error('get_restaurant_homepage_data', 'Database error', {
            restaurantId: user.restaurantId,
            error: error.message
          });
          throw new Error('Failed to fetch homepage data');
        }

        if (!data || (typeof data === 'object' && data !== null && 'error' in data)) {
          throw new HomepageDataNotFoundError('Restaurant not found');
        }

        return data;
      },
      { ttlSeconds: CUSTOMER_MENU_TTL_SECONDS },
    );

    if (!homepageData) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(homepageData, {
      headers: {
        'Cache-Control': `private, max-age=${CUSTOMER_MENU_TTL_SECONDS}`,
      },
    });

  } catch (error) {
    if (error instanceof HomepageDataNotFoundError) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    await logger.error('get_restaurant_homepage_data', 'Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
