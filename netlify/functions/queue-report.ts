import { Handler } from '@netlify/functions';
import { getUserFromRequest, requireRole } from './_shared/supabase';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse, corsHeaders } from './_shared/utils';
import { DateTime } from 'luxon';

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

    requireRole(auth.profile, ['admin']);

    const url = new URL(event.rawUrl || `http://localhost${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const queueType = url.searchParams.get('queueType');
    const operator = url.searchParams.get('operator');

    if (!from || !to) {
      return errorResponse('Missing from/to parameters', 400);
    }

    // Build query
    let query = supabaseAdmin
      .from('queue_tickets')
      .select('*')
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

    // Calculate statistics
    const totalTickets = tickets?.length || 0;
    const byQueueType = {
      REG: tickets?.filter(t => t.queue_type === 'REG').length || 0,
      TECH: tickets?.filter(t => t.queue_type === 'TECH').length || 0,
    };

    // Group by operator
    const operatorMap = new Map<string, { count: number; totalTime: number; timeCount: number }>();
    
    tickets?.forEach(ticket => {
      if (ticket.operator_user_id) {
        const existing = operatorMap.get(ticket.operator_user_id) || { count: 0, totalTime: 0, timeCount: 0 };
        existing.count++;
        
        if (ticket.started_at && ticket.finished_at) {
          const start = DateTime.fromISO(ticket.started_at);
          const finish = DateTime.fromISO(ticket.finished_at);
          const duration = finish.diff(start, 'seconds').seconds;
          existing.totalTime += duration;
          existing.timeCount++;
        }
        
        operatorMap.set(ticket.operator_user_id, existing);
      }
    });

    // Get operator names
    const operatorIds = Array.from(operatorMap.keys());
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, window_label')
      .in('id', operatorIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.window_label || 'Unknown']) || []);

    const byOperator = Array.from(operatorMap.entries()).map(([operatorId, stats]) => ({
      operator_id: operatorId,
      operator_name: profileMap.get(operatorId) || 'Unknown',
      count: stats.count,
      avgServiceTime: stats.timeCount > 0 ? Math.round(stats.totalTime / stats.timeCount) : null,
    }));

    return jsonResponse({
      totalTickets,
      byQueueType,
      byOperator,
      tickets: tickets || [],
    });
  } catch (error: any) {
    console.error('Error in queue-report:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
