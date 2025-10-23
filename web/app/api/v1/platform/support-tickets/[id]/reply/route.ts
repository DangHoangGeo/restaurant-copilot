// POST /api/v1/platform/support-tickets/[id]/reply
// Reply to a support ticket

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  requirePlatformAdmin,
  getPlatformAdmin,
  platformApiResponse,
  platformApiError,
  logPlatformAction
} from '@/lib/platform-admin';
import { replyToTicketSchema } from '@/shared/schemas/platform';

export async function POST(
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
    const validated = replyToTicketSchema.parse(body);

    const supabase = await createClient();
    const admin = await getPlatformAdmin();

    if (!admin) {
      return platformApiError('Platform admin not found', 403);
    }

    // Verify ticket exists
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id, restaurant_id')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return platformApiError('Support ticket not found', 404);
    }

    // Create message
    const { data: message, error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        message: validated.message,
        posted_by_type: 'platform_admin',
        posted_by: admin.user_id,
        poster_name: admin.full_name || admin.email,
        is_internal_note: validated.is_internal_note
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket message:', error);
      return platformApiError('Failed to create ticket message', 500);
    }

    // Log the action
    await logPlatformAction(
      'reply_to_support_ticket',
      'support_ticket_message',
      message.id,
      ticket.restaurant_id,
      {
        ticket_id: ticketId,
        is_internal_note: validated.is_internal_note
      }
    );

    return platformApiResponse({
      success: true,
      message: 'Reply posted successfully',
      data: message
    });
  } catch (error) {
    console.error('Error in POST /platform/support-tickets/:id/reply:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid request body', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
