import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { requireAccessibleOffice } from './_shared/offices';
import { getUserFromRequest, requireRole, supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

const callNextSchema = z.object({
  officeId: z.string().uuid(),
  queueType: z.enum(['REG', 'TECH']),
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
    const { officeId, queueType } = callNextSchema.parse(body);
    const office = await requireAccessibleOffice(auth, officeId);
    const now = new Date().toISOString();

    const { data: waitingTickets, error: findError } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('office_id', office.id)
      .eq('queue_type', queueType)
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true })
      .limit(1);

    if (findError) {
      console.error('Error fetching waiting tickets:', findError);
      return errorResponse('Failed to fetch waiting tickets', 500);
    }

    if (!waitingTickets || waitingTickets.length === 0) {
      return errorResponse('No waiting tickets', 404);
    }

    const ticket = waitingTickets[0];

    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('queue_tickets')
      .update({
        status: 'SERVING',
        operator_user_id: auth.user.id,
        window_label: auth.profile.window_label || null,
        called_at: now,
        started_at: now,
      })
      .eq('id', ticket.id)
      .eq('office_id', office.id)
      .select()
      .single();

    if (updateError || !updatedTicket) {
      console.error('Error updating ticket:', updateError);
      return errorResponse('Failed to call ticket', 500);
    }

    return jsonResponse({ ticket: updatedTicket });
  } catch (error: unknown) {
    console.error('Error in queue-call-next:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return toErrorResponse(error);
  }
};
