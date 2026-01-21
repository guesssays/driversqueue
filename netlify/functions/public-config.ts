import { Handler } from '@netlify/functions';
import { getUserFromRequest } from './_shared/supabase';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse, corsHeaders } from './_shared/utils';

/**
 * Public config endpoint - allows any authenticated user to read system config
 * Used for ticket printing and other operations that need config (logo_url, etc.)
 * Write operations remain restricted to admin via admin-config endpoint
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const auth = await getUserFromRequest(event as any);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    // Any authenticated user can read config
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
  } catch (error: any) {
    console.error('Error in public-config:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
