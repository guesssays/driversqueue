import { Handler } from '@netlify/functions';
import { getUserFromRequest, requireRole } from './_shared/supabase';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse } from './_shared/utils';
import { z } from 'zod';

const callNextSchema = z.object({
  queueType: z.enum(['REG', 'TECH']),
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

    const body = JSON.parse(event.body || '{}');
    const { queueType } = callNextSchema.parse(body);

    // Check if user is admin or operator for this queue
    if (auth.profile.role !== 'admin') {
      if (auth.profile.role !== 'operator_queue' || auth.profile.operator_queue_type !== queueType) {
        return errorResponse('Insufficient permissions', 403);
      }
    }

    const now = new Date().toISOString();

    // Find next WAITING ticket
    const { data: waitingTickets, error: findError } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('queue_type', queueType)
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true })
      .limit(1);

    if (findError || !waitingTickets || waitingTickets.length === 0) {
      return errorResponse('No waiting tickets', 404);
    }

    const ticket = waitingTickets[0];

    // Update ticket to CALLED/SERVING
    const windowLabel = auth.profile.window_label || `Окно ${auth.profile.id.slice(0, 4)}`;

    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('queue_tickets')
      .update({
        status: 'SERVING',
        operator_user_id: auth.user.id,
        window_label: windowLabel,
        called_at: now,
        started_at: now,
      })
      .eq('id', ticket.id)
      .select()
      .single();

    if (updateError || !updatedTicket) {
      console.error('Error updating ticket:', updateError);
      return errorResponse('Failed to call ticket', 500);
    }

    return jsonResponse({ ticket: updatedTicket });
  } catch (error: any) {
    console.error('Error in queue-call-next:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
