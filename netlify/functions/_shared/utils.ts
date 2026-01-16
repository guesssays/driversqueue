import { DateTime } from 'luxon';

export function getTashkentDate(): DateTime {
  return DateTime.now().setZone('Asia/Tashkent');
}

export function getTashkentDateString(): string {
  return getTashkentDate().toISODate() || '';
}

export function parseDate(dateStr: string): DateTime {
  return DateTime.fromISO(dateStr, { zone: 'Asia/Tashkent' });
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}
