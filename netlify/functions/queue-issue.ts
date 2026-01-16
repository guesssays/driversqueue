import { Handler } from '@netlify/functions';
import { getUserFromRequest, requireRole } from './_shared/supabase';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse, getTashkentDateString } from './_shared/utils';
import { z } from 'zod';

const issueSchema = z.object({
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

    requireRole(auth.profile, ['admin', 'reception_security']);

    const body = JSON.parse(event.body || '{}');
    const { queueType } = issueSchema.parse(body);

    const ticketDate = getTashkentDateString();
    const now = new Date().toISOString();

    // Get next ticket number using the database function
    const { data: ticketNumberResult, error: numberError } = await supabaseAdmin
      .rpc('get_next_ticket_number', {
        p_queue_type: queueType,
        p_date: ticketDate,
      });

    if (numberError) {
      console.error('Error getting ticket number:', numberError);
      return errorResponse('Failed to generate ticket number', 500);
    }

    const ticketNumber = ticketNumberResult as string;

    // Create ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('queue_tickets')
      .insert({
        ticket_number: ticketNumber,
        queue_type: queueType,
        status: 'WAITING',
        issued_by_user_id: auth.user.id,
        ticket_date: ticketDate,
        created_at: now,
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      console.error('Error creating ticket:', ticketError);
      return errorResponse('Failed to create ticket', 500);
    }

    // Get config for print job
    const { data: config } = await supabaseAdmin
      .from('system_config')
      .select('value')
      .eq('key', 'qr_enabled')
      .single();

    const qrEnabled = config?.value || false;

    // Optionally create print job
    let printJobId: string | undefined;
    if (process.env.PRINT_SERVICE_ENABLED === 'true') {
      const printPayload = {
        ticketNumber,
        queueType,
        date: ticketDate,
        time: now,
        qrEnabled,
      };

      const { data: printJob } = await supabaseAdmin
        .from('print_jobs')
        .insert({
          ticket_id: ticket.id,
          payload_base64: Buffer.from(JSON.stringify(printPayload)).toString('base64'),
          status: 'PENDING',
        })
        .select()
        .single();

      printJobId = printJob?.id;
    }

    const printUrl = `/queue/print/${ticket.id}`;

    return jsonResponse({
      ticket,
      printUrl,
      printJobId,
    });
  } catch (error: any) {
    console.error('Error in queue-issue:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
