import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse } from './_shared/utils';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse({});
  }

  try {
    const url = new URL(event.rawUrl || `http://localhost${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`);
    const since = url.searchParams.get('since');

    // Get current serving tickets
    const { data: servingReg } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('queue_type', 'REG')
      .in('status', ['CALLED', 'SERVING'])
      .order('called_at', { ascending: false })
      .limit(1);

    const { data: servingTech } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('queue_type', 'TECH')
      .in('status', ['CALLED', 'SERVING'])
      .order('called_at', { ascending: false })
      .limit(1);

    // Get waiting tickets
    const { data: waitingReg } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('queue_type', 'REG')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true })
      .limit(10);

    const { data: waitingTech } = await supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('queue_type', 'TECH')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true })
      .limit(10);

    // Get last calls (recently called tickets)
    let lastCallsQuery = supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .in('status', ['CALLED', 'SERVING', 'DONE', 'NO_SHOW'])
      .order('called_at', { ascending: false })
      .limit(20);

    if (since) {
      lastCallsQuery = lastCallsQuery.gt('called_at', since);
    }

    const { data: lastCalls } = await lastCallsQuery;

    return jsonResponse({
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
  } catch (error: any) {
    console.error('Error in queue-screen-state:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
