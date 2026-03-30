import { describe, expect, it, beforeEach, vi } from 'vitest';

const OFFICE_ID = '22222222-2222-4222-8222-222222222222';

const supabaseModule = vi.hoisted(() => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
  getUserFromRequest: vi.fn(),
  requireRole: vi.fn(),
}));

const officesModule = vi.hoisted(() => ({
  requireAccessibleOffice: vi.fn(),
  getOfficeScopedConfig: vi.fn(),
}));

vi.mock('../../netlify/functions/_shared/supabase', () => supabaseModule);
vi.mock('../../netlify/functions/_shared/offices', () => officesModule);

import { handler } from '../../netlify/functions/queue-issue';

describe('queue-issue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRINT_SERVICE_ENABLED = 'true';
  });

  it('creates a ticket inside the requested office scope', async () => {
    const queueInsert = vi.fn((payload) => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 'ticket-1',
            ...payload,
          },
          error: null,
        }),
      }),
    }));

    const printInsert = vi.fn((payload) => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 'print-1',
            ...payload,
          },
          error: null,
        }),
      }),
    }));

    supabaseModule.supabaseAdmin.rpc.mockResolvedValue({
      data: 'R-001',
      error: null,
    });
    supabaseModule.supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'queue_tickets') {
        return { insert: queueInsert };
      }

      if (table === 'print_jobs') {
        return { insert: printInsert };
      }

      throw new Error(`Unexpected table ${table}`);
    });
    supabaseModule.getUserFromRequest.mockResolvedValue({
      user: { id: 'user-1' },
      profile: { role: 'reception_security' },
    });
    officesModule.requireAccessibleOffice.mockResolvedValue({
      id: OFFICE_ID,
      slug: 'main',
      name: 'Main office',
      code: 'main',
      is_active: true,
    });
    officesModule.getOfficeScopedConfig.mockResolvedValue({
      logo_url: '',
      qr_enabled: true,
      retention_days: 90,
      timezone: 'Asia/Tashkent',
      screens_lang: 'uzLat',
    });

    const response = await handler(
      {
        httpMethod: 'POST',
        headers: { authorization: 'Bearer token' },
        body: JSON.stringify({ officeId: OFFICE_ID, queueType: 'REG' }),
      } as never,
      {} as never,
    );

    expect(response.statusCode).toBe(200);
    expect(supabaseModule.supabaseAdmin.rpc).toHaveBeenCalledWith('get_next_ticket_number', {
      p_office_id: OFFICE_ID,
      p_queue_type: 'REG',
      p_date: expect.any(String),
    });
    expect(queueInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        office_id: OFFICE_ID,
        queue_type: 'REG',
      }),
    );
    expect(printInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        office_id: OFFICE_ID,
        ticket_id: 'ticket-1',
      }),
    );

    const body = JSON.parse(response.body);
    expect(body.printUrl).toBe('/main/print?ticketId=ticket-1');
    expect(body.ticket.office_id).toBe(OFFICE_ID);
  });
});
