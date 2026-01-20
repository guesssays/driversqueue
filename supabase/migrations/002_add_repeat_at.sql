-- Add repeat_at column to queue_tickets table for tracking repeat calls
ALTER TABLE queue_tickets
ADD COLUMN IF NOT EXISTS repeat_at TIMESTAMPTZ;

-- Create index for efficient queries on repeat_at
CREATE INDEX IF NOT EXISTS idx_queue_tickets_repeat_at ON queue_tickets(repeat_at);
