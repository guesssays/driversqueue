import { Handler } from '@netlify/functions';
import { getUserFromRequest, requireRole } from './_shared/supabase';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse, corsHeaders } from './_shared/utils';
import { z } from 'zod';

const configSchema = z.object({
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
    const auth = await getUserFromRequest(event as any);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    requireRole(auth.profile, ['admin']);

    if (event.httpMethod === 'GET') {
      const { data: configs, error } = await supabaseAdmin
        .from('system_config')
        .select('key, value');

      if (error) {
        return errorResponse('Failed to fetch config', 500);
      }

      const config: any = {};
      configs?.forEach(item => {
        config[item.key] = item.value;
      });

      return jsonResponse({
        logo_url: config.logo_url || 'https://via.placeholder.com/200x80?text=LOGO',
        qr_enabled: config.qr_enabled ?? true,
        retention_days: config.retention_days || 90,
        timezone: config.timezone || 'Asia/Tashkent',
        screens_lang: config.screens_lang || 'uzLat',
      });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const updates = configSchema.parse(body);

      for (const [key, value] of Object.entries(updates)) {
        await supabaseAdmin
          .from('system_config')
          .upsert({
            key,
            value,
            updated_by: auth.user.id,
          });
      }

      // Return updated config
      const { data: configs } = await supabaseAdmin
        .from('system_config')
        .select('key, value');

      const config: any = {};
      configs?.forEach(item => {
        config[item.key] = item.value;
      });

      return jsonResponse({
        logo_url: config.logo_url || 'https://via.placeholder.com/200x80?text=LOGO',
        qr_enabled: config.qr_enabled ?? true,
        retention_days: config.retention_days || 90,
        timezone: config.timezone || 'Asia/Tashkent',
        screens_lang: config.screens_lang || 'uzLat',
      });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('Error in admin-config:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
