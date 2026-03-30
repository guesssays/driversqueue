import { Handler, type HandlerResponse } from '@netlify/functions';
import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import { requireAccessibleOffice } from './_shared/offices';
import { getUserFromRequest, requireRole, supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, toErrorResponse } from './_shared/utils';

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
      return errorResponse('Failed to fetch tickets', 500);
    }

    const operatorIds = [...new Set((tickets || []).map((ticket) => ticket.operator_user_id).filter(Boolean))];
    const { data: profiles } = operatorIds.length
      ? await supabaseAdmin
          .from('profiles')
          .select('id, window_label')
          .in('id', operatorIds as string[])
      : { data: [] as Array<{ id: string; window_label: string | null }> };

    const profileMap = new Map(
      (profiles || []).map((profile) => [profile.id, profile.window_label || 'Unknown']),
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(office.name);

    worksheet.columns = [
      { header: 'РќРѕРјРµСЂ Р±РёР»РµС‚Р°', key: 'ticket_number', width: 15 },
      { header: 'РўРёРї РѕС‡РµСЂРµРґРё', key: 'queue_type', width: 12 },
      { header: 'РЎС‚Р°С‚СѓСЃ', key: 'status', width: 12 },
      { header: 'Р”Р°С‚Р° СЃРѕР·РґР°РЅРёСЏ', key: 'created_at', width: 20 },
      { header: 'Р’С‹Р·РІР°РЅ', key: 'called_at', width: 20 },
      { header: 'РќР°С‡Р°Р»Рѕ РѕР±СЃР»СѓР¶РёРІР°РЅРёСЏ', key: 'started_at', width: 20 },
      { header: 'Р—Р°РІРµСЂС€РµРЅРѕ', key: 'finished_at', width: 20 },
      { header: 'РћРєРЅРѕ', key: 'window_label', width: 15 },
      { header: 'РћРїРµСЂР°С‚РѕСЂ', key: 'operator_name', width: 20 },
      { header: 'Р’СЂРµРјСЏ РѕР±СЃР»СѓР¶РёРІР°РЅРёСЏ (СЃРµРє)', key: 'service_time', width: 25 },
    ];

    tickets?.forEach((ticket) => {
      const operatorName = ticket.operator_user_id ? profileMap.get(ticket.operator_user_id) || 'Unknown' : '';
      let serviceTime = '';

      if (ticket.started_at && ticket.finished_at) {
        const start = DateTime.fromISO(ticket.started_at);
        const finish = DateTime.fromISO(ticket.finished_at);
        serviceTime = Math.round(finish.diff(start, 'seconds').seconds).toString();
      }

      worksheet.addRow({
        ticket_number: ticket.ticket_number,
        queue_type: ticket.queue_type === 'REG' ? 'Р РµРіРёСЃС‚СЂР°С†РёСЏ' : 'РўРµС…РЅРёС‡РµСЃРєРёРµ РІРѕРїСЂРѕСЃС‹',
        status: getStatusLabel(ticket.status),
        created_at: ticket.created_at
          ? DateTime.fromISO(ticket.created_at).setZone('Asia/Tashkent').toFormat('dd.MM.yyyy HH:mm:ss')
          : '',
        called_at: ticket.called_at
          ? DateTime.fromISO(ticket.called_at).setZone('Asia/Tashkent').toFormat('dd.MM.yyyy HH:mm:ss')
          : '',
        started_at: ticket.started_at
          ? DateTime.fromISO(ticket.started_at).setZone('Asia/Tashkent').toFormat('dd.MM.yyyy HH:mm:ss')
          : '',
        finished_at: ticket.finished_at
          ? DateTime.fromISO(ticket.finished_at).setZone('Asia/Tashkent').toFormat('dd.MM.yyyy HH:mm:ss')
          : '',
        window_label: ticket.window_label || '',
        operator_name: operatorName,
        service_time: serviceTime,
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="queue-report-${office.slug}-${from}-${to}.xlsx"`,
        ...corsHeaders(),
      },
      body: Buffer.from(buffer).toString('base64'),
    } as HandlerResponse;
  } catch (error: unknown) {
    console.error('Error in queue-report-xlsx:', error);
    return toErrorResponse(error);
  }
};

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    WAITING: 'РћР¶РёРґР°РЅРёРµ',
    CALLED: 'Р’С‹Р·РІР°РЅ',
    SERVING: 'РћР±СЃР»СѓР¶РёРІР°РµС‚СЃСЏ',
    DONE: 'Р—Р°РІРµСЂС€РµРЅРѕ',
    NO_SHOW: 'РќРµ СЏРІРёР»СЃСЏ',
    CANCELLED: 'РћС‚РјРµРЅРµРЅ',
  };
  return labels[status] || status;
}
