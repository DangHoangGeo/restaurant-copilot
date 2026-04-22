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
  const authError = await requirePlatformAdmin();
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

    // Get trend data from a single SQL aggregation rather than grouping raw
    // snapshot rows in Node for every dashboard request.
    interface TrendPoint {
      date: string;
      orders: number;
      revenue: number;
      customers: number;
    }

    let trends: TrendPoint[] = [];
    if (query.start_date && query.end_date) {
      const { data: trendData, error: trendError } = await supabase.rpc('get_platform_usage_trends', {
        p_start_date: query.start_date,
        p_end_date: query.end_date,
        p_restaurant_id: null,
      });

      if (trendError) {
        console.error('Error fetching platform usage trends:', trendError);
        return platformApiError('Failed to fetch usage trends', 500);
      }

      trends =
        trendData?.map((trend: {
          snapshot_date: string;
          total_orders: number | string | null;
          total_revenue: number | string | null;
          unique_customers: number | string | null;
        }) => ({
          date: trend.snapshot_date,
          orders: Number(trend.total_orders ?? 0),
          revenue: Number(trend.total_revenue ?? 0),
          customers: Number(trend.unique_customers ?? 0),
        })) ?? [];
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
