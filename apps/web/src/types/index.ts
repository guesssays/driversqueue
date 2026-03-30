export type UserRole = 'admin' | 'operator_queue' | 'reception_security';
export type QueueType = 'REG' | 'TECH';
export type TicketStatus = 'WAITING' | 'CALLED' | 'SERVING' | 'DONE' | 'NO_SHOW' | 'CANCELLED';
export type ScreensLanguage = 'ru' | 'uzLat' | 'uzCyr';

export interface Office {
  id: string;
  code: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficeSummary {
  id: string;
  code: string;
  slug: string;
  name: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  operator_queue_type: QueueType | null;
  default_office_id: string | null;
  window_label: string | null;
  created_at: string;
  updated_at: string;
  office_ids?: string[];
}

export interface QueueTicket {
  id: string;
  office_id: string;
  ticket_number: string;
  queue_type: QueueType;
  status: TicketStatus;
  issued_by_user_id: string | null;
  operator_user_id: string | null;
  window_label: string | null;
  created_at: string;
  called_at: string | null;
  repeat_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  ticket_date: string;
}

export interface QueueCounter {
  office_id: string;
  date: string;
  queue_type: QueueType;
  last_number: number;
}

export interface PrintJob {
  id: string;
  office_id: string;
  ticket_id: string;
  payload_base64: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface SystemConfig {
  office?: Office;
  logo_url: string;
  qr_enabled: boolean;
  retention_days: number;
  timezone: string;
  screens_lang: ScreensLanguage;
}

export interface ScreenState {
  office: OfficeSummary;
  reg: {
    current: QueueTicket | null;
    waiting: QueueTicket[];
  };
  tech: {
    current: QueueTicket | null;
    waiting: QueueTicket[];
  };
  lastCalls: QueueTicket[];
}

export interface ReportFilters {
  officeId: string;
  from: string;
  to: string;
  queueType?: QueueType;
  operator?: string;
}

export interface ReportData {
  office: Office;
  totalTickets: number;
  byQueueType: Record<QueueType, number>;
  byOperator: Array<{
    operator_id: string;
    operator_name: string;
    count: number;
    avgServiceTime: number | null;
  }>;
  tickets: QueueTicket[];
}

export interface AccessibleOfficesResponse {
  offices: Office[];
  defaultOfficeId: string | null;
}

export interface QueueIssueResponse {
  ticket: QueueTicket;
  office: Office;
  printUrl: string;
  printJobId?: string;
}

export interface QueueTicketResponse {
  ticket: QueueTicket;
}

export interface QueuePrintPayload {
  office: Office;
  config: SystemConfig;
  ticket: QueueTicket;
}
