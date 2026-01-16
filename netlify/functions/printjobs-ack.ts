import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse } from './_shared/utils';
import { z } from 'zod';

const ackSchema = z.object({
  jobId: z.string().uuid(),
  success: z.boolean(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse({});
  }

  try {
    // Check secret for print service
    const authHeader = event.headers?.['x-print-secret'] || event.headers?.['X-Print-Secret'];
    const expectedSecret = process.env.PRINT_SERVICE_SECRET;

    if (!expectedSecret || authHeader !== expectedSecret) {
      return errorResponse('Unauthorized', 401);
    }

    const body = JSON.parse(event.body || '{}');
    const { jobId, success } = ackSchema.parse(body);

    const { data: printJob, error } = await supabaseAdmin
      .from('print_jobs')
      .update({
        status: success ? 'COMPLETED' : 'FAILED',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error || !printJob) {
      return errorResponse('Failed to update print job', 500);
    }

    return jsonResponse({ job: printJob });
  } catch (error: any) {
    console.error('Error in printjobs-ack:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
