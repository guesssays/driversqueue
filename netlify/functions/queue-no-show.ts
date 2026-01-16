import { Handler } from '@netlify/functions';
import { getUserFromRequest, requireRole } from './_shared/supabase';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse } from './_shared/utils';
import { z } from 'zod';

const noShowSchema = z.object({
  ticketId: z.string().uuid(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse({});
  }

  try {
    const auth = await getUserFromRequest(event as any);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    requireRole(auth.profile, ['admin', 'operator_queue']);

    const body = JSON.parse(event.body || '{}');
    const { ticketId } = noShowSchema.parse(body);

    // Get ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return errorResponse('Ticket not found', 404);
    }

    // Check permissions
    if (auth.profile.role !== 'admin') {
      if (auth.profile.operator_queue_type !== ticket.queue_type) {
        return errorResponse('Insufficient permissions', 403);
      }
    }

    const now = new Date().toISOString();
    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('queue_tickets')
      .update({
        status: 'NO_SHOW',
        finished_at: now,
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError || !updatedTicket) {
      return errorResponse('Failed to mark no-show', 500);
    }

    return jsonResponse({ ticket: updatedTicket });
  } catch (error: any) {
    console.error('Error in queue-no-show:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
