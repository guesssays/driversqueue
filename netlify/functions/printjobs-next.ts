import { Handler } from '@netlify/functions';
import { requirePublicOffice } from './_shared/offices';
import { supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  }

  try {
    const authHeader = event.headers?.['x-print-secret'] || event.headers?.['X-Print-Secret'];
    const expectedSecret = process.env.PRINT_SERVICE_SECRET;

    if (!expectedSecret || authHeader !== expectedSecret) {
      return errorResponse('Unauthorized', 401);
    }

    const office = await requirePublicOffice({
      officeId: event.headers?.['x-office-id'] || event.headers?.['X-Office-Id'],
      officeSlug:
        event.headers?.['x-office-slug'] ||
        event.headers?.['X-Office-Slug'] ||
        process.env.PRINT_SERVICE_OFFICE_SLUG,
    });

    const { data: printJob, error } = await supabaseAdmin
      .from('print_jobs')
      .select('*')
      .eq('office_id', office.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !printJob) {
      return jsonResponse({ job: null });
    }

    await supabaseAdmin
      .from('print_jobs')
      .update({
        status: 'PROCESSING',
      })
      .eq('id', printJob.id)
      .eq('office_id', office.id);

    return jsonResponse({ office, job: printJob });
  } catch (error: unknown) {
    console.error('Error in printjobs-next:', error);
    return toErrorResponse(error);
  }
};
