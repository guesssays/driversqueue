import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

export function useProfile() {
  const { profile, loading, error } = useAuth();

  const hasRole = (roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const canAccessQueue = (_queueType: 'REG' | 'TECH'): boolean => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if (profile.role === 'operator_queue') {
      // Operators can access both queues
      return true;
    }
    return false;
  };

  return {
    profile,
    loading,
    error,
    hasRole,
    canAccessQueue,
  };
}
