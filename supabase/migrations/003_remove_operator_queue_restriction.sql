-- Remove operator queue type restriction
-- All operators can now serve both REG and TECH queues
-- Set operator_queue_type to NULL for all existing operators

UPDATE profiles
SET operator_queue_type = NULL
WHERE role = 'operator_queue' AND operator_queue_type IS NOT NULL;

-- Note: operator_queue_type column remains in schema for backward compatibility
-- but is no longer used for access control. All operators can serve both queues.
