import { Handler } from '@netlify/functions';
import { listAccessibleOffices } from './_shared/offices';
import { getUserFromRequest } from './_shared/supabase';
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
    const auth = await getUserFromRequest(event);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    const offices = await listAccessibleOffices(auth);
    const defaultOfficeId =
      offices.find((office) => office.id === auth.profile.default_office_id)?.id ||
      offices[0]?.id ||
      auth.profile.default_office_id;

    return jsonResponse({
      offices,
      defaultOfficeId,
    });
  } catch (error: unknown) {
    console.error('Error in my-offices:', error);
    return toErrorResponse(error);
  }
};
