import { supabase } from './supabase';
import type { Profile, UserRole } from '../types';

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw new Error(error.message || 'Failed to load profile');
  }

  if (!data) return null;
  return data;
}

export function hasRole(profile: Profile | null, roles: UserRole[]): boolean {
  if (!profile) return false;
  return roles.includes(profile.role);
}

export function canAccessQueue(profile: Profile | null, queueType: 'REG' | 'TECH'): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (profile.role === 'operator_queue') {
    return profile.operator_queue_type === queueType;
  }
  return false;
}
