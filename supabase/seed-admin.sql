-- Seed script to create first admin user
-- 
-- Instructions:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create a new user with email and password
-- 3. Copy the user's UUID
-- 4. Replace 'USER_UUID_HERE' below with the actual UUID
-- 5. Run this script in SQL Editor

-- Example:
-- INSERT INTO profiles (id, role)
-- VALUES ('123e4567-e89b-12d3-a456-426614174000', 'admin');

-- After running, you can log in with the email/password you created
-- and manage other users through the admin panel at /queue/admin

-- To create additional users:
-- 1. Create user in Authentication > Users
-- 2. Insert profile with appropriate role:
--    - 'admin' - Full access
--    - 'reception_security' - Can issue tickets
--    - 'operator_queue' - Can operate both REG and TECH queues (operator_queue_type should be NULL)

-- Example for operator:
-- INSERT INTO profiles (id, role, window_label)
-- VALUES ('USER_UUID', 'operator_queue', '1');
-- Note: window_label should be a plain number string '1'..'6', not 'Окно 1'

-- Example for reception:
-- INSERT INTO profiles (id, role)
-- VALUES ('USER_UUID', 'reception_security');
