// GET /api/v1/platform/restaurants
// List all restaurants with filtering and pagination

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  requirePlatformAdmin,
  platformApiResponse,
  platformApiError
} from '@/lib/platform-admin';
import { getRestaurantsQuerySchema } from '@/shared/schemas/platform';
import type { RestaurantSummary, PaginatedResponse } from '@/shared/types/platform';

export async function GET(request: NextRequest) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const query = getRestaurantsQuerySchema.parse(queryParams);

    const supabase = await createClient();

    // Build query
    let dbQuery = supabase
      .from('restaurants')
      .select(
        `
        *,
        tenant_subscriptions(
          plan_id,
          status,
          trial_ends_at
        )
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (query.status && query.status !== 'all') {
      if (query.status === 'trial') {
        dbQuery = dbQuery.eq('tenant_subscriptions.status', 'trial');
      } else if (query.status === 'active') {
        dbQuery = dbQuery.eq('is_active', true);
      } else if (query.status === 'inactive') {
        dbQuery = dbQuery.eq('is_active', false);
      } else if (query.status === 'suspended') {
        dbQuery = dbQuery.not('suspended_at', 'is', null);
      }
    }

    if (query.plan && query.plan !== 'all') {
      dbQuery = dbQuery.eq('tenant_subscriptions.plan_id', query.plan);
    }

    if (query.verified && query.verified !== 'all') {
      if (query.verified === 'verified') {
        dbQuery = dbQuery.eq('is_verified', true);
      } else {
        dbQuery = dbQuery.eq('is_verified', false);
      }
    }

    if (query.search) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query.search}%,email.ilike.%${query.search}%,subdomain.ilike.%${query.search}%`
      );
    }

    // Apply sorting
    const sortColumn = query.sort === 'last_order' ? 'updated_at' : query.sort;
    dbQuery = dbQuery.order(sortColumn, { ascending: query.order === 'asc' });

    // Apply pagination
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    dbQuery = dbQuery.range(from, to);

    const { data: restaurants, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching restaurants:', error);
      return platformApiError('Failed to fetch restaurants', 500);
    }

    // Get additional stats for each restaurant
    const restaurantIds = restaurants?.map((r) => r.id) || [];

    // Fetch staff counts
    const { data: staffCounts } = await supabase
      .from('users')
      .select('restaurant_id')
      .in('restaurant_id', restaurantIds);

    const staffCountMap = new Map<string, number>();
    staffCounts?.forEach((s) => {
      staffCountMap.set(s.restaurant_id, (staffCountMap.get(s.restaurant_id) || 0) + 1);
    });

    // Fetch usage snapshots for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: usageData } = await supabase
      .from('tenant_usage_snapshots')
      .select('restaurant_id, total_orders, total_revenue')
      .in('restaurant_id', restaurantIds)
      .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0]);

    const usageMap = new Map<
      string,
      { total_orders: number; total_revenue: number }
    >();
    usageData?.forEach((u) => {
      const existing = usageMap.get(u.restaurant_id) || {
        total_orders: 0,
        total_revenue: 0
      };
      usageMap.set(u.restaurant_id, {
        total_orders: existing.total_orders + u.total_orders,
        total_revenue: existing.total_revenue + Number(u.total_revenue)
      });
    });

    // Fetch last order times
    const { data: lastOrders } = await supabase
      .from('orders')
      .select('restaurant_id, created_at')
      .in('restaurant_id', restaurantIds)
      .order('created_at', { ascending: false });

    const lastOrderMap = new Map<string, string>();
    lastOrders?.forEach((o) => {
      if (!lastOrderMap.has(o.restaurant_id)) {
        lastOrderMap.set(o.restaurant_id, o.created_at);
      }
    });

    // Fetch open support tickets
    const { data: ticketCounts } = await supabase
      .from('support_tickets')
      .select('restaurant_id')
      .in('restaurant_id', restaurantIds)
      .not('status', 'in', '(resolved,closed)');

    const ticketCountMap = new Map<string, number>();
    ticketCounts?.forEach((t) => {
      ticketCountMap.set(
        t.restaurant_id,
        (ticketCountMap.get(t.restaurant_id) || 0) + 1
      );
    });

    // Build response
    const summaries: RestaurantSummary[] =
      restaurants?.map((r) => {
        const subscription = Array.isArray(r.tenant_subscriptions)
          ? r.tenant_subscriptions[0]
          : r.tenant_subscriptions;
        const usage = usageMap.get(r.id) || { total_orders: 0, total_revenue: 0 };

        return {
          id: r.id,
          name: r.name,
          subdomain: r.subdomain,
          email: r.email,
          phone: r.phone,
          is_active: r.is_active,
          is_verified: r.is_verified,
          verified_at: r.verified_at,
          verified_by: r.verified_by,
          created_at: r.created_at,
          suspended_at: r.suspended_at,
          suspend_reason: r.suspend_reason,
          subscription_plan: subscription?.plan_id || null,
          subscription_status: subscription?.status || null,
          trial_ends_at: subscription?.trial_ends_at || null,
          total_staff: staffCountMap.get(r.id) || 0,
          total_orders_30d: usage.total_orders,
          total_revenue_30d: usage.total_revenue,
          last_order_at: lastOrderMap.get(r.id) || null,
          support_tickets_open: ticketCountMap.get(r.id) || 0
        };
      }) || [];

    const response: PaginatedResponse<RestaurantSummary> = {
      data: summaries,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / query.limit)
      }
    };

    return platformApiResponse(response);
  } catch (error) {
    console.error('Error in GET /platform/restaurants:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid query parameters', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
