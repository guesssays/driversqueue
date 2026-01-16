import { HandlerResponse } from '@netlify/functions';
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

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

export function jsonResponse(data: any, statusCode = 200): HandlerResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
    body: JSON.stringify(data),
  };
}

export function errorResponse(message: string, statusCode = 400): HandlerResponse {
  return jsonResponse({ error: message }, statusCode);
}
