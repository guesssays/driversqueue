import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseModule = vi.hoisted(() => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

const officesModule = vi.hoisted(() => ({
  requirePublicOffice: vi.fn(),
}));

vi.mock('../../netlify/functions/_shared/supabase', () => supabaseModule);
vi.mock('../../netlify/functions/_shared/offices', () => officesModule);

import { handler } from '../../netlify/functions/queue-screen-state';

function createListBuilder(result: unknown[]) {
  const eqCalls: Array<[string, unknown]> = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return builder;
    }),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => ({
      data: result,
      error: null,
    })),
  };

  return { builder, eqCalls };
}

describe('queue-screen-state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes every polling query to the requested office', async () => {
    const builders = [
      createListBuilder([{ id: 'reg-current', office_id: 'office-a' }]),
      createListBuilder([{ id: 'tech-current', office_id: 'office-a' }]),
      createListBuilder([{ id: 'reg-waiting', office_id: 'office-a' }]),
      createListBuilder([{ id: 'tech-waiting', office_id: 'office-a' }]),
      createListBuilder([{ id: 'last-call', office_id: 'office-a' }]),
    ];

    let callIndex = 0;
    supabaseModule.supabaseAdmin.from.mockImplementation(() => builders[callIndex++].builder);
    officesModule.requirePublicOffice.mockResolvedValue({
      id: 'office-a',
      slug: 'main',
      name: 'Main office',
      code: 'main',
      is_active: true,
    });

    const response = await handler(
      {
        httpMethod: 'GET',
        path: '/.netlify/functions/queue-screen-state',
        rawUrl: 'http://localhost/.netlify/functions/queue-screen-state?officeSlug=main',
      } as never,
      {} as never,
    );

    expect(response.statusCode).toBe(200);
    builders.forEach(({ eqCalls }) => {
      expect(eqCalls).toContainEqual(['office_id', 'office-a']);
    });

    const body = JSON.parse(response.body);
    expect(body.office.slug).toBe('main');
    expect(body.reg.current.id).toBe('reg-current');
    expect(body.tech.waiting[0].id).toBe('tech-waiting');
  });
});
