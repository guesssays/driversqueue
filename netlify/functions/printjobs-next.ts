import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse, corsHeaders } from './_shared/utils';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  }

  try {
    // Check secret for print service
    const authHeader = event.headers?.['x-print-secret'] || event.headers?.['X-Print-Secret'];
    const expectedSecret = process.env.PRINT_SERVICE_SECRET;

    if (!expectedSecret || authHeader !== expectedSecret) {
      return errorResponse('Unauthorized', 401);
    }

    // Get next pending print job
    const { data: printJob, error } = await supabaseAdmin
      .from('print_jobs')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !printJob) {
      return jsonResponse({ job: null });
    }

    // Mark as processing
    await supabaseAdmin
      .from('print_jobs')
      .update({
        status: 'PROCESSING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', printJob.id);

    return jsonResponse({ job: printJob });
  } catch (error: any) {
    console.error('Error in printjobs-next:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
