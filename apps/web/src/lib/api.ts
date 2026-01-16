import { supabase } from './supabase';
import type { QueueType, ReportFilters, ReportData, Profile, SystemConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '/.netlify/functions';

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || 'API request failed');
  }

  return response.json();
}

// Queue operations
export const queueApi = {
  issue: async (queueType: QueueType) => {
    return apiCall<{ ticket: any; printUrl: string; printJobId?: string }>('/queue-issue', {
      method: 'POST',
      body: JSON.stringify({ queueType }),
    });
  },

  callNext: async (queueType: QueueType) => {
    return apiCall<{ ticket: any }>('/queue-call-next', {
      method: 'POST',
      body: JSON.stringify({ queueType }),
    });
  },

  repeat: async (ticketId: string) => {
    return apiCall<{ ticket: any }>('/queue-repeat', {
      method: 'POST',
      body: JSON.stringify({ ticketId }),
    });
  },

  finish: async (ticketId: string) => {
    return apiCall<{ ticket: any }>('/queue-finish', {
      method: 'POST',
      body: JSON.stringify({ ticketId }),
    });
  },

  noShow: async (ticketId: string) => {
    return apiCall<{ ticket: any }>('/queue-no-show', {
      method: 'POST',
      body: JSON.stringify({ ticketId }),
    });
  },

  getScreenState: async (since?: string) => {
    const params = since ? `?since=${encodeURIComponent(since)}` : '';
    return apiCall<any>(`/queue-screen-state${params}`);
  },
};

// Reports
export const reportApi = {
  getReport: async (filters: ReportFilters) => {
    const params = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      ...(filters.queueType && { queueType: filters.queueType }),
      ...(filters.operator && { operator: filters.operator }),
    });
    return apiCall<ReportData>(`/queue-report?${params}`);
  },

  getExcel: async (filters: ReportFilters) => {
    const params = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      ...(filters.queueType && { queueType: filters.queueType }),
      ...(filters.operator && { operator: filters.operator }),
    });
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${API_BASE}/queue-report-xlsx?${params}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `queue-report-${filters.from}-${filters.to}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// Admin operations
export const adminApi = {
  getUsers: async () => {
    return apiCall<Profile[]>('/admin-users');
  },

  updateUser: async (userId: string, data: Partial<Profile>) => {
    return apiCall<Profile>('/admin-users', {
      method: 'POST',
      body: JSON.stringify({ userId, ...data }),
    });
  },

  getConfig: async () => {
    return apiCall<SystemConfig>('/admin-config');
  },

  updateConfig: async (config: Partial<SystemConfig>) => {
    return apiCall<SystemConfig>('/admin-config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },
};
