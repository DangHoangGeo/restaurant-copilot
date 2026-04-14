// GET /api/v1/platform/subscriptions
// List all tenant subscriptions with filtering and pagination

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  requirePlatformAdmin,
  platformApiResponse,
  platformApiError
} from '@/lib/platform-admin';
import { getSubscriptionsQuerySchema } from '@/shared/schemas/platform';
import type { TenantSubscription, PaginatedResponse } from '@/shared/types/platform';

export async function GET(request: NextRequest) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const query = getSubscriptionsQuerySchema.parse(queryParams);

    const supabase = await createClient();

    // Build query
    let dbQuery = supabase
      .from('tenant_subscriptions')
      .select(
        `
        *,
        restaurants(name),
        subscription_plans(name)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    if (query.plan) {
      dbQuery = dbQuery.eq('plan_id', query.plan);
    }

    if (query.search) {
      // Search restaurant names via a dedicated lookup so the filter works reliably
      // across PostgREST relation limits.
      const { data: matchingRestaurants, error: searchError } = await supabase
        .from('restaurants')
        .select('id')
        .ilike('name', `%${query.search}%`);

      if (searchError) {
        console.error('Error searching restaurants for subscriptions:', searchError);
        return platformApiError('Failed to fetch subscriptions', 500);
      }

      const matchingRestaurantIds = matchingRestaurants?.map((restaurant) => restaurant.id) || [];
      if (matchingRestaurantIds.length === 0) {
        return platformApiResponse({
          data: [],
          pagination: {
            page: query.page,
            limit: query.limit,
            total: 0,
            total_pages: 0
          }
        });
      }

      dbQuery = dbQuery.in('restaurant_id', matchingRestaurantIds);
    }

    // Apply sorting
    dbQuery = dbQuery.order('created_at', { ascending: false });

    // Apply pagination
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    dbQuery = dbQuery.range(from, to);

    const { data: subscriptions, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return platformApiError('Failed to fetch subscriptions', 500);
    }

    // Transform data
    const data: TenantSubscription[] =
      subscriptions?.map((s) => ({
        ...s,
        restaurant_name: Array.isArray(s.restaurants)
          ? s.restaurants[0]?.name
          : s.restaurants?.name,
        plan_name: Array.isArray(s.subscription_plans)
          ? s.subscription_plans[0]?.name
          : s.subscription_plans?.name
      })) || [];

    const response: PaginatedResponse<TenantSubscription> = {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / query.limit)
      }
    };

    return platformApiResponse(response);
  } catch (error) {
    console.error('Error in GET /platform/subscriptions:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid query parameters', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
