import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('005_add_multi_office_support.sql', () => {
  it('backfills the existing office and rekeys counters by office', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/005_add_multi_office_support.sql'),
      'utf8',
    );

    expect(migration).toContain("UPDATE queue_tickets\nSET office_id = '11111111-1111-4111-8111-111111111111'");
    expect(migration).toContain('ADD PRIMARY KEY (office_id, date, queue_type)');
    expect(migration).toContain('INSERT INTO profile_offices (profile_id, office_id)');
    expect(migration).toContain("DELETE FROM system_config\nWHERE key IN ('logo_url', 'qr_enabled', 'screens_lang')");
  });
});
