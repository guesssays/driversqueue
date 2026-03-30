import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { getUserFromRequest, requireRole, supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

const officeSchema = z.object({
  officeId: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  code: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9-]+$/)
    .transform((value) => value.toLowerCase()),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9-]+$/)
    .transform((value) => value.toLowerCase()),
  is_active: z.boolean().optional(),
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
      const { data: offices, error } = await supabaseAdmin
        .from('offices')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        return errorResponse('Failed to fetch offices', 500);
      }

      return jsonResponse(offices || []);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const payload = officeSchema.parse(body);

      if (payload.officeId) {
        const { data: office, error } = await supabaseAdmin
          .from('offices')
          .update({
            name: payload.name,
            code: payload.code,
            slug: payload.slug,
            ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
          })
          .eq('id', payload.officeId)
          .select()
          .single();

        if (error || !office) {
          return errorResponse('Failed to update office', 500);
        }

        return jsonResponse(office);
      }

      const { data: office, error } = await supabaseAdmin
        .from('offices')
        .insert({
          name: payload.name,
          code: payload.code,
          slug: payload.slug,
          is_active: payload.is_active ?? true,
        })
        .select()
        .single();

      if (error || !office) {
        return errorResponse('Failed to create office', 500);
      }

      return jsonResponse(office);
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: unknown) {
    console.error('Error in admin-offices:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return toErrorResponse(error);
  }
};
