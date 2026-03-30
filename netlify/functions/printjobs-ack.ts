import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { requirePublicOffice } from './_shared/offices';
import { supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

const ackSchema = z.object({
  jobId: z.string().uuid(),
  success: z.boolean(),
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

    const body = JSON.parse(event.body || '{}');
    const { jobId, success } = ackSchema.parse(body);

    const { data: printJob, error } = await supabaseAdmin
      .from('print_jobs')
      .update({
        status: success ? 'COMPLETED' : 'FAILED',
        processed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('office_id', office.id)
      .select()
      .single();

    if (error || !printJob) {
      return errorResponse('Failed to update print job', 500);
    }

    return jsonResponse({ office, job: printJob });
  } catch (error: unknown) {
    console.error('Error in printjobs-ack:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return toErrorResponse(error);
  }
};
