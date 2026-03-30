import { Handler } from '@netlify/functions';
import { getOfficeScopedConfig, requirePublicOffice } from './_shared/offices';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

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
    const url = new URL(
      event.rawUrl || `http://localhost${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
    );
    const officeId = url.searchParams.get('officeId');
    const officeSlug = url.searchParams.get('officeSlug');

    if (!officeId && !officeSlug) {
      return errorResponse('Missing officeId or officeSlug parameter', 400);
    }

    const office = await requirePublicOffice({ officeId, officeSlug });
    const config = await getOfficeScopedConfig(office.id);

    return jsonResponse({
      office,
      ...config,
    });
  } catch (error: unknown) {
    console.error('Error in public-config:', error);
    return toErrorResponse(error);
  }
};
