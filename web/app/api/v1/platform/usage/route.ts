// GET /api/v1/platform/usage
// Get aggregated usage metrics across platform or for specific restaurant

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  requirePlatformAdmin,
  platformApiResponse,
  platformApiError
} from '@/lib/platform-admin';
import { getUsageQuerySchema } from '@/shared/schemas/platform';
import type { UsageSnapshot, PlatformUsageSummary } from '@/shared/types/platform';

export async function GET(request: NextRequest) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const query = getUsageQuerySchema.parse(queryParams);

    const supabase = await createClient();

    // If restaurant_id is provided, return detailed usage for that restaurant
    if (query.restaurant_id) {
      let dbQuery = supabase
        .from('tenant_usage_snapshots')
        .select(
          `
          *,
          restaurants(name)
        `
        )
        .eq('restaurant_id', query.restaurant_id)
        .order('snapshot_date', { ascending: false });

      // Apply date filters
      if (query.start_date) {
        dbQuery = dbQuery.gte('snapshot_date', query.start_date);
      }

      if (query.end_date) {
        dbQuery = dbQuery.lte('snapshot_date', query.end_date);
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error('Error fetching usage data:', error);
        return platformApiError('Failed to fetch usage data', 500);
      }

      const snapshots: UsageSnapshot[] =
        data?.map((s) => ({
          ...s,
          restaurant_name: Array.isArray(s.restaurants)
            ? s.restaurants[0]?.name
            : s.restaurants?.name
        })) || [];

      return platformApiResponse({ data: snapshots });
    }

    // Otherwise, return platform-wide aggregated usage
    const targetDate = query.end_date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_platform_usage_summary', {
      target_date: targetDate
    });

    if (error) {
      console.error('Error fetching platform usage summary:', error);
      return platformApiError('Failed to fetch usage summary', 500);
    }

    // If no data, return zeros
    const summary: PlatformUsageSummary = data?.[0] || {
      total_restaurants: 0,
      total_orders: 0,
      total_revenue: 0,
      total_customers: 0,
      total_ai_calls: 0,
      avg_orders_per_restaurant: 0,
      avg_revenue_per_restaurant: 0
    };

    // Get trend data if date range is provided
    let trends = [];
    if (query.start_date && query.end_date) {
      const { data: trendData } = await supabase
        .from('tenant_usage_snapshots')
        .select('snapshot_date, total_orders, total_revenue, unique_customers')
        .gte('snapshot_date', query.start_date)
        .lte('snapshot_date', query.end_date)
        .order('snapshot_date', { ascending: true });

      // Group by date and sum
      const trendMap = new Map<
        string,
        { orders: number; revenue: number; customers: number }
      >();

      trendData?.forEach((t) => {
        const existing = trendMap.get(t.snapshot_date) || {
          orders: 0,
          revenue: 0,
          customers: 0
        };
        trendMap.set(t.snapshot_date, {
          orders: existing.orders + t.total_orders,
          revenue: existing.revenue + Number(t.total_revenue),
          customers: existing.customers + t.unique_customers
        });
      });

      trends = Array.from(trendMap.entries()).map(([date, values]) => ({
        date,
        orders: values.orders,
        revenue: values.revenue,
        customers: values.customers
      }));
    }

    return platformApiResponse({
      summary,
      trends
    });
  } catch (error) {
    console.error('Error in GET /platform/usage:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid query parameters', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
