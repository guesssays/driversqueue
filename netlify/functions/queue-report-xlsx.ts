import { Handler } from '@netlify/functions';
import { getUserFromRequest, requireRole } from './_shared/supabase';
import { supabaseAdmin } from './_shared/supabase';
import { errorResponse } from './_shared/utils';
import { DateTime } from 'luxon';
import ExcelJS from 'exceljs';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
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

    // Build query (same as queue-report.ts)
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
      return errorResponse('Failed to fetch tickets', 500);
    }

    // Get operator names
    const operatorIds = [...new Set(tickets?.map(t => t.operator_user_id).filter(Boolean) || [])];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, window_label')
      .in('id', operatorIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.window_label || 'Unknown']) || []);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Queue Report');

    // Add headers
    worksheet.columns = [
      { header: 'Номер билета', key: 'ticket_number', width: 15 },
      { header: 'Тип очереди', key: 'queue_type', width: 12 },
      { header: 'Статус', key: 'status', width: 12 },
      { header: 'Дата создания', key: 'created_at', width: 20 },
      { header: 'Вызван', key: 'called_at', width: 20 },
      { header: 'Начало обслуживания', key: 'started_at', width: 20 },
      { header: 'Завершено', key: 'finished_at', width: 20 },
      { header: 'Окно', key: 'window_label', width: 15 },
      { header: 'Оператор', key: 'operator_name', width: 20 },
      { header: 'Время обслуживания (сек)', key: 'service_time', width: 25 },
    ];

    // Add data rows
    tickets?.forEach(ticket => {
      const operatorName = ticket.operator_user_id ? profileMap.get(ticket.operator_user_id) || 'Unknown' : '';
      let serviceTime = '';
      
      if (ticket.started_at && ticket.finished_at) {
        const start = DateTime.fromISO(ticket.started_at);
        const finish = DateTime.fromISO(ticket.finished_at);
        serviceTime = Math.round(finish.diff(start, 'seconds').seconds).toString();
      }

      worksheet.addRow({
        ticket_number: ticket.ticket_number,
        queue_type: ticket.queue_type === 'REG' ? 'Регистрация' : 'Технические вопросы',
        status: getStatusLabel(ticket.status),
        created_at: ticket.created_at ? DateTime.fromISO(ticket.created_at).setZone('Asia/Tashkent').toFormat('dd.MM.yyyy HH:mm:ss') : '',
        called_at: ticket.called_at ? DateTime.fromISO(ticket.called_at).setZone('Asia/Tashkent').toFormat('dd.MM.yyyy HH:mm:ss') : '',
        started_at: ticket.started_at ? DateTime.fromISO(ticket.started_at).setZone('Asia/Tashkent').toFormat('dd.MM.yyyy HH:mm:ss') : '',
        finished_at: ticket.finished_at ? DateTime.fromISO(ticket.finished_at).setZone('Asia/Tashkent').toFormat('dd.MM.yyyy HH:mm:ss') : '',
        window_label: ticket.window_label || '',
        operator_name: operatorName,
        service_time: serviceTime,
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="queue-report-${from}-${to}.xlsx"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Error in queue-report-xlsx:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    WAITING: 'Ожидание',
    CALLED: 'Вызван',
    SERVING: 'Обслуживается',
    DONE: 'Завершено',
    NO_SHOW: 'Не явился',
    CANCELLED: 'Отменен',
  };
  return labels[status] || status;
}
