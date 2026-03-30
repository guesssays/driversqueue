import type { HandlerEvent } from '@netlify/functions';
import { createClient, type User } from '@supabase/supabase-js';
import { HttpError } from './utils';

export type UserRole = 'admin' | 'operator_queue' | 'reception_security';

export interface AuthProfile {
  id: string;
  role: UserRole;
  operator_queue_type: 'REG' | 'TECH' | null;
  default_office_id: string | null;
  window_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestAuth {
  user: User;
  profile: AuthProfile;
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function getUserFromRequest(event: HandlerEvent): Promise<RequestAuth | null> {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return { user, profile: profile as AuthProfile };
}

export function requireRole(profile: AuthProfile, roles: UserRole[]): void {
  if (!roles.includes(profile.role)) {
    throw new HttpError('Insufficient permissions', 403);
  }
}
