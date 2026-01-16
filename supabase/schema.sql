-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator_queue', 'reception_security')),
  operator_queue_type TEXT CHECK (operator_queue_type IN ('REG', 'TECH')),
  window_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Queue tickets table
CREATE TABLE IF NOT EXISTS queue_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT NOT NULL,
  queue_type TEXT NOT NULL CHECK (queue_type IN ('REG', 'TECH')),
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'CALLED', 'SERVING', 'DONE', 'NO_SHOW', 'CANCELLED')),
  issued_by_user_id UUID REFERENCES auth.users(id),
  operator_user_id UUID REFERENCES auth.users(id),
  window_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  ticket_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_queue_tickets_status ON queue_tickets(status, queue_type);
CREATE INDEX idx_queue_tickets_date ON queue_tickets(ticket_date, queue_type);
CREATE INDEX idx_queue_tickets_operator ON queue_tickets(operator_user_id);

-- Queue counters for daily reset
CREATE TABLE IF NOT EXISTS queue_counters (
  date DATE NOT NULL,
  queue_type TEXT NOT NULL CHECK (queue_type IN ('REG', 'TECH')),
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, queue_type)
);

-- Print jobs table (optional, for local print service)
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES queue_tickets(id) ON DELETE CASCADE,
  payload_base64 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_print_jobs_status ON print_jobs(status);

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default config
INSERT INTO system_config (key, value) VALUES
  ('logo_url', '"https://via.placeholder.com/200x80?text=LOGO"'::jsonb),
  ('qr_enabled', 'true'::jsonb),
  ('retention_days', '90'::jsonb),
  ('timezone', '"Asia/Tashkent"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_print_jobs_updated_at BEFORE UPDATE ON print_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get next ticket number (atomic increment)
CREATE OR REPLACE FUNCTION get_next_ticket_number(p_queue_type TEXT, p_date DATE)
RETURNS TEXT AS $$
DECLARE
  v_number INTEGER;
  v_prefix TEXT;
BEGIN
  v_prefix := CASE WHEN p_queue_type = 'REG' THEN 'R' ELSE 'T' END;
  
  INSERT INTO queue_counters (date, queue_type, last_number)
  VALUES (p_date, p_queue_type, 1)
  ON CONFLICT (date, queue_type)
  DO UPDATE SET last_number = queue_counters.last_number + 1
  RETURNING last_number INTO v_number;
  
  RETURN v_prefix || '-' || LPAD(v_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Profiles: admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Profiles: admins can update profiles
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Queue tickets: authenticated users can view
CREATE POLICY "Authenticated users can view tickets" ON queue_tickets
  FOR SELECT USING (auth.role() = 'authenticated');

-- Queue tickets: reception_security can insert
CREATE POLICY "Reception can issue tickets" ON queue_tickets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'reception_security'))
  );

-- Queue tickets: operators and admins can update
CREATE POLICY "Operators can update tickets" ON queue_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR (role = 'operator_queue' AND operator_queue_type = queue_tickets.queue_type))
    )
  );

-- System config: admins only
CREATE POLICY "Admins can manage config" ON system_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Print jobs: service account access (will be handled via function-level auth)
-- RLS disabled for print jobs, handled by function secret
