-- Multi-office support
-- Introduces offices, office-scoped data, and safe backfill of the existing installation.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_offices (
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (profile_id, office_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_offices_office ON profile_offices(office_id, profile_id);

CREATE TABLE IF NOT EXISTS office_config (
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (office_id, key)
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS default_office_id UUID REFERENCES offices(id);

ALTER TABLE queue_tickets
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id);

ALTER TABLE queue_counters
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id);

ALTER TABLE print_jobs
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id);

INSERT INTO offices (id, code, slug, name)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'main',
  'main',
  'Main office'
)
ON CONFLICT (id) DO NOTHING;

UPDATE profiles
SET default_office_id = '11111111-1111-4111-8111-111111111111'
WHERE default_office_id IS NULL;

INSERT INTO profile_offices (profile_id, office_id)
SELECT id, default_office_id
FROM profiles
WHERE default_office_id IS NOT NULL
ON CONFLICT (profile_id, office_id) DO NOTHING;

UPDATE queue_tickets
SET office_id = '11111111-1111-4111-8111-111111111111'
WHERE office_id IS NULL;

ALTER TABLE queue_tickets
  ALTER COLUMN office_id SET NOT NULL;

UPDATE queue_counters
SET office_id = '11111111-1111-4111-8111-111111111111'
WHERE office_id IS NULL;

ALTER TABLE queue_counters
  ALTER COLUMN office_id SET NOT NULL;

ALTER TABLE queue_counters
  DROP CONSTRAINT IF EXISTS queue_counters_pkey;

ALTER TABLE queue_counters
  ADD PRIMARY KEY (office_id, date, queue_type);

UPDATE print_jobs pj
SET office_id = qt.office_id
FROM queue_tickets qt
WHERE pj.ticket_id = qt.id
  AND pj.office_id IS NULL;

UPDATE print_jobs
SET office_id = '11111111-1111-4111-8111-111111111111'
WHERE office_id IS NULL;

ALTER TABLE print_jobs
  ALTER COLUMN office_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_queue_tickets_office_status ON queue_tickets(office_id, status, queue_type);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_office_date ON queue_tickets(office_id, ticket_date, queue_type);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_office_operator ON queue_tickets(office_id, operator_user_id);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_office_repeat_at ON queue_tickets(office_id, repeat_at);
CREATE INDEX IF NOT EXISTS idx_print_jobs_office_status ON print_jobs(office_id, status);

INSERT INTO system_config (key, value) VALUES
  ('retention_days', '90'::jsonb),
  ('timezone', '"Asia/Tashkent"'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO office_config (office_id, key, value)
SELECT '11111111-1111-4111-8111-111111111111', key, value
FROM system_config
WHERE key IN ('logo_url', 'qr_enabled', 'screens_lang')
ON CONFLICT (office_id, key) DO NOTHING;

INSERT INTO office_config (office_id, key, value) VALUES
  ('11111111-1111-4111-8111-111111111111', 'logo_url', '"https://via.placeholder.com/200x80?text=LOGO"'::jsonb),
  ('11111111-1111-4111-8111-111111111111', 'qr_enabled', 'true'::jsonb),
  ('11111111-1111-4111-8111-111111111111', 'screens_lang', '"uzLat"'::jsonb)
ON CONFLICT (office_id, key) DO NOTHING;

DELETE FROM system_config
WHERE key IN ('logo_url', 'qr_enabled', 'screens_lang');

DROP TRIGGER IF EXISTS update_offices_updated_at ON offices;
CREATE TRIGGER update_offices_updated_at BEFORE UPDATE ON offices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_office_config_updated_at ON office_config;
CREATE TRIGGER update_office_config_updated_at BEFORE UPDATE ON office_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP FUNCTION IF EXISTS get_next_ticket_number(TEXT, DATE);

CREATE OR REPLACE FUNCTION get_next_ticket_number(p_office_id UUID, p_queue_type TEXT, p_date DATE)
RETURNS TEXT AS $$
DECLARE
  v_number INTEGER;
  v_prefix TEXT;
BEGIN
  v_prefix := CASE WHEN p_queue_type = 'REG' THEN 'R' ELSE 'T' END;

  INSERT INTO queue_counters (office_id, date, queue_type, last_number)
  VALUES (p_office_id, p_date, p_queue_type, 1)
  ON CONFLICT (office_id, date, queue_type)
  DO UPDATE SET last_number = queue_counters.last_number + 1
  RETURNING last_number INTO v_number;

  RETURN v_prefix || '-' || LPAD(v_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view tickets" ON queue_tickets;
DROP POLICY IF EXISTS "Reception can issue tickets" ON queue_tickets;
DROP POLICY IF EXISTS "Operators can update tickets" ON queue_tickets;

DROP POLICY IF EXISTS "Users can view own office assignments" ON profile_offices;
CREATE POLICY "Users can view own office assignments" ON profile_offices
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can view accessible offices" ON offices;
CREATE POLICY "Users can view accessible offices" ON offices
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM profile_offices
        WHERE profile_id = auth.uid()
          AND office_id = offices.id
      )
    )
  );

DROP POLICY IF EXISTS "Users can view office tickets" ON queue_tickets;
CREATE POLICY "Users can view office tickets" ON queue_tickets
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM profile_offices
        WHERE profile_id = auth.uid()
          AND office_id = queue_tickets.office_id
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read config" ON system_config;
DROP POLICY IF EXISTS "Admins can insert config" ON system_config;
DROP POLICY IF EXISTS "Admins can update config" ON system_config;
DROP POLICY IF EXISTS "Admins can delete config" ON system_config;
DROP POLICY IF EXISTS "Admins can manage config" ON system_config;

CREATE POLICY "Authenticated users can read global config" ON system_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert global config" ON system_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update global config" ON system_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete global config" ON system_config
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can view accessible office config" ON office_config;
CREATE POLICY "Users can view accessible office config" ON office_config
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM profile_offices
        WHERE profile_id = auth.uid()
          AND office_id = office_config.office_id
      )
    )
  );

DROP POLICY IF EXISTS "Admins can insert office config" ON office_config;
CREATE POLICY "Admins can insert office config" ON office_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update office config" ON office_config;
CREATE POLICY "Admins can update office config" ON office_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete office config" ON office_config;
CREATE POLICY "Admins can delete office config" ON office_config
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
