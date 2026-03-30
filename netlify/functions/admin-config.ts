import { Handler } from '@netlify/functions';
import { z } from 'zod';
import {
  getOfficeScopedConfig,
  requireAccessibleOffice,
  saveOfficeScopedConfig,
} from './_shared/offices';
import { getUserFromRequest, requireRole } from './_shared/supabase';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

const configSchema = z.object({
  officeId: z.string().uuid(),
  logo_url: z.string().url().optional(),
  qr_enabled: z.boolean().optional(),
  retention_days: z.number().int().min(1).optional(),
  timezone: z.string().optional(),
  screens_lang: z.enum(['ru', 'uzLat', 'uzCyr']).optional(),
});

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

    if (event.httpMethod === 'GET') {
      const url = new URL(
        event.rawUrl || `http://localhost${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
      );
      const officeId = url.searchParams.get('officeId');

      if (!officeId) {
        return errorResponse('Missing officeId parameter', 400);
      }

      const office = await requireAccessibleOffice(auth, officeId);
      const config = await getOfficeScopedConfig(office.id);

      return jsonResponse({
        office,
        ...config,
      });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const updates = configSchema.parse(body);

      const office = await requireAccessibleOffice(auth, updates.officeId);
      const config = await saveOfficeScopedConfig({
        officeId: office.id,
        updatedBy: auth.user.id,
        updates,
      });

      return jsonResponse({
        office,
        ...config,
      });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: unknown) {
    console.error('Error in admin-config:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return toErrorResponse(error);
  }
};
