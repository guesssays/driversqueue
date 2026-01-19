export type UserRole = 'admin' | 'operator_queue' | 'reception_security';
export type QueueType = 'REG' | 'TECH';
export type TicketStatus = 'WAITING' | 'CALLED' | 'SERVING' | 'DONE' | 'NO_SHOW' | 'CANCELLED';

export interface Profile {
  id: string;
  role: UserRole;
  operator_queue_type: QueueType | null;
  window_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueTicket {
  id: string;
  ticket_number: string;
  queue_type: QueueType;
  status: TicketStatus;
  issued_by_user_id: string | null;
  operator_user_id: string | null;
  window_label: string | null;
  created_at: string;
  called_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  ticket_date: string;
}

export interface QueueCounter {
  date: string;
  queue_type: QueueType;
  last_number: number;
}

export interface PrintJob {
  id: string;
  ticket_id: string;
  payload_base64: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface SystemConfig {
  logo_url: string;
  qr_enabled: boolean;
  retention_days: number;
  timezone: string;
  screens_lang?: 'ru' | 'uzLat' | 'uzCyr';
}

export interface ScreenState {
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
  from: string;
  to: string;
  queueType?: QueueType;
  operator?: string;
}

export interface ReportData {
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
