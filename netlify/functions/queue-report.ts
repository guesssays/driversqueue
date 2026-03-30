import { Handler } from '@netlify/functions';
import { DateTime } from 'luxon';
import { requireAccessibleOffice } from './_shared/offices';
import { getUserFromRequest, requireRole, supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

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

    requireRole(auth.profile, ['admin']);

    const url = new URL(
      event.rawUrl || `http://localhost${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
    );
    const officeId = url.searchParams.get('officeId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const queueType = url.searchParams.get('queueType');
    const operator = url.searchParams.get('operator');

    if (!officeId || !from || !to) {
      return errorResponse('Missing officeId/from/to parameters', 400);
    }

    const office = await requireAccessibleOffice(auth, officeId);

    let query = supabaseAdmin
      .from('queue_tickets')
      .select('*')
      .eq('office_id', office.id)
      .gte('ticket_date', from)
      .lte('ticket_date', to);

    if (queueType) {
      query = query.eq('queue_type', queueType);
    }

    if (operator) {
      query = query.eq('operator_user_id', operator);
    }

    const { data: tickets, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tickets:', error);
      return errorResponse('Failed to fetch tickets', 500);
    }

    const totalTickets = tickets?.length || 0;
    const byQueueType = {
      REG: tickets?.filter((ticket) => ticket.queue_type === 'REG').length || 0,
      TECH: tickets?.filter((ticket) => ticket.queue_type === 'TECH').length || 0,
    };

    const operatorMap = new Map<string, { count: number; totalTime: number; timeCount: number }>();

    tickets?.forEach((ticket) => {
      if (!ticket.operator_user_id) {
        return;
      }

      const existing = operatorMap.get(ticket.operator_user_id) || {
        count: 0,
        totalTime: 0,
        timeCount: 0,
      };
      existing.count += 1;

      if (ticket.started_at && ticket.finished_at) {
        const start = DateTime.fromISO(ticket.started_at);
        const finish = DateTime.fromISO(ticket.finished_at);
        existing.totalTime += finish.diff(start, 'seconds').seconds;
        existing.timeCount += 1;
      }

      operatorMap.set(ticket.operator_user_id, existing);
    });

    const operatorIds = Array.from(operatorMap.keys());
    const { data: profiles } = operatorIds.length
      ? await supabaseAdmin
          .from('profiles')
          .select('id, window_label')
          .in('id', operatorIds)
      : { data: [] as Array<{ id: string; window_label: string | null }> };

    const profileMap = new Map(
      (profiles || []).map((profile) => [profile.id, profile.window_label || 'Unknown']),
    );

    const byOperator = Array.from(operatorMap.entries()).map(([operatorId, stats]) => ({
      operator_id: operatorId,
      operator_name: profileMap.get(operatorId) || 'Unknown',
      count: stats.count,
      avgServiceTime: stats.timeCount > 0 ? Math.round(stats.totalTime / stats.timeCount) : null,
    }));

    return jsonResponse({
      office,
      totalTickets,
      byQueueType,
      byOperator,
      tickets: tickets || [],
    });
  } catch (error: unknown) {
    console.error('Error in queue-report:', error);
    return toErrorResponse(error);
  }
};
