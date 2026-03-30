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

export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export function toErrorResponse(error: unknown, fallbackMessage = 'Internal server error'): HandlerResponse {
  if (error instanceof HttpError) {
    return errorResponse(error.message, error.statusCode);
  }

  if (error instanceof Error) {
    return errorResponse(error.message || fallbackMessage, 500);
  }

  return errorResponse(fallbackMessage, 500);
}
