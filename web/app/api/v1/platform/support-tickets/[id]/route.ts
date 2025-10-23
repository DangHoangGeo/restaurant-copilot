// PATCH /api/v1/platform/support-tickets/[id]
// Update a support ticket

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  requirePlatformAdmin,
  platformApiResponse,
  platformApiError,
  logPlatformAction
} from '@/lib/platform-admin';
import { updateTicketSchema } from '@/shared/schemas/platform';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin(request);
  if (authError) return authError;

  try {
    const ticketId = params.id;
    const body = await request.json();

    // Validate request body
    const validated = updateTicketSchema.parse(body);

    const supabase = await createClient();

    // Get current ticket for audit log
    const { data: currentTicket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!currentTicket) {
      return platformApiError('Support ticket not found', 404);
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (validated.status) {
      updateData.status = validated.status;

      // If resolving, set resolved_at
      if (validated.status === 'resolved' && !currentTicket.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }

      // If closing, set closed_at
      if (validated.status === 'closed' && !currentTicket.closed_at) {
        updateData.closed_at = new Date().toISOString();
      }
    }

    if (validated.priority) {
      updateData.priority = validated.priority;
    }

    if (validated.assigned_to !== undefined) {
      updateData.assigned_to = validated.assigned_to;
      if (validated.assigned_to && !currentTicket.assigned_at) {
        updateData.assigned_at = new Date().toISOString();
      }
    }

    if (validated.resolution_notes) {
      updateData.resolution_notes = validated.resolution_notes;
    }

    // Update ticket
    const { data: updatedTicket, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error updating support ticket:', error);
      return platformApiError('Failed to update support ticket', 500);
    }

    // Log the action
    await logPlatformAction(
      'update_support_ticket',
      'support_ticket',
      ticketId,
      currentTicket.restaurant_id,
      {
        before: currentTicket,
        after: updatedTicket,
        changes: validated
      }
    );

    return platformApiResponse({
      success: true,
      message: 'Support ticket updated successfully',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Error in PATCH /platform/support-tickets/:id:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid request body', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}

// GET /api/v1/platform/support-tickets/[id]
// Get a single support ticket with messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin(request);
  if (authError) return authError;

  try {
    const ticketId = params.id;
    const supabase = await createClient();

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(
        `
        *,
        restaurants(name),
        platform_admins(full_name)
      `
      )
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return platformApiError('Support ticket not found', 404);
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching ticket messages:', error);
      return platformApiError('Failed to fetch ticket messages', 500);
    }

    return platformApiResponse({
      ticket: {
        ...ticket,
        restaurant_name: Array.isArray(ticket.restaurants)
          ? ticket.restaurants[0]?.name
          : ticket.restaurants?.name,
        assigned_to_name: Array.isArray(ticket.platform_admins)
          ? ticket.platform_admins[0]?.full_name
          : ticket.platform_admins?.full_name
      },
      messages: messages || []
    });
  } catch (error) {
    console.error('Error in GET /platform/support-tickets/:id:', error);
    return platformApiError('Internal server error', 500);
  }
}
