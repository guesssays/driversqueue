import { Handler } from '@netlify/functions';
import { requirePublicOffice } from './_shared/offices';
import { supabaseAdmin } from './_shared/supabase';
import { corsHeaders, jsonResponse, toErrorResponse } from './_shared/utils';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  }

  try {
    const url = new URL(
      event.rawUrl || `http://localhost${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
    );
    const officeId = url.searchParams.get('officeId');
    const officeSlug = url.searchParams.get('officeSlug');
    const since = url.searchParams.get('since');
    const office = await requirePublicOffice({ officeId, officeSlug });

    const { data: servingReg } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('office_id', office.id)
      .eq('queue_type', 'REG')
      .in('status', ['CALLED', 'SERVING'])
      .order('called_at', { ascending: false })
      .limit(1);

    const { data: servingTech } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('office_id', office.id)
      .eq('queue_type', 'TECH')
      .in('status', ['CALLED', 'SERVING'])
      .order('called_at', { ascending: false })
      .limit(1);

    const { data: waitingReg } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('office_id', office.id)
      .eq('queue_type', 'REG')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true })
      .limit(10);

    const { data: waitingTech } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('office_id', office.id)
      .eq('queue_type', 'TECH')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true })
      .limit(10);

    let lastCallsQuery = supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('office_id', office.id)
      .in('status', ['CALLED', 'SERVING', 'DONE', 'NO_SHOW'])
      .order('called_at', { ascending: false })
      .limit(20);

    if (since) {
      lastCallsQuery = lastCallsQuery.gt('called_at', since);
    }

    const { data: lastCalls } = await lastCallsQuery;

    return jsonResponse({
      office: {
        id: office.id,
        slug: office.slug,
        code: office.code,
        name: office.name,
      },
      reg: {
        current: servingReg && servingReg.length > 0 ? servingReg[0] : null,
        waiting: waitingReg || [],
      },
      tech: {
        current: servingTech && servingTech.length > 0 ? servingTech[0] : null,
        waiting: waitingTech || [],
      },
      lastCalls: lastCalls || [],
    });
  } catch (error: unknown) {
    console.error('Error in queue-screen-state:', error);
    return toErrorResponse(error);
  }
};
