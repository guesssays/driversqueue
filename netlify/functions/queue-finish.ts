import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { requireAccessibleOffice } from './_shared/offices';
import { getUserFromRequest, requireRole, supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

const finishSchema = z.object({
  officeId: z.string().uuid(),
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
    const auth = await getUserFromRequest(event);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    requireRole(auth.profile, ['admin', 'operator_queue']);

    const body = JSON.parse(event.body || '{}');
    const { officeId, ticketId } = finishSchema.parse(body);
    const office = await requireAccessibleOffice(auth, officeId);

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('office_id', office.id)
      .single();

    if (ticketError || !ticket) {
      return errorResponse('Ticket not found', 404);
    }

    const now = new Date().toISOString();
    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('queue_tickets')
      .update({
        status: 'DONE',
        finished_at: now,
      })
      .eq('id', ticketId)
      .eq('office_id', office.id)
      .select()
      .single();

    if (updateError || !updatedTicket) {
      return errorResponse('Failed to finish ticket', 500);
    }

    return jsonResponse({ ticket: updatedTicket });
  } catch (error: unknown) {
    console.error('Error in queue-finish:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return toErrorResponse(error);
  }
};
