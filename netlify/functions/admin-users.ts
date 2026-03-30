import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { ensureOfficesExist } from './_shared/offices';
import { getUserFromRequest, requireRole, supabaseAdmin } from './_shared/supabase';
import { corsHeaders, errorResponse, jsonResponse, toErrorResponse } from './_shared/utils';

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'operator_queue', 'reception_security']).optional(),
  operator_queue_type: z.enum(['REG', 'TECH']).nullable().optional(),
  window_label: z.string().nullable().optional(),
  office_ids: z.array(z.string().uuid()).optional(),
  default_office_id: z.string().uuid().nullable().optional(),
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
      const [{ data: profiles, error: profilesError }, { data: officeAssignments, error: assignmentsError }] =
        await Promise.all([
          supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('profile_offices').select('profile_id, office_id'),
        ]);

      if (profilesError || assignmentsError) {
        return errorResponse('Failed to fetch users', 500);
      }

      const officeMap = new Map<string, string[]>();
      (officeAssignments || []).forEach((assignment) => {
        const existing = officeMap.get(assignment.profile_id) || [];
        existing.push(assignment.office_id);
        officeMap.set(assignment.profile_id, existing);
      });

      return jsonResponse(
        (profiles || []).map((profile) => ({
          ...profile,
          office_ids: officeMap.get(profile.id) || [],
        })),
      );
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { userId, office_ids, default_office_id, ...updates } = updateUserSchema.parse(body);

      const { data: existingProfile, error: existingError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingError || !existingProfile) {
        return errorResponse('User profile not found', 404);
      }

      const { data: existingAssignments, error: assignmentsError } = await supabaseAdmin
        .from('profile_offices')
        .select('office_id')
        .eq('profile_id', userId);

      if (assignmentsError) {
        return errorResponse('Failed to read existing office assignments', 500);
      }

      const nextRole = updates.role || existingProfile.role;
      const nextOfficeIds = office_ids ?? (existingAssignments || []).map((assignment) => assignment.office_id);

      if (nextOfficeIds.length > 0) {
        await ensureOfficesExist(nextOfficeIds);
      }

      if (default_office_id) {
        await ensureOfficesExist([default_office_id]);
      }

      if (nextRole !== 'admin' && nextOfficeIds.length === 0) {
        return errorResponse('Non-admin users must be assigned to at least one office', 400);
      }

      const resolvedDefaultOfficeId =
        nextRole === 'admin'
          ? default_office_id ?? existingProfile.default_office_id ?? nextOfficeIds[0] ?? null
          : default_office_id && nextOfficeIds.includes(default_office_id)
            ? default_office_id
            : existingProfile.default_office_id && nextOfficeIds.includes(existingProfile.default_office_id)
              ? existingProfile.default_office_id
              : nextOfficeIds[0];

      if (nextRole !== 'admin' && !resolvedDefaultOfficeId) {
        return errorResponse('Default office is required for non-admin users', 400);
      }

      if (
        nextRole !== 'admin' &&
        resolvedDefaultOfficeId &&
        !nextOfficeIds.includes(resolvedDefaultOfficeId)
      ) {
        return errorResponse('Default office must be part of assigned offices', 400);
      }

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .update({
          ...updates,
          default_office_id: resolvedDefaultOfficeId,
        })
        .eq('id', userId)
        .select()
        .single();

      if (error || !profile) {
        return errorResponse('Failed to update user', 500);
      }

      await supabaseAdmin.from('profile_offices').delete().eq('profile_id', userId);

      if (nextOfficeIds.length > 0) {
        await supabaseAdmin.from('profile_offices').insert(
          nextOfficeIds.map((officeId) => ({
            profile_id: userId,
            office_id: officeId,
          })),
        );
      }

      return jsonResponse({
        ...profile,
        office_ids: nextOfficeIds,
      });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: unknown) {
    console.error('Error in admin-users:', error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors[0].message}`, 400);
    }
    return toErrorResponse(error);
  }
};
