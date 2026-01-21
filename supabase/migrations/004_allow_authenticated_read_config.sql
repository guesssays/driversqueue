-- Allow authenticated users to read system_config, but keep write operations admin-only
-- This enables all roles (operator/reception/security/admin) to read config for printing tickets

-- Drop the existing policy that restricts all operations to admins
DROP POLICY IF EXISTS "Admins can manage config" ON system_config;

-- Create separate policies: SELECT for authenticated users, INSERT/UPDATE/DELETE for admins only
CREATE POLICY "Authenticated users can read config" ON system_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert config" ON system_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update config" ON system_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete config" ON system_config
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
