import { beforeEach, describe, expect, it, vi } from 'vitest';

const OFFICE_ID = '22222222-2222-4222-8222-222222222222';

const supabaseModule = vi.hoisted(() => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
  getUserFromRequest: vi.fn(),
  requireRole: vi.fn(),
}));

const officesModule = vi.hoisted(() => ({
  requireAccessibleOffice: vi.fn(),
}));

vi.mock('../../netlify/functions/_shared/supabase', () => supabaseModule);
vi.mock('../../netlify/functions/_shared/offices', () => officesModule);

import { handler } from '../../netlify/functions/queue-repeat';

describe('queue-repeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not allow updating a ticket from another office via id substitution', async () => {
    const selectBuilder = {
      select: vi.fn(() => selectBuilder),
      eq: vi.fn(() => selectBuilder),
      single: vi.fn(async () => ({
        data: null,
        error: { message: 'not found' },
      })),
    };

    supabaseModule.supabaseAdmin.from.mockReturnValue(selectBuilder);
    supabaseModule.getUserFromRequest.mockResolvedValue({
      user: { id: 'operator-1' },
      profile: { role: 'operator_queue' },
    });
    officesModule.requireAccessibleOffice.mockResolvedValue({
      id: OFFICE_ID,
      slug: 'main',
      name: 'Main office',
      code: 'main',
      is_active: true,
    });

    const response = await handler(
      {
        httpMethod: 'POST',
        headers: { authorization: 'Bearer token' },
        body: JSON.stringify({ officeId: OFFICE_ID, ticketId: '11111111-1111-4111-8111-111111111111' }),
      } as never,
      {} as never,
    );

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toBe('Ticket not found');
  });
});
