// GET /api/v1/platform/support-tickets
// List all support tickets with filtering and pagination

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  requirePlatformAdmin,
  platformApiResponse,
  platformApiError
} from '@/lib/platform-admin';
import { getSupportTicketsQuerySchema } from '@/shared/schemas/platform';
import type { SupportTicket, PaginatedResponse } from '@/shared/types/platform';

export async function GET(request: NextRequest) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const query = getSupportTicketsQuerySchema.parse(queryParams);

    const supabase = await createClient();

    // Build query
    let dbQuery = supabase
      .from('support_tickets')
      .select(
        `
        *,
        restaurants(name),
        platform_admins(full_name)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    if (query.priority) {
      dbQuery = dbQuery.eq('priority', query.priority);
    }

    if (query.category) {
      dbQuery = dbQuery.eq('category', query.category);
    }

    if (query.restaurant_id) {
      dbQuery = dbQuery.eq('restaurant_id', query.restaurant_id);
    }

    if (query.assigned_to) {
      dbQuery = dbQuery.eq('assigned_to', query.assigned_to);
    }

    if (query.search) {
      dbQuery = dbQuery.or(
        `subject.ilike.%${query.search}%,submitter_name.ilike.%${query.search}%,submitter_email.ilike.%${query.search}%`
      );
    }

    // Apply sorting (newest first, then by priority)
    dbQuery = dbQuery.order('created_at', { ascending: false });

    // Apply pagination
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    dbQuery = dbQuery.range(from, to);

    const { data: tickets, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching support tickets:', error);
      return platformApiError('Failed to fetch support tickets', 500);
    }

    // Get message counts for each ticket
    const ticketIds = tickets?.map((t) => t.id) || [];
    if (ticketIds.length === 0) {
      const response: PaginatedResponse<SupportTicket> = {
        data: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / query.limit)
        }
      };

      return platformApiResponse(response);
    }

    const { data: messageCounts } = await supabase
      .from('support_ticket_messages')
      .select('ticket_id')
      .in('ticket_id', ticketIds);

    const messageCountMap = new Map<string, number>();
    messageCounts?.forEach((m) => {
      messageCountMap.set(m.ticket_id, (messageCountMap.get(m.ticket_id) || 0) + 1);
    });

    // Transform data
    const data: SupportTicket[] =
      tickets?.map((ticket) => ({
        ...ticket,
        restaurant_name: Array.isArray(ticket.restaurants)
          ? ticket.restaurants[0]?.name
          : ticket.restaurants?.name,
        assigned_to_name: Array.isArray(ticket.platform_admins)
          ? ticket.platform_admins[0]?.full_name
          : ticket.platform_admins?.full_name,
        message_count: messageCountMap.get(ticket.id) || 0
      })) || [];

    const response: PaginatedResponse<SupportTicket> = {
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
    console.error('Error in GET /platform/support-tickets:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid query parameters', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
