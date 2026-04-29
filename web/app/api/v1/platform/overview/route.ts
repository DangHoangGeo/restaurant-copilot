// GET /api/v1/platform/overview
// Dashboard overview with key metrics and trends

import { NextRequest } from 'next/server';
import {
  requirePlatformAdmin,
  platformApiResponse,
  platformApiError
} from '@/lib/platform-admin';
import { supabaseReadAdmin } from '@/lib/supabase/read-client';
import {
  buildDashboardOverview,
  getPlatformOverviewPeriodStart
} from '@/lib/server/platform/overview';
import { getDashboardOverviewQuerySchema } from '@/shared/schemas/platform';

export async function GET(request: NextRequest) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const query = getDashboardOverviewQuerySchema.parse(queryParams);

    const currentDate = new Date().toISOString().split('T')[0];
    const periodStart = getPlatformOverviewPeriodStart(query.period);

    const [{ data: summary, error: summaryError }, { data: trends, error: trendsError }] =
      await Promise.all([
        supabaseReadAdmin.rpc(
          'get_platform_overview_summary',
          {
            p_period_start: periodStart,
            p_target_date: currentDate,
          },
          { get: true },
        ),
        supabaseReadAdmin.rpc(
          'get_platform_overview_trends',
          {
            p_period_start: periodStart,
            p_target_date: currentDate,
          },
          { get: true },
        ),
      ]);

    if (summaryError || trendsError) {
      console.error('Error fetching platform overview data:', {
        summaryError,
        trendsError,
      });
      return platformApiError('Failed to fetch overview data', 500);
    }

    return platformApiResponse(
      buildDashboardOverview({
        period: query.period,
        summary: summary?.[0],
        trends,
      })
    );
  } catch (error) {
    console.error('Error in GET /platform/overview:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid query parameters', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
