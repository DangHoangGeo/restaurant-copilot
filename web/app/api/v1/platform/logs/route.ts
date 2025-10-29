// GET /api/v1/platform/logs
// Get system logs with filtering and pagination

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  requirePlatformAdmin,
  platformApiResponse,
  platformApiError
} from '@/lib/platform-admin';
import { getLogsQuerySchema } from '@/shared/schemas/platform';
import type { PlatformLog, PaginatedResponse } from '@/shared/types/platform';

export async function GET(request: NextRequest) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const query = getLogsQuerySchema.parse(queryParams);

    const supabase = await createClient();

    // Build query
    let dbQuery = supabase
      .from('logs')
      .select(
        `
        *,
        restaurants(name)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (query.level && query.level !== 'all') {
      dbQuery = dbQuery.eq('level', query.level);
    }

    if (query.restaurant_id) {
      dbQuery = dbQuery.eq('restaurant_id', query.restaurant_id);
    }

    if (query.start_date) {
      dbQuery = dbQuery.gte('created_at', query.start_date);
    }

    if (query.end_date) {
      dbQuery = dbQuery.lte('created_at', query.end_date);
    }

    if (query.search) {
      dbQuery = dbQuery.or(
        `message.ilike.%${query.search}%,endpoint.ilike.%${query.search}%`
      );
    }

    // Apply sorting (newest first)
    dbQuery = dbQuery.order('created_at', { ascending: false });

    // Apply pagination
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    dbQuery = dbQuery.range(from, to);

    const { data: logs, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching logs:', error);
      return platformApiError('Failed to fetch logs', 500);
    }

    // Transform data
    const data: PlatformLog[] =
      logs?.map((log) => ({
        id: log.id,
        restaurant_id: log.restaurant_id,
        restaurant_name: Array.isArray(log.restaurants)
          ? log.restaurants[0]?.name
          : log.restaurants?.name,
        level: log.level,
        message: log.message,
        endpoint: log.endpoint,
        method: log.method,
        status_code: log.status_code,
        user_id: log.user_id,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        metadata: log.metadata,
        created_at: log.created_at
      })) || [];

    const response: PaginatedResponse<PlatformLog> = {
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
    console.error('Error in GET /platform/logs:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid query parameters', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
