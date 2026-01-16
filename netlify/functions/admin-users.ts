import { Handler } from '@netlify/functions';
import { getUserFromRequest, requireRole } from './_shared/supabase';
import { supabaseAdmin } from './_shared/supabase';
import { jsonResponse, errorResponse } from './_shared/utils';
import { z } from 'zod';

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'operator_queue', 'reception_security']).optional(),
  operator_queue_type: z.enum(['REG', 'TECH']).nullable().optional(),
  window_label: z.string().nullable().optional(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse({});
  }

  try {
    const auth = await getUserFromRequest(event as any);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    requireRole(auth.profile, ['admin']);

    if (event.httpMethod === 'GET') {
      // List all users with profiles
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return errorResponse('Failed to fetch users', 500);
      }

      return jsonResponse(profiles || []);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { userId, ...updates } = updateUserSchema.parse(body);

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error || !profile) {
        return errorResponse('Failed to update user', 500);
      }

      return jsonResponse(profile);
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('Error in admin-users:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
