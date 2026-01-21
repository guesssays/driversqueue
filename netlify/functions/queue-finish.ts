import { Handler } from '@netlify/functions';
import { getUserFromRequest, requireRole } from './_shared/supabase';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse, corsHeaders } from './_shared/utils';
import { z } from 'zod';

const finishSchema = z.object({
  ticketId: z.string().uuid(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  }

  try {
    const auth = await getUserFromRequest(event as any);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    requireRole(auth.profile, ['admin', 'operator_queue']);

    const body = JSON.parse(event.body || '{}');
    const { ticketId } = finishSchema.parse(body);

    // Get ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return errorResponse('Ticket not found', 404);
    }

    // Operators can finish tickets from any queue type

    const now = new Date().toISOString();
    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('queue_tickets')
      .update({
        status: 'DONE',
        finished_at: now,
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError || !updatedTicket) {
      return errorResponse('Failed to finish ticket', 500);
    }

    return jsonResponse({ ticket: updatedTicket });
  } catch (error: any) {
    console.error('Error in queue-finish:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
