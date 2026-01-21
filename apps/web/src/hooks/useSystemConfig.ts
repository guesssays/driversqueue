import { useQuery } from '@tanstack/react-query';
import { publicConfigApi } from '../lib/api';
import type { SystemConfig } from '../types';

/**
 * Hook to fetch system config for all authenticated users (operator/reception/security/admin)
 * Used for ticket printing and other operations that need config (logo_url, etc.)
 * Admin-only write operations should use adminApi.updateConfig() instead
 */
export function useSystemConfig() {
  return useQuery<SystemConfig>({
    queryKey: ['system-config'],
    queryFn: () => publicConfigApi.getConfig(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}
