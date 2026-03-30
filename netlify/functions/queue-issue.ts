import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { getOfficeScopedConfig, requireAccessibleOffice } from './_shared/offices';
import { getUserFromRequest, requireRole, supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, getTashkentDateString, jsonResponse, toErrorResponse } from './_shared/utils';

const issueSchema = z.object({
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

    requireRole(auth.profile, ['admin', 'reception_security']);

    const body = JSON.parse(event.body || '{}');
    const { officeId, queueType } = issueSchema.parse(body);
    const office = await requireAccessibleOffice(auth, officeId);
    const config = await getOfficeScopedConfig(office.id);

    const ticketDate = getTashkentDateString();
    const now = new Date().toISOString();

    const { data: ticketNumberResult, error: numberError } = await supabaseAdmin.rpc(
      'get_next_ticket_number',
      {
        p_office_id: office.id,
        p_queue_type: queueType,
        p_date: ticketDate,
      },
    );

    if (numberError) {
      console.error('Error getting ticket number:', numberError);
      return errorResponse('Failed to generate ticket number', 500);
    }

    const ticketNumber = ticketNumberResult as string;

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('queue_tickets')
      .insert({
        office_id: office.id,
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

    let printJobId: string | undefined;
    if (process.env.PRINT_SERVICE_ENABLED === 'true') {
      const printPayload = {
        officeId: office.id,
        officeName: office.name,
        officeSlug: office.slug,
        ticketNumber,
        queueType,
        date: ticketDate,
        time: now,
        qrEnabled: config.qr_enabled,
      };

      const { data: printJob } = await supabaseAdmin
        .from('print_jobs')
        .insert({
          office_id: office.id,
          ticket_id: ticket.id,
          payload_base64: Buffer.from(JSON.stringify(printPayload)).toString('base64'),
          status: 'PENDING',
        })
        .select()
        .single();

      printJobId = printJob?.id;
    }

    return jsonResponse({
      ticket,
      office,
      printUrl: `/${office.slug}/print?ticketId=${ticket.id}`,
      printJobId,
    });
  } catch (error: unknown) {
    console.error('Error in queue-issue:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return toErrorResponse(error);
  }
};
