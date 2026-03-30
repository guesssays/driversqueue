import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { getOfficeScopedConfig, requireAccessibleOffice } from './_shared/offices';
import { getUserFromRequest, requireRole, supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

const printTicketSchema = z.object({
  ticketId: z.string().uuid(),
  officeId: z.string().uuid(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const auth = await getUserFromRequest(event);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    requireRole(auth.profile, ['admin', 'reception_security']);

    const url = new URL(
      event.rawUrl || `http://localhost${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
    );
    const params = printTicketSchema.parse({
      ticketId: url.searchParams.get('ticketId'),
      officeId: url.searchParams.get('officeId'),
    });

    const office = await requireAccessibleOffice(auth, params.officeId);
    const config = await getOfficeScopedConfig(office.id);

    const { data: ticket, error } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('id', params.ticketId)
      .eq('office_id', office.id)
      .single();

    if (error || !ticket) {
      return errorResponse('Ticket not found', 404);
    }

    return jsonResponse({
      office,
      config,
      ticket,
    });
  } catch (error: unknown) {
    console.error('Error in queue-print-ticket:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return toErrorResponse(error);
  }
};
