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

import { handler } from '../../netlify/functions/queue-call-next';

function createSelectBuilder() {
  const eqCalls: Array<[string, unknown]> = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return builder;
    }),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => ({
      data: [
        {
          id: 'ticket-a',
          office_id: OFFICE_ID,
          queue_type: 'REG',
          status: 'WAITING',
        },
      ],
      error: null,
    })),
  };

  return { builder, eqCalls };
}

function createUpdateBuilder() {
  const eqCalls: Array<[string, unknown]> = [];
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return builder;
    }),
    select: vi.fn(() => ({
      single: async () => ({
        data: {
          id: 'ticket-a',
          office_id: OFFICE_ID,
          queue_type: 'REG',
          status: 'SERVING',
        },
        error: null,
      }),
    })),
  };

  return { builder, eqCalls };
}

describe('queue-call-next', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters waiting tickets and updates only inside the active office', async () => {
    const select = createSelectBuilder();
    const update = createUpdateBuilder();

    supabaseModule.supabaseAdmin.from
      .mockImplementationOnce(() => select.builder)
      .mockImplementationOnce(() => update.builder);
    supabaseModule.getUserFromRequest.mockResolvedValue({
      user: { id: 'operator-1' },
      profile: { role: 'operator_queue', window_label: '3' },
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
        body: JSON.stringify({ officeId: OFFICE_ID, queueType: 'REG' }),
      } as never,
      {} as never,
    );

    expect(response.statusCode).toBe(200);
    expect(select.eqCalls).toContainEqual(['office_id', OFFICE_ID]);
    expect(update.eqCalls).toContainEqual(['office_id', OFFICE_ID]);
  });
});
