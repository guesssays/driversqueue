import { supabase } from './supabase';
import type {
  AccessibleOfficesResponse,
  Office,
  Profile,
  QueueIssueResponse,
  QueuePrintPayload,
  QueueTicketResponse,
  QueueType,
  ReportFilters,
  ReportData,
  ScreenState,
  SystemConfig,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '/.netlify/functions';

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
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

function buildOfficeQuery(params: { officeId?: string; officeSlug?: string; since?: string }): string {
  const searchParams = new URLSearchParams();

  if (params.officeId) {
    searchParams.set('officeId', params.officeId);
  }

  if (params.officeSlug) {
    searchParams.set('officeSlug', params.officeSlug);
  }

  if (params.since) {
    searchParams.set('since', params.since);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const queueApi = {
  issue: async (params: { officeId: string; queueType: QueueType }) => {
    return apiCall<QueueIssueResponse>('/queue-issue', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  callNext: async (params: { officeId: string; queueType: QueueType }) => {
    return apiCall<QueueTicketResponse>('/queue-call-next', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  repeat: async (params: { officeId: string; ticketId: string }) => {
    return apiCall<QueueTicketResponse>('/queue-repeat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  finish: async (params: { officeId: string; ticketId: string }) => {
    return apiCall<QueueTicketResponse>('/queue-finish', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  noShow: async (params: { officeId: string; ticketId: string }) => {
    return apiCall<QueueTicketResponse>('/queue-no-show', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getScreenState: async (params: { officeId?: string; officeSlug?: string; since?: string }) => {
    return apiCall<ScreenState>(`/queue-screen-state${buildOfficeQuery(params)}`);
  },

  getPrintableTicket: async (params: { officeId: string; ticketId: string }) => {
    const query = new URLSearchParams({
      officeId: params.officeId,
      ticketId: params.ticketId,
    });

    return apiCall<QueuePrintPayload>(`/queue-print-ticket?${query.toString()}`);
  },
};

export const reportApi = {
  getReport: async (filters: ReportFilters) => {
    const params = new URLSearchParams({
      officeId: filters.officeId,
      from: filters.from,
      to: filters.to,
      ...(filters.queueType && { queueType: filters.queueType }),
      ...(filters.operator && { operator: filters.operator }),
    });
    return apiCall<ReportData>(`/queue-report?${params}`);
  },

  getExcel: async (filters: ReportFilters) => {
    const params = new URLSearchParams({
      officeId: filters.officeId,
      from: filters.from,
      to: filters.to,
      ...(filters.queueType && { queueType: filters.queueType }),
      ...(filters.operator && { operator: filters.operator }),
    });
    const {
      data: { session },
    } = await supabase.auth.getSession();
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

export const publicConfigApi = {
  getConfig: async (params: { officeId?: string; officeSlug?: string }) => {
    return apiCall<SystemConfig>(`/public-config${buildOfficeQuery(params)}`);
  },
};

export const officeApi = {
  getAccessibleOffices: async () => {
    return apiCall<AccessibleOfficesResponse>('/my-offices');
  },
};

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

  getOffices: async () => {
    return apiCall<Office[]>('/admin-offices');
  },

  saveOffice: async (data: Partial<Office> & Pick<Office, 'name' | 'code' | 'slug'>) => {
    return apiCall<Office>('/admin-offices', {
      method: 'POST',
      body: JSON.stringify({
        officeId: data.id,
        name: data.name,
        code: data.code,
        slug: data.slug,
        is_active: data.is_active,
      }),
    });
  },

  getConfig: async (officeId: string) => {
    return apiCall<SystemConfig>(`/admin-config?officeId=${encodeURIComponent(officeId)}`);
  },

  updateConfig: async (officeId: string, config: Partial<SystemConfig>) => {
    return apiCall<SystemConfig>('/admin-config', {
      method: 'POST',
      body: JSON.stringify({ officeId, ...config }),
    });
  },
};
